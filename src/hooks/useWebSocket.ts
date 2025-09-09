import { useCallback, useRef, useEffect } from 'react';
import { useWebSocketBase, WebSocketMessage as BaseWebSocketMessage } from './useWebSocketBase';
import { EventMessage, ChecklistItem } from '../types';

export interface WebSocketMessage {
  type: 'new_message' | 'delete_message' | 'new_checklist_item' | 'update_checklist_item' | 'delete_checklist_item';
  data: EventMessage | ChecklistItem | { message_id: string } | { item_id: string };
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  connectionAttempts: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  lastError: string | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: WebSocketMessage) => void;
  getConnectionInfo: () => {
    url: string;
    readyState: number;
    bufferedAmount: number;
  } | null;
}

export const useWebSocket = (eventId: string | null, onMessage: (message: WebSocketMessage) => void): UseWebSocketReturn => {
  const baseWebSocketRef = useRef<ReturnType<typeof useWebSocketBase> | null>(null);

  const getWebSocketUrl = useCallback(() => {
    if (!eventId) {
      return '';
    }
    // Prefer VITE_API_URL (origin) then VITE_API_BASE_URL (may include /api)
    const rawBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:7500/api';
    // Strip trailing /api and anything after it to get the service origin
    const httpOrigin = String(rawBase).replace(/\/api.*$/, '');
    const wsOrigin = httpOrigin.replace(/^http/, 'ws');
    // Backend uses API_V1_STR = '/api' and endpoint is /api/events/{event_id}/ws
    const finalUrl = `${wsOrigin}/api/events/${eventId}/ws`;
    return finalUrl;
  }, [eventId]);

  const handleMessage = useCallback((message: BaseWebSocketMessage) => {
    // Type assertion since we know the message structure
    onMessage(message as unknown as WebSocketMessage);
  }, [onMessage]);

  const baseWebSocket = useWebSocketBase(
    getWebSocketUrl,
    handleMessage,
    {
      maxReconnectAttempts: 5,
      baseReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      messageQueueSize: 50,
    }
  );

  // Keep ref updated with latest baseWebSocket
  useEffect(() => {
    baseWebSocketRef.current = baseWebSocket;
  }, [baseWebSocket]);

  // Override connect to only work when eventId is available
  const connect = useCallback(() => {
    if (eventId && baseWebSocketRef.current) {
      baseWebSocketRef.current.connect();
    }
  }, [eventId]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (baseWebSocketRef.current) {
      baseWebSocketRef.current.sendMessage(message as unknown as BaseWebSocketMessage);
    }
  }, []);

  return {
    ...baseWebSocket,
    connect,
    sendMessage,
  };
};