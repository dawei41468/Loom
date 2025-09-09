import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAuthState } from '../contexts/AuthContext';

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
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const isManualDisconnectRef = useRef(false);
  const connectionAttemptsRef = useRef(0);

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
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      }
    }, finalConfig.heartbeatInterval);
  }, [finalConfig.heartbeatInterval]);

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

  const connect = useCallback(() => {
    if (!token || state.isConnecting) {
      return;
    }

    connectionAttemptsRef.current += 1;
    updateState({
      isConnecting: true,
      lastError: null,
      connectionAttempts: connectionAttemptsRef.current
    });

    try {
      const wsUrl = getWebSocketUrlWithToken();
      console.log('Creating WebSocket connection to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close(3000, 'Connection timeout');
        }
      }, finalConfig.connectionTimeout);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connected');
        updateState({
          isConnected: true,
          isConnecting: false,
          isReconnecting: false,
          lastConnectedAt: new Date(),
          lastError: null,
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
            // Heartbeat response received
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
        console.log('WebSocket disconnected:', event.code, event.reason);

        const now = new Date();
        updateState({
          isConnected: false,
          isConnecting: false,
          lastDisconnectedAt: now,
          lastError: event.reason || `Connection closed with code ${event.code}`,
        });

        wsRef.current = null;
        onDisconnect?.();

        // Attempt to reconnect if not a manual disconnect and within attempt limits
        const isAuthError = event.code === 4001 || event.code === 4003;
        if (!isManualDisconnectRef.current && !isAuthError && connectionAttemptsRef.current < finalConfig.maxReconnectAttempts) {
          updateState({ isReconnecting: true });
          const delay = Math.min(
            finalConfig.baseReconnectDelay * Math.pow(2, connectionAttemptsRef.current),
            finalConfig.maxReconnectDelay
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${connectionAttemptsRef.current + 1}/${finalConfig.maxReconnectAttempts})...`);
            connect();
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
  };
};