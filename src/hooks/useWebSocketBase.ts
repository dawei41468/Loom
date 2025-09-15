import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAuthState } from '../contexts/AuthContext';
import { apiClient } from '../api/client';

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface WebSocketConfig {
  maxReconnectAttempts: number;
  baseReconnectDelay: number;
  maxReconnectDelay: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  messageQueueSize: number;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  connectionAttempts: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  lastError: string | null;
  isHealthy: boolean;
  lastHeartbeatAt: Date | null;
}

export interface UseWebSocketBaseReturn extends WebSocketState {
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: WebSocketMessage) => void;
  getConnectionInfo: () => {
    url: string;
    readyState: number;
    bufferedAmount: number;
  } | null;
  getConnectionHealth: () => {
    isHealthy: boolean;
    lastHeartbeatAt: Date | null;
    timeSinceLastHeartbeat: number | null;
  };
}

const DEFAULT_CONFIG: WebSocketConfig = {
  maxReconnectAttempts: 5,
  baseReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  heartbeatInterval: 30000,
  connectionTimeout: 10000,
  messageQueueSize: 50,
};

export const useWebSocketBase = (
  getWebSocketUrl: () => string,
  onMessage: (message: WebSocketMessage) => void,
  config: Partial<WebSocketConfig> = {},
  onConnect?: () => void,
  onDisconnect?: () => void,
  onError?: (error: Event) => void
): UseWebSocketBaseReturn => {
  const { user, token } = useAuthState();
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    connectionAttempts: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    lastError: null,
    isHealthy: false,
    lastHeartbeatAt: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const pongTimeoutRef = useRef<number | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const isManualDisconnectRef = useRef(false);
  const connectionAttemptsRef = useRef(0);
  const lastPingSentRef = useRef<number | null>(null);
  const lastPongReceivedRef = useRef<number | null>(null);

  const getWebSocketUrlWithToken = useCallback(() => {
    const baseUrl = getWebSocketUrl();

    if (!token) {
      console.error('No token available for WebSocket connection!');
      return baseUrl;
    }

    const urlWithToken = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${token}`;
    return urlWithToken;
  }, [getWebSocketUrl, token]);

  const updateState = useCallback((updates: Partial<WebSocketState> | ((prevState: WebSocketState) => Partial<WebSocketState>)) => {
    setState(prev => {
      const newUpdates = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...newUpdates };
    });
  }, []);

  const startHeartbeat = useCallback(() => {
    // Clear any existing heartbeat timers
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }

    // Reset heartbeat tracking
    lastPingSentRef.current = null;
    lastPongReceivedRef.current = null;

    // Set up pong timeout checker - runs every 10 seconds to check for missed pongs
    heartbeatIntervalRef.current = setInterval(() => {
      const now = Date.now();

      // If we sent a ping but haven't received a pong within the timeout period
      if (lastPingSentRef.current && !lastPongReceivedRef.current) {
        const timeSincePing = now - lastPingSentRef.current;
        if (timeSincePing > finalConfig.connectionTimeout * 1000) {
          console.warn('Pong timeout detected, connection may be unhealthy');
          // Force reconnection by closing the connection
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.close(1008, 'Pong timeout');
          }
          return;
        }
      }

      // Send a ping to test connection health (less frequent than server pings)
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        lastPingSentRef.current = now;
        lastPongReceivedRef.current = null; // Reset pong received flag
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));

        // Set a timeout for this specific ping
        pongTimeoutRef.current = setTimeout(() => {
          if (lastPingSentRef.current && !lastPongReceivedRef.current) {
            console.warn('Pong response timeout, closing connection');
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.close(1008, 'Pong timeout');
            }
          }
        }, finalConfig.connectionTimeout * 1000);
      }
    }, finalConfig.heartbeatInterval * 3); // Check every 90 seconds (3x server interval to avoid interference)
  }, [finalConfig.heartbeatInterval, finalConfig.connectionTimeout]);

  const sendQueuedMessages = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    while (messageQueueRef.current.length > 0 && wsRef.current.readyState === WebSocket.OPEN) {
      const message = messageQueueRef.current.shift();
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send queued message:', error);
        // Re-queue the message
        messageQueueRef.current.unshift(message);
        break;
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!token || state.isConnecting) {
      return;
    }

    // 🔧 CLEANUP: Close any existing connection before creating new one
    if (wsRef.current) {
      wsRef.current.close(1000, 'Cleanup before reconnect');
      wsRef.current = null;
    }

    connectionAttemptsRef.current += 1;
    updateState({
      isConnecting: true,
      lastError: null,
      connectionAttempts: connectionAttemptsRef.current
    });

    try {
      // Ensure access token is valid before attempting connection
      await apiClient.ensureValidAccessToken();

      const wsUrl = getWebSocketUrlWithToken();
      const ws = new WebSocket(wsUrl);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close(3000, 'Connection timeout');
        }
      }, finalConfig.connectionTimeout);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        updateState({
          isConnected: true,
          isConnecting: false,
          isReconnecting: false,
          lastConnectedAt: new Date(),
          lastError: null,
          isHealthy: true,
          lastHeartbeatAt: new Date(),
        });
        connectionAttemptsRef.current = 0; // Reset on successful connection
        startHeartbeat();
        sendQueuedMessages();
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'ping') {
            // Respond with pong
            ws.send(JSON.stringify({ type: 'pong', timestamp: message.timestamp }));
          } else if (message.type === 'pong') {
            // Heartbeat response received - clear pong timeout and update tracking
            lastPongReceivedRef.current = Date.now();
            if (pongTimeoutRef.current) {
              clearTimeout(pongTimeoutRef.current);
              pongTimeoutRef.current = null;
            }
            updateState({
              isHealthy: true,
              lastHeartbeatAt: new Date(),
            });
            console.debug('Pong received, connection healthy');
          } else {
            onMessage(message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        if (pongTimeoutRef.current) {
          clearTimeout(pongTimeoutRef.current);
          pongTimeoutRef.current = null;
        }
        // WebSocket disconnected

        const now = new Date();
        updateState({
          isConnected: false,
          isConnecting: false,
          lastDisconnectedAt: now,
          lastError: event.reason || `Connection closed with code ${event.code}`,
          isHealthy: false,
        });

        // 🔧 CLEANUP: Clear WebSocket reference immediately on close
        wsRef.current = null;
        onDisconnect?.();

        // Attempt to reconnect if not a manual disconnect and within attempt limits
        const isAuthError = event.code === 4001 || event.code === 4003;
        const isConnectionLimitError = event.code === 1008; // Policy violation (connection limit)

        if (!isManualDisconnectRef.current && !isAuthError && connectionAttemptsRef.current < finalConfig.maxReconnectAttempts) {
          updateState({ isReconnecting: true });
          const delay = Math.min(
            finalConfig.baseReconnectDelay * Math.pow(2, connectionAttemptsRef.current),
            finalConfig.maxReconnectDelay
          );

          // 🔧 CLEANUP: Add small delay before reconnecting to allow cleanup
          reconnectTimeoutRef.current = setTimeout(() => {
            connect(); // This will now cleanup before connecting
          }, delay);
        } else {
          updateState({ isReconnecting: false });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateState({
          lastError: 'WebSocket connection error',
        });
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      updateState({
        isConnecting: false,
        lastError: 'Failed to create WebSocket connection',
      });
    }
  }, [
    token,
    state.isConnecting,
    finalConfig,
    getWebSocketUrlWithToken,
    updateState,
    startHeartbeat,
    sendQueuedMessages,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  ]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    connectionAttemptsRef.current = 0;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    updateState({
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      connectionAttempts: 0,
      lastDisconnectedAt: new Date(),
      isHealthy: false,
    });
  }, [updateState]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        // Queue the message for later
        if (messageQueueRef.current.length < finalConfig.messageQueueSize) {
          messageQueueRef.current.push(message);
        }
      }
    } else {
      // Queue the message
      if (messageQueueRef.current.length < finalConfig.messageQueueSize) {
        messageQueueRef.current.push(message);
      } else {
        console.warn('Message queue full, dropping message');
      }
    }
  }, [finalConfig.messageQueueSize]);

  const getConnectionInfo = useCallback(() => {
    if (!wsRef.current) return null;
    return {
      url: wsRef.current.url,
      readyState: wsRef.current.readyState,
      bufferedAmount: wsRef.current.bufferedAmount,
    };
  }, []);

  const getConnectionHealth = useCallback(() => {
    const now = Date.now();
    const timeSinceLastHeartbeat = state.lastHeartbeatAt
      ? now - state.lastHeartbeatAt.getTime()
      : null;

    return {
      isHealthy: state.isHealthy,
      lastHeartbeatAt: state.lastHeartbeatAt,
      timeSinceLastHeartbeat,
    };
  }, [state.isHealthy, state.lastHeartbeatAt]);

  // Auto-connect when user changes
  useEffect(() => {
    if (token && !state.isConnected && !state.isConnecting) {
      connect();
    } else if (!token) {
      disconnect();
    }

    // The disconnect should only happen on unmount, not on token change.
    // The effect is designed to connect when a token is present and disconnect when it's not.
    // Adding a cleanup function here that calls disconnect() causes a loop.
  }, [token, state.isConnected, state.isConnecting, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    getConnectionInfo,
    getConnectionHealth,
  };
};