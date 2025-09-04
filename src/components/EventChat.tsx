import React, { useState, useEffect, useRef } from 'react';
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

interface EventChatProps {
  eventId: string;
}

const EventChat: React.FC<EventChatProps> = ({ eventId }) => {
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const { data: messagesData, isLoading, error } = useQuery({
    queryKey: queryKeys.eventMessages(eventId),
    queryFn: () => eventChatQueries.getEventMessages(eventId),
    refetchInterval: 60000, // Reduced polling to 60 seconds since we have WebSocket
  });

  const messages = messagesData?.data || [];

  // WebSocket for real-time updates
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    if (message.type === 'new_message') {
      // Add new message to the list
      queryClient.setQueryData(queryKeys.eventMessages(eventId), (oldData: { data: EventMessage[] } | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: [...oldData.data, message.data as EventMessage]
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

  const { isConnected } = useWebSocket(eventId, handleWebSocketMessage);
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
        title: 'Failed to send message',
        description: 'Please try again.',
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
        title: 'Message deleted',
      });
    },
    onError: (error) => {
      console.error('Failed to delete message:', error);
      addToast({
        type: 'error',
        title: 'Failed to delete message',
        description: 'Please try again.',
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
          title: 'Message queued',
          description: 'Your message will be sent when connection is restored.',
        });
      } catch (error) {
        console.error('Failed to queue message:', error);
        addToast({
          type: 'error',
          title: 'Failed to queue message',
          description: 'Please try again.',
        });
      }
    } else {
      // Send immediately when online
      sendMessageMutation.mutate(messageText);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const getSenderInfo = (message: EventMessage) => {
    if (message.sender_id === user?.id) {
      return {
        name: 'You',
        color: 'bg-[hsl(var(--loom-user))]',
        isCurrentUser: true,
      };
    } else {
      return {
        name: partner?.display_name || 'Partner',
        color: 'bg-[hsl(var(--loom-partner))]',
        isCurrentUser: false,
      };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--loom-primary))]"></div>
        <span className="ml-2 text-sm text-[hsl(var(--loom-text-muted))]">Loading messages...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-[hsl(var(--loom-text-muted))] text-sm">
          Failed to load messages. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96">
      {/* Connection Status */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--loom-border))]">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs text-[hsl(var(--loom-text-muted))]">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--loom-text-muted))] opacity-50" />
            <h3 className="font-medium mb-2">No messages yet</h3>
            <p className="text-[hsl(var(--loom-text-muted))] text-sm">
              Start a conversation about this event with {partner?.display_name || 'your partner'}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const senderInfo = getSenderInfo(message);
            return (
              <div
                key={message.id}
                className={cn(
                  'flex items-start space-x-3 group',
                  senderInfo.isCurrentUser ? 'justify-end' : 'justify-start'
                )}
              >
                {!senderInfo.isCurrentUser && (
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0',
                    senderInfo.color
                  )}>
                    {senderInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className={cn(
                  'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
                  senderInfo.isCurrentUser
                    ? 'bg-[hsl(var(--loom-primary))] text-white'
                    : 'bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text))]'
                )}>
                  {!senderInfo.isCurrentUser && (
                    <div className="text-xs font-medium mb-1 opacity-75">
                      {senderInfo.name}
                    </div>
                  )}
                  <div className="text-sm">{message.message}</div>
                  <div className={cn(
                    'text-xs mt-1 opacity-75',
                    senderInfo.isCurrentUser ? 'text-right' : 'text-left'
                  )}>
                    {format(new Date(message.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>

                {senderInfo.isCurrentUser && (
                  <button
                    onClick={() => handleDeleteMessage(message.id)}
                    className="p-1 hover:bg-[hsl(var(--loom-border))] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete message"
                  >
                    <Trash2 className="w-4 h-4 text-[hsl(var(--loom-danger))]" />
                  </button>
                )}

                {senderInfo.isCurrentUser && (
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0',
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
      <div className="border-t border-[hsl(var(--loom-border))] p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${partner?.display_name || 'your partner'}...`}
            className="flex-1 px-3 py-2 border border-[hsl(var(--loom-border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] focus:border-transparent"
            disabled={sendMessageMutation.isPending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className={cn(
              'px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors',
              newMessage.trim() && !sendMessageMutation.isPending
                ? 'bg-[hsl(var(--loom-primary))] text-white hover:bg-[hsl(var(--loom-primary))]/90'
                : 'bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text-muted))] cursor-not-allowed'
            )}
          >
            {sendMessageMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default EventChat;