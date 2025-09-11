import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { Send, Trash2, User, Wifi, WifiOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { EventMessage } from '../types';
import { queryKeys, eventChatQueries } from '../api/queries';
import { apiClient } from '../api/client';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import TextInput from '@/components/forms/TextInput';
import SubmitButton from '@/components/forms/SubmitButton';

interface EventChatProps {
  eventId: string;
  hasAccess?: boolean;
}

const EventChat: React.FC<EventChatProps> = ({ eventId, hasAccess = true }) => {
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  console.log('EventChat component rendered', { eventId, hasAccess, userId: user?.id });

  // Don't fetch messages if eventId is invalid
  const { data: messagesData, isLoading, error } = useQuery({
    queryKey: queryKeys.eventMessages(eventId),
    queryFn: () => eventChatQueries.getEventMessages(eventId),
    refetchInterval: 60000, // Reduced polling to 60 seconds since we have WebSocket
    enabled: !!eventId, // Only run if eventId is valid
  });

  const messages = messagesData?.data || [];
  // Deduplicate by ID at render time to avoid duplicate React keys if upstream delivered duplicates
  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();
    const out: EventMessage[] = [];
    for (const m of messages) {
      if (m && typeof m.id === 'string' && !seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out;
  }, [messages]);

  console.log('EventChat: Setting up WebSocket for eventId:', eventId);

  // WebSocket for real-time updates
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    if (message.type === 'new_message') {
      // Add new message to the list
      queryClient.setQueryData(queryKeys.eventMessages(eventId), (oldData: { data: EventMessage[] } | undefined) => {
        if (!oldData) return oldData;
        const incoming = message.data as EventMessage;
        // Guard against duplicates by ID
        if (oldData.data.some((m) => m.id === incoming.id)) {
          return oldData;
        }
        return {
          ...oldData,
          data: [...oldData.data, incoming],
        };
      });
    } else if (message.type === 'delete_message') {
      // Remove deleted message from the list
      const deleteData = message.data as { message_id: string };
      queryClient.setQueryData(queryKeys.eventMessages(eventId), (oldData: { data: EventMessage[] } | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: oldData.data.filter((msg: EventMessage) => msg.id !== deleteData.message_id)
        };
      });
    }
  };

  const webSocketState = useWebSocket(eventId || null, handleWebSocketMessage);
  console.log('EventChat: WebSocket state:', {
    isConnected: webSocketState.isConnected,
    isConnecting: webSocketState.isConnecting,
    connectionAttempts: webSocketState.connectionAttempts,
    eventId
  });
  const { isConnected } = webSocketState;
  const { isOnline, addOfflineAction } = useOfflineQueue();

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => apiClient.sendEventMessage(eventId, message),
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: queryKeys.eventMessages(eventId) });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      addToast({
        type: 'error',
        title: t('failedToSendMessage'),
        description: t('pleaseTryAgain'),
      });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => apiClient.deleteEventMessage(eventId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventMessages(eventId) });
      addToast({
        type: 'success',
        title: t('messageDeleted'),
      });
    },
    onError: (error) => {
      console.error('Failed to delete message:', error);
      addToast({
        type: 'error',
        title: t('failedToDeleteMessage'),
        description: t('pleaseTryAgain'),
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.data]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();

    if (!isOnline) {
      // Queue the message for offline sending
      try {
        await addOfflineAction({
          type: 'send_message',
          eventId,
          data: { message: messageText }
        });
        setNewMessage('');
        addToast({
          type: 'info',
          title: t('messageQueued'),
          description: t('messageWillBeSentWhenOnline'),
        });
      } catch (error) {
        console.error('Failed to queue message:', error);
        addToast({
          type: 'error',
          title: t('failedToQueueMessage'),
          description: t('pleaseTryAgain'),
        });
      }
    } else {
      // Send immediately when online
      sendMessageMutation.mutate(messageText);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm(t('confirmDeleteMessage'))) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const getSenderInfo = (message: EventMessage) => {
    if (message.sender_id === user?.id) {
      return {
        name: t('you'),
        color: 'bg-[hsl(var(--loom-user))]',
        isCurrentUser: true,
      };
    } else {
      return {
        name: partner?.display_name || t('partner'),
        color: 'bg-[hsl(var(--loom-partner))]',
        isCurrentUser: false,
      };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--loom-primary))]"></div>
        <span className="ml-2 text-sm text-[hsl(var(--loom-text-muted))]">{t('loadingMessages')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-[hsl(var(--loom-text-muted))] text-sm">
          {t('failedToLoadMessages')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96">
      {/* Connection Status */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs text-[hsl(var(--loom-text-muted))]">
            {isConnected ? t('connected') : t('disconnected')}
          </span>
        </div>
      </div>

      {/* Messages List */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {uniqueMessages.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--loom-text-muted))] opacity-50" />
            <h3 className="font-medium mb-2">{t('noMessagesYet')}</h3>
            <p className="text-[hsl(var(--loom-text-muted))] text-sm">
              {t('startConversation')} {partner?.display_name || t('partner')}
            </p>
          </div>
        ) : (
          uniqueMessages.map((message, idx) => {
            const senderInfo = getSenderInfo(message);
            const prev = idx > 0 ? uniqueMessages[idx - 1] : undefined;
            const isGrouped = prev ? prev.sender_id === message.sender_id : false;
            const next = idx < uniqueMessages.length - 1 ? uniqueMessages[idx + 1] : undefined;
            const isLastInRun = next ? next.sender_id !== message.sender_id : true;
            return (
              <div
                key={message.id}
                className={cn(
                  'flex items-start space-x-3 group',
                  isGrouped ? 'mt-1' : 'mt-2',
                  senderInfo.isCurrentUser ? 'justify-end' : 'justify-start'
                )}
              >
                {/* Left avatar only on first message of a run */}
                {!senderInfo.isCurrentUser && !isGrouped && (
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm',
                    senderInfo.color
                  )}>
                    {senderInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className={cn(
                  'relative max-w-[72ch] px-3 py-2 rounded-2xl shadow-sm group',
                  senderInfo.isCurrentUser
                    ? 'bg-[hsl(var(--loom-primary))] text-white'
                    : 'bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] border border-[hsl(var(--loom-border))]'
                )}>
                  {senderInfo.isCurrentUser && (
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-[hsl(var(--loom-surface))] border border-[hsl(var(--loom-border))] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete message"
                      aria-label="Delete message"
                      type="button"
                    >
                      <Trash2 className="w-3 h-3 text-[hsl(var(--loom-danger))]" />
                    </button>
                  )}
                  {/* Partner label removed per design */}
                  <div className="text-sm leading-relaxed">{message.message}</div>
                  {isLastInRun && (
                    <div className={cn(
                      'text-[10px] mt-1 opacity-75',
                      senderInfo.isCurrentUser ? 'text-right' : 'text-left'
                    )}>
                      {format(new Date(message.created_at), 'MMM d, h:mm a')}
                    </div>
                  )}
                </div>

                {senderInfo.isCurrentUser && !isGrouped && (
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm',
                    senderInfo.color
                  )}>
                    {senderInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <TextInput
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`${t('message')} ${partner?.display_name || t('partner')}...`}
            className="flex-1 rounded-full"
            disabled={sendMessageMutation.isPending}
          />
          <SubmitButton
            isLoading={sendMessageMutation.isPending}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            fullWidth={false}
            className={cn('h-10 px-4 rounded-full flex items-center space-x-2')}
          >
            {!sendMessageMutation.isPending && <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">{t('send')}</span>
          </SubmitButton>
        </form>
      </div>
    </div>
  );
};

export default EventChat;