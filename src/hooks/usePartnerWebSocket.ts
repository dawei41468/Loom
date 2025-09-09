import { useCallback } from 'react';
import { useAuthDispatch, useAuthState } from '../contexts/AuthContext';
import { useEventsActions } from '../contexts/EventsContext';
import { Partner, Proposal, Event } from '../types';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketBase, WebSocketMessage as BaseWebSocketMessage } from './useWebSocketBase';
import { queryKeys } from '../api/queries';

export interface PartnerWebSocketMessage {
  type: 'partner_connected' | 'partner_disconnected' | 'proposal_created' | 'proposal_updated' | 'event_created' | 'event_deleted';
  data: Partner | { disconnected_by: string } | { proposal: Proposal; message: string } | Proposal | Event | { event_id: string };
}

export const usePartnerWebSocket = () => {
  const { user } = useAuthState();
  const authDispatch = useAuthDispatch();
  const { addProposal, updateProposal, addEvent, removeEvent } = useEventsActions();
  const queryClient = useQueryClient();

  const getWebSocketUrl = useCallback(() => {
    const env = import.meta.env as { VITE_API_URL?: string; VITE_API_BASE_URL?: string };
    const rawBase = env.VITE_API_URL || env.VITE_API_BASE_URL || 'http://localhost:7500/api';
    const httpOrigin = String(rawBase).replace(/\/api.*$/, '');
    const wsOrigin = httpOrigin.replace(/^http/, 'ws');
    return `${wsOrigin}/api/partner/ws`;
  }, []);

  const handleMessage = useCallback((message: BaseWebSocketMessage) => {
    try {
      const partnerMessage = message as unknown as PartnerWebSocketMessage;
      if (partnerMessage.type === 'partner_connected') {
        authDispatch({ type: 'SET_PARTNER', payload: partnerMessage.data as Partner });
        queryClient.invalidateQueries({ queryKey: queryKeys.partner });
        queryClient.invalidateQueries({ queryKey: queryKeys.proposals });
      } else if (partnerMessage.type === 'partner_disconnected') {
        authDispatch({ type: 'SET_PARTNER', payload: null });
        queryClient.invalidateQueries({ queryKey: queryKeys.partner });
      } else if (partnerMessage.type === 'proposal_created') {
        const proposalData = partnerMessage.data as { proposal: Proposal; message: string };
        addProposal(proposalData.proposal);
        // Invalidate proposals query to refresh the proposals list
        queryClient.invalidateQueries({ queryKey: queryKeys.proposals });
      } else if (partnerMessage.type === 'proposal_updated') {
        const proposal = partnerMessage.data as Proposal;
        updateProposal(proposal.id, proposal);
      } else if (partnerMessage.type === 'event_created') {
        const event = partnerMessage.data as Event;
        // Add event to local state immediately for instant UI update
        addEvent(event);
        // Also invalidate events query for consistency
        queryClient.invalidateQueries({ queryKey: queryKeys.events });
      } else if (partnerMessage.type === 'event_deleted') {
        // Remove event from local state immediately for instant UI update
        removeEvent((partnerMessage.data as { event_id: string }).event_id);
        // Also invalidate events query for consistency
        queryClient.invalidateQueries({ queryKey: queryKeys.events });
      }
    } catch (error) {
      console.error('Failed to parse partner WebSocket message:', error);
    }
  }, [authDispatch, queryClient, addProposal, updateProposal, addEvent, removeEvent]);

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

  return baseWebSocket;
};