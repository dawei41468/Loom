// Today View - Main Dashboard
import { useEffect, useMemo } from 'react';
import { format, isToday, isTomorrow, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Plus, Clock, MapPin, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEvents, useAuth, useUI } from '../store';
import { apiClient } from '../api/client';
import { Event } from '../types';

const Today = () => {
  const navigate = useNavigate();
  const { events, proposals, setEvents, setProposals } = useEvents();
  const { user, partner } = useAuth();
  const { addToast } = useUI();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsResponse, proposalsResponse] = await Promise.all([
          apiClient.getEvents(),
          apiClient.getProposals(),
        ]);
        setEvents(eventsResponse.data);
        setProposals(proposalsResponse.data);
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Failed to load data',
          description: 'Please try refreshing the page.',
        });
      }
    };

    loadData();
  }, [setEvents, setProposals, addToast]);

  const todayEvents = useMemo(() => {
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    
    return events
      .filter(event => {
        const eventStart = parseISO(event.start_time);
        return isWithinInterval(eventStart, { start: dayStart, end: dayEnd });
      })
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
  }, [events]);

  const nextEvent = useMemo(() => {
    const now = new Date();
    return events
      .filter(event => parseISO(event.start_time) > now)
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())[0];
  }, [events]);

  const pendingProposals = proposals.filter(p => p.status === 'pending');

  const getEventType = (event: Event): 'user' | 'partner' | 'shared' => {
    if (event.attendees.length > 1) return 'shared';
    if (event.created_by === user?.id) return 'user';
    return 'partner';
  };

  const formatEventTime = (event: Event) => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  const getNextUpText = (event: Event) => {
    const start = parseISO(event.start_time);
    if (isToday(start)) return 'Today';
    if (isTomorrow(start)) return 'Tomorrow';
    return format(start, 'MMM d');
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">
          {format(new Date(), 'EEEE, MMM d')}
        </h1>
        <p className="text-[hsl(var(--loom-text-muted))]">
          {partner ? `You and ${partner.display_name}` : 'Your schedule'}
        </p>
      </div>

      {/* Next Up Card */}
      {nextEvent && (
        <div className="loom-card">
          <div className="flex items-center space-x-3 mb-3">
            <Clock className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
            <span className="font-medium">Next up • {getNextUpText(nextEvent)}</span>
          </div>
          <div className={`event-block-${getEventType(nextEvent)} mb-3`}>
            <h3 className="font-medium">{nextEvent.title}</h3>
            <p className="text-sm opacity-90">{formatEventTime(nextEvent)}</p>
            {nextEvent.location && (
              <div className="flex items-center space-x-1 mt-1">
                <MapPin className="w-3 h-3" />
                <span className="text-xs">{nextEvent.location}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/event/${nextEvent.id}`)}
            className="text-sm text-[hsl(var(--loom-primary))] hover:underline"
          >
            View details
          </button>
        </div>
      )}

      {/* Pending Proposals */}
      {pendingProposals.length > 0 && (
        <div className="loom-card">
          <h2 className="font-medium mb-3">Pending Proposals</h2>
          <div className="space-y-3">
            {pendingProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="flex items-center justify-between p-3 rounded-[var(--loom-radius-md)] bg-[hsl(var(--loom-partner)/0.1)] border border-[hsl(var(--loom-partner)/0.2)]"
              >
                <div>
                  <h3 className="font-medium text-sm">{proposal.title}</h3>
                  <p className="text-xs text-[hsl(var(--loom-text-muted))]">
                    from {proposal.proposed_by === user?.id ? 'you' : partner?.display_name}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="loom-chip loom-chip-shared text-xs">
                    Accept
                  </button>
                  <button className="loom-chip text-xs">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Timeline */}
      <div className="loom-card">
        <h2 className="font-medium mb-4">Today's Schedule</h2>
        {todayEvents.length === 0 ? (
          <div className="text-center py-8 text-[hsl(var(--loom-text-muted))]">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No events today</p>
            <p className="text-sm">Time to plan something together!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayEvents.map((event) => {
              const eventType = getEventType(event);
              return (
                <div
                  key={event.id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-[hsl(var(--loom-border)/0.5)] rounded-[var(--loom-radius-md)] p-2 -m-2 transition-colors"
                  onClick={() => navigate(`/event/${event.id}`)}
                >
                  <div className="timeline-hour text-xs">
                    {format(parseISO(event.start_time), 'h:mm a')}
                  </div>
                  <div className={`event-block-${eventType} flex-1`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm">{event.title}</h3>
                      {event.attendees.length > 1 && (
                        <Users className="w-4 h-4" />
                      )}
                    </div>
                    <p className="text-xs opacity-90">
                      {format(parseISO(event.end_time), 'h:mm a')}
                      {event.location && ` • ${event.location}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => navigate('/add')}
          className="loom-btn-primary flex flex-col items-center space-y-2 py-4"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm">Add Event</span>
        </button>
        <button
          onClick={() => navigate('/add?type=proposal')}
          className="loom-btn-ghost flex flex-col items-center space-y-2 py-4"
        >
          <Users className="w-6 h-6" />
          <span className="text-sm">Propose</span>
        </button>
        <button
          onClick={() => navigate('/tasks')}
          className="loom-btn-ghost flex flex-col items-center space-y-2 py-4"
        >
          <Clock className="w-6 h-6" />
          <span className="text-sm">Add Task</span>
        </button>
      </div>
    </div>
  );
};

export default Today;