// Event Detail Page (iOS-style bottom sheet)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { 
  X, 
  MapPin, 
  Clock, 
  Users, 
  Edit3, 
  Trash2,
  MessageCircle,
  CheckSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuthState } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { Event } from '../types';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, eventQueries, partnerQueries, userQueries } from '../api/queries';
import { apiClient } from '../api/client';
const EventChat = React.lazy(() => import('../components/EventChat'));
const EventChecklist = React.lazy(() => import('../components/EventChecklist'));

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();

  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'checklist'>('details');
  const [showFullDetails, setShowFullDetails] = useState(true);
  const queryClient = useQueryClient();
  const isDev = import.meta.env.MODE !== 'production';

  // Ensure partner info is available for rendering attendees
  const { data: partnerResponse } = useQuery({
    queryKey: queryKeys.partner,
    queryFn: partnerQueries.getPartner,
    enabled: !!user,
  });
  const partnerForDisplay = partnerResponse?.data || partner;

  // Ensure fresh user profile for comparisons/labels
  const { data: meResponse } = useQuery({
    queryKey: queryKeys.user,
    queryFn: userQueries.getMe,
    enabled: true,
  });
  const meUser = meResponse?.data || user;

  // Load event exclusively via React Query
  const { data: eventData, isLoading: isLoadingEvent, error: eventError } = useQuery({
    queryKey: queryKeys.event(id!),
    queryFn: () => eventQueries.getEvent(id!),
    enabled: !!id,
  });

  const event = eventData?.data || null;

  // Compute chat availability early so that the following effect is always declared
  // even when event is loading or missing, preserving hook order across renders.
  const chatDisabled = !partnerForDisplay || !event || (Array.isArray(event?.attendees) ? event!.attendees.length < 2 : true);

  // Auto-redirect away from Chat tab when disabled (must be declared before early returns)
  useEffect(() => {
    if (chatDisabled && activeTab === 'chat') {
      setActiveTab('details');
    }
  }, [chatDisabled, activeTab]);

  // Delete event mutation with optimistic update
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => apiClient.deleteEvent(eventId),
    onMutate: async (eventId: string) => {
      // Cancel any outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.events });
      if (eventId) {
        await queryClient.cancelQueries({ queryKey: queryKeys.event(eventId) });
      }

      // Snapshot previous caches
      const prevEvents = queryClient.getQueryData<any>(queryKeys.events);
      const prevEvent = eventId ? queryClient.getQueryData<any>(queryKeys.event(eventId)) : undefined;

      // Optimistically remove from events list cache
      queryClient.setQueryData<any>(queryKeys.events, (old: any) => {
        const list = old?.data ?? old;
        if (!Array.isArray(list)) return old;
        const next = list.filter((e: Event) => String(e.id) !== String(eventId));
        return old?.data ? { ...old, data: next } : next;
      });

      // Optimistically clear single event cache
      if (eventId) {
        queryClient.setQueryData(queryKeys.event(eventId), undefined);
      }

      return { prevEvents, prevEvent };
    },
    onError: (error, eventId, context) => {
      console.error('Failed to delete event:', error);
      // Roll back caches
      if (context?.prevEvents !== undefined) {
        queryClient.setQueryData(queryKeys.events, context.prevEvents);
      }
      if (eventId && context?.prevEvent !== undefined) {
        queryClient.setQueryData(queryKeys.event(eventId), context.prevEvent);
      }
      addToast({
        type: 'error',
        title: 'Failed to delete event',
        description: 'Please try again.',
      });
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Event deleted',
        description: 'The event has been successfully deleted.',
      });
      navigate('/');
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      if (variables) {
        queryClient.invalidateQueries({ queryKey: queryKeys.event(variables) });
      }
    },
  });


  useEffect(() => {
    if (!event && !isLoadingEvent) {
      addToast({
        type: 'error',
        title: 'Event not found',
        description: 'The event may have been deleted or you may not have access to it.',
      });
      navigate('/');
    }
  }, [event, isLoadingEvent, navigate, addToast]);

  if (isLoadingEvent) {
    return (
      <div className="min-h-screen bg-[hsl(var(--loom-bg))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--loom-primary))] mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold mb-2">Loading event...</h2>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[hsl(var(--loom-bg))] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Event not found</h2>
          <button
            onClick={() => navigate('/')}
            className="loom-btn-primary"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const getEventType = (event: Event): 'user' | 'partner' | 'shared' => {
    if (event.attendees.length > 1) return 'shared';
    if (event.created_by === meUser?.id) return 'user';
    return 'partner';
  };

  const eventType = getEventType(event);
  const isShared = event.attendees.length > 1;
  const isOwner = event.created_by === meUser?.id;

  const formatEventDateTime = (event: Event) => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    
    return {
      date: format(start, 'MM/dd/yyyy'),
      time: `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
      duration: Math.round((end.getTime() - start.getTime()) / (1000 * 60)),
    };
  };

  const { date, time, duration } = formatEventDateTime(event);

  const handleDelete = () => {
    if (!event) return;

    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate(event.id);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: event.title,
        text: `${event.title} - ${date} at ${time}`,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback to copying URL
      try {
        await navigator.clipboard.writeText(window.location.href);
        addToast({
          type: 'success',
          title: 'Event link copied!',
        });
      } catch (clipboardError) {
        addToast({
          type: 'error',
          title: 'Failed to share',
          description: 'Unable to share or copy link.',
        });
      }
    }
  };

  const renderDetailsTab = () => {
    // Derive attendees strictly from the event data
    // Do not add partner or current user implicitly based on visibility or creator
    const attendeesToDisplay = Array.from(new Set<string>((event.attendees || []).map(String)));

    return (
    <div className="space-y-6">
      {/* Event Header */}
      <div className={`event-block-${eventType} p-6`}>
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-xl font-semibold text-[hsl(var(--loom-text))]">{event.title}</h1>
          <div className="flex items-center space-x-2">
            {attendeesToDisplay.length > 1 && <Users className="w-5 h-5 !text-[hsl(var(--loom-text))]" />}
            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="p-1 hover:bg-white/20 rounded"
            >
              {showFullDetails ? (
                <EyeOff className="w-4 h-4 !text-[hsl(var(--loom-text))]" />
              ) : (
                <Eye className="w-4 h-4 !text-[hsl(var(--loom-text))]" />
              )}
            </button>
          </div>
        </div>
        
        <div className="space-y-2 text-[hsl(var(--loom-text))]">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{time}</span>
          </div>
          {event.location && (
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{event.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Event Details */}
      {showFullDetails && (
        <div className="space-y-4">
          <div className="loom-card">
            <h3 className="font-medium mb-3">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--loom-text-muted))]">Date</span>
                <span>{date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--loom-text-muted))]">Duration</span>
                <span>{duration} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--loom-text-muted))]">Visibility</span>
                <span className="capitalize">{event.visibility.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--loom-text-muted))]">Created by</span>
                <span>{event.created_by === meUser?.id ? 'You' : partnerForDisplay?.display_name}</span>
              </div>
            </div>
          </div>

          {event.description && (
            <div className="loom-card">
              <h3 className="font-medium mb-3">Notes</h3>
              <p className="text-sm text-[hsl(var(--loom-text))]">
                {event.description}
              </p>
            </div>
          )}

          {attendeesToDisplay.length > 0 && (
            <div className="loom-card">
              <h3 className="font-medium mb-3">Attendees</h3>
              <div className="space-y-2">
                {attendeesToDisplay.map((attendeeId) => {
                  const attendee = attendeeId === meUser?.id ? meUser : (attendeeId === partnerForDisplay?.id ? partnerForDisplay : null);
                  if (!attendee) return null;
                  
                  return (
                    <div key={attendeeId} className="flex items-center space-x-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold',
                        attendeeId === meUser?.id ? 'bg-[hsl(var(--loom-user))]' : 'bg-[hsl(var(--loom-partner))]'
                      )}>
                        {attendee.display_name.charAt(0).toUpperCase()}
                      </div>
                      <span>{attendee.display_name}</span>
                      {attendeeId === meUser?.id && (
                        <span className="text-xs text-[hsl(var(--loom-text-muted))]">(You)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {event.reminders.length > 0 && (
            <div className="loom-card">
              <h3 className="font-medium mb-3">Reminders</h3>
              <div className="flex flex-wrap gap-2">
                {event.reminders.map((minutes) => (
                  <span
                    key={minutes}
                    className="loom-chip bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text))]"
                  >
                    {minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) > 1 ? 's' : ''}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    );
  };

  const renderChatTab = () => {
    // Check if there's an access error
    if (eventError && 'message' in eventError && eventError.message?.includes('Access denied')) {
      return (
        <div className="loom-card">
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--loom-text-muted))] opacity-50" />
            <h3 className="font-medium mb-2">Chat Unavailable</h3>
            <p className="text-[hsl(var(--loom-text-muted))] text-sm">
              You don't have access to chat for this event.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="loom-card">
        <React.Suspense fallback={<div className="py-6 text-center text-sm text-[hsl(var(--loom-text-muted))]">Loading chat...</div>}>
          <EventChat eventId={event.id} hasAccess={true} />
        </React.Suspense>
      </div>
    );
  };

  const renderChecklistTab = () => {
    // Check if there's an access error
    if (eventError && 'message' in eventError && eventError.message?.includes('Access denied')) {
      return (
        <div className="loom-card">
          <div className="text-center py-8">
            <CheckSquare className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--loom-text-muted))] opacity-50" />
            <h3 className="font-medium mb-2">Checklist Unavailable</h3>
            <p className="text-[hsl(var(--loom-text-muted))] text-sm">
              You don't have access to the checklist for this event.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="loom-card">
        <React.Suspense fallback={<div className="py-6 text-center text-sm text-[hsl(var(--loom-text-muted))]">Loading checklist...</div>}>
          <EventChecklist eventId={event.id} />
        </React.Suspense>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--loom-bg))] safe-area-top">
      {/* Sticky Top (Header + Tabs) */}
      <div className="sticky top-0 z-40 bg-[hsl(var(--loom-bg))] border-b border-[hsl(var(--loom-border))]">
        {/* Header Row */}
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-[hsl(var(--loom-border))] rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-1.5">
            {isOwner && (
              <>
                <button
                  onClick={() => navigate(`/event/${event.id}/edit`)}
                  className="p-1.5 hover:bg-[hsl(var(--loom-border))] rounded-full"
                  title="Edit"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 hover:bg-[hsl(var(--loom-border))] rounded-full"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5 text-[hsl(var(--loom-danger))]" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs Row */}
        <div className="flex">
          {[
            { id: 'details', label: 'Details', icon: Clock },
            { id: 'chat', label: 'Chat', icon: MessageCircle },
            { id: 'checklist', label: 'Checklist', icon: CheckSquare },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                if (id === 'chat' && chatDisabled) return; // mute chat when disabled
                setActiveTab(id as 'details' | 'chat' | 'checklist');
              }}
              className={cn(
                'flex-1 flex items-center justify-center space-x-2 py-2 transition-colors',
                activeTab === id
                  ? 'text-[hsl(var(--loom-primary))] border-b-2 border-[hsl(var(--loom-primary))]'
                  : 'text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))]',
                id === 'chat' && chatDisabled && 'opacity-50 cursor-not-allowed'
              )}
              aria-disabled={id === 'chat' && chatDisabled}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        'container py-6',
        isOwner ? 'pb-24' : 'pb-6'
      )}>
        {activeTab === 'details' && renderDetailsTab()}
        {activeTab === 'chat' && renderChatTab()}
        {activeTab === 'checklist' && renderChecklistTab()}
      </div>

      {/* Actions (removed duplicate/edit bottom bar) */}
    </div>
  );
};

export default EventDetail;