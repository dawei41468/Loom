// Event Detail Page (iOS-style bottom sheet)
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { 
  X, 
  MapPin, 
  Clock, 
  Users, 
  Edit3, 
  Copy, 
  Trash2,
  MessageCircle,
  CheckSquare,
  Eye,
  EyeOff,
  Share
} from 'lucide-react';
import { useEvents, useEventsActions, useUser, usePartner } from '../stores';
import { useToastContext } from '../contexts/ToastContext';
import { Event } from '../types';
import { cn } from '@/lib/utils';

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const events = useEvents();
  const { removeEvent } = useEventsActions();
  const user = useUser();
  const partner = usePartner();
  const { addToast } = useToastContext();
  
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'checklist'>('details');
  const [showFullDetails, setShowFullDetails] = useState(true);

  const event = events.find(e => e.id === id);

  useEffect(() => {
    if (!event) {
      addToast({
        type: 'error',
        title: 'Event not found',
        description: 'The event may have been deleted.',
      });
      navigate('/');
    }
  }, [event, navigate]); // Store actions are stable, don't include addToast

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
    if (event.created_by === user?.id) return 'user';
    return 'partner';
  };

  const eventType = getEventType(event);
  const isShared = event.attendees.length > 1;
  const isOwner = event.created_by === user?.id;

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

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        // await apiClient.deleteEvent(event.id);
        removeEvent(event.id);
        addToast({
          type: 'success',
          title: 'Event deleted',
        });
        navigate('/');
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Failed to delete event',
          description: 'Please try again.',
        });
      }
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

  const renderDetailsTab = () => (
    <div className="space-y-6">
      {/* Event Header */}
      <div className={`event-block-${eventType} p-6`}>
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-xl font-semibold text-white">{event.title}</h1>
          <div className="flex items-center space-x-2">
            {isShared && <Users className="w-5 h-5 text-white" />}
            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="p-1 hover:bg-white/20 rounded"
            >
              {showFullDetails ? (
                <EyeOff className="w-4 h-4 text-white" />
              ) : (
                <Eye className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
        
        <div className="space-y-2 text-white/90">
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
                <span>{event.created_by === user?.id ? 'You' : partner?.display_name}</span>
              </div>
            </div>
          </div>

          {event.description && (
            <div className="loom-card">
              <h3 className="font-medium mb-3">Notes</h3>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                {event.description}
              </p>
            </div>
          )}

          {event.attendees.length > 0 && (
            <div className="loom-card">
              <h3 className="font-medium mb-3">Attendees</h3>
              <div className="space-y-2">
                {event.attendees.map((attendeeId) => {
                  const attendee = attendeeId === user?.id ? user : partner;
                  if (!attendee) return null;
                  
                  return (
                    <div key={attendeeId} className="flex items-center space-x-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold',
                        attendeeId === user?.id ? 'bg-[hsl(var(--loom-user))]' : 'bg-[hsl(var(--loom-partner))]'
                      )}>
                        {attendee.display_name.charAt(0).toUpperCase()}
                      </div>
                      <span>{attendee.display_name}</span>
                      {attendeeId === user?.id && (
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
                    className="loom-chip bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text-muted))]"
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

  const renderChatTab = () => (
    <div className="loom-card text-center py-12">
      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--loom-text-muted))] opacity-50" />
      <h3 className="font-medium mb-2">Event Chat</h3>
      <p className="text-[hsl(var(--loom-text-muted))] text-sm">
        Chat about this event with {partner?.display_name || 'your partner'}
      </p>
      <button className="loom-btn-primary mt-4">
        Start conversation
      </button>
    </div>
  );

  const renderChecklistTab = () => (
    <div className="loom-card text-center py-12">
      <CheckSquare className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--loom-text-muted))] opacity-50" />
      <h3 className="font-medium mb-2">Event Checklist</h3>
      <p className="text-[hsl(var(--loom-text-muted))] text-sm">
        Create a shared checklist for this event
      </p>
      <button className="loom-btn-primary mt-4">
        Create checklist
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--loom-bg))] safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--loom-border))]">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[hsl(var(--loom-border))] rounded-full"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleShare}
            className="p-2 hover:bg-[hsl(var(--loom-border))] rounded-full"
          >
            <Share className="w-5 h-5" />
          </button>
          {isOwner && (
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-[hsl(var(--loom-border))] rounded-full"
            >
              <Trash2 className="w-5 h-5 text-[hsl(var(--loom-danger))]" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[hsl(var(--loom-border))]">
        {[
          { id: 'details', label: 'Details', icon: Clock },
          { id: 'chat', label: 'Chat', icon: MessageCircle },
          { id: 'checklist', label: 'Checklist', icon: CheckSquare },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={cn(
              'flex-1 flex items-center justify-center space-x-2 py-4 transition-colors',
              activeTab === id
                ? 'text-[hsl(var(--loom-primary))] border-b-2 border-[hsl(var(--loom-primary))]'
                : 'text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))]'
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="container py-6">
        {activeTab === 'details' && renderDetailsTab()}
        {activeTab === 'chat' && renderChatTab()}
        {activeTab === 'checklist' && renderChecklistTab()}
      </div>

      {/* Actions */}
      {isOwner && (
        <div className="fixed bottom-6 left-4 right-4 flex space-x-3">
          <button className="loom-btn-ghost flex-1 flex items-center justify-center space-x-2">
            <Copy className="w-4 h-4" />
            <span>Duplicate</span>
          </button>
          <button className="loom-btn-primary flex-1 flex items-center justify-center space-x-2">
            <Edit3 className="w-4 h-4" />
            <span>Edit</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default EventDetail;