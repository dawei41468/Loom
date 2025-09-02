// Calendar View with 3-Day, Week, and Agenda modes
import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEvents } from '../store';
import { Event } from '../types';
import { cn } from '@/lib/utils';

type ViewType = '3day' | 'week' | 'agenda';

const Calendar = () => {
  const { events, filter, setEventFilter } = useEvents();
  const [viewType, setViewType] = useState<ViewType>('3day');
  const [currentDate, setCurrentDate] = useState(new Date());

  const filteredEvents = useMemo(() => {
    if (filter.type === 'all') return events;
    // Add filtering logic based on filter.type
    return events;
  }, [events, filter]);

  const weekStart = startOfWeek(currentDate);
  const threeDayStart = currentDate;

  const getEventType = (event: Event): 'user' | 'partner' | 'shared' => {
    if (event.attendees.length > 1) return 'shared';
    return 'user'; // Simplified for demo
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const renderSegmentedControl = () => (
    <div className="flex bg-[hsl(var(--loom-border))] rounded-[var(--loom-radius-md)] p-1">
      {(['3day', 'week', 'agenda'] as ViewType[]).map((type) => (
        <button
          key={type}
          onClick={() => setViewType(type)}
          className={cn(
            'flex-1 py-2 px-4 text-sm font-medium rounded-[var(--loom-radius-sm)] transition-all',
            viewType === type
              ? 'bg-white text-[hsl(var(--loom-text))] shadow-sm'
              : 'text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))]'
          )}
        >
          {type === '3day' ? '3 Day' : type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      ))}
    </div>
  );

  const renderFilterChips = () => (
    <div className="flex space-x-2 overflow-x-auto">
      {[
        { type: 'all', label: 'All' },
        { type: 'mine', label: 'Mine' },
        { type: 'partner', label: 'Partner' },
        { type: 'shared', label: 'Shared' },
      ].map(({ type, label }) => (
        <button
          key={type}
          onClick={() => setEventFilter({ type: type as any })}
          className={cn(
            'loom-chip whitespace-nowrap',
            filter.type === type
              ? 'loom-chip-shared'
              : 'bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text-muted))]'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const render3DayView = () => {
    const days = Array.from({ length: 3 }, (_, i) => addDays(threeDayStart, i));
    
    return (
      <div className="space-y-4">
        {days.map((day) => {
          const dayEvents = filteredEvents.filter(event =>
            isSameDay(parseISO(event.start_time), day)
          );

          return (
            <div key={day.toISOString()} className="loom-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">
                  {format(day, 'EEEE, MMM d')}
                </h3>
                <span className="text-sm text-[hsl(var(--loom-text-muted))]">
                  {dayEvents.length} events
                </span>
              </div>
              
              {dayEvents.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--loom-text-muted))]">
                  <p className="text-sm">No events this day</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((event) => {
                    const eventType = getEventType(event);
                    return (
                      <div
                        key={event.id}
                        className={`event-block-${eventType} cursor-pointer hover:opacity-90 transition-opacity`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{event.title}</h4>
                          <span className="text-xs opacity-90">
                            {format(parseISO(event.start_time), 'h:mm a')}
                          </span>
                        </div>
                        {event.location && (
                          <p className="text-xs opacity-80 mt-1">{event.location}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    
    return (
      <div className="loom-card">
        <div className="grid grid-cols-7 gap-1 mb-4">
          {days.map((day) => (
            <div key={day.toISOString()} className="text-center">
              <div className="text-xs text-[hsl(var(--loom-text-muted))] mb-1">
                {format(day, 'EEE')}
              </div>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm',
                isSameDay(day, new Date())
                  ? 'bg-[hsl(var(--loom-primary))] text-white'
                  : ''
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        
        <div className="space-y-1">
          {days.map((day) => {
            const dayEvents = filteredEvents.filter(event =>
              isSameDay(parseISO(event.start_time), day)
            );
            
            if (dayEvents.length === 0) return null;
            
            return (
              <div key={day.toISOString()}>
                {dayEvents.map((event) => {
                  const eventType = getEventType(event);
                  return (
                    <div
                      key={event.id}
                      className={`event-block-${eventType} mb-1`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{event.title}</span>
                        <span className="text-xs opacity-90">
                          {format(parseISO(event.start_time), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const sortedEvents = [...filteredEvents].sort(
      (a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
    );

    return (
      <div className="space-y-3">
        {sortedEvents.map((event) => {
          const eventType = getEventType(event);
          const eventDate = parseISO(event.start_time);
          
          return (
            <div key={event.id} className="loom-card">
              <div className="flex items-start space-x-3">
                <div className="text-center min-w-[60px]">
                  <div className="text-xs text-[hsl(var(--loom-text-muted))]">
                    {format(eventDate, 'MMM')}
                  </div>
                  <div className="text-lg font-semibold">
                    {format(eventDate, 'd')}
                  </div>
                  <div className="text-xs text-[hsl(var(--loom-text-muted))]">
                    {format(eventDate, 'EEE')}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className={`event-block-${eventType}`}>
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm opacity-90">
                      {format(eventDate, 'h:mm a')} - {format(parseISO(event.end_time), 'h:mm a')}
                    </p>
                    {event.location && (
                      <p className="text-xs opacity-80 mt-1">{event.location}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {sortedEvents.length === 0 && (
          <div className="loom-card text-center py-8">
            <p className="text-[hsl(var(--loom-text-muted))]">No events found</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <button className="loom-btn-ghost">
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* View Control */}
      <div className="space-y-4">
        {renderSegmentedControl()}
        {renderFilterChips()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateWeek('prev')}
          className="loom-btn-ghost"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h2 className="font-medium">
          {viewType === 'week' 
            ? `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
            : format(currentDate, 'MMMM yyyy')
          }
        </h2>
        
        <button
          onClick={() => navigateWeek('next')}
          className="loom-btn-ghost"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Content */}
      {viewType === '3day' && render3DayView()}
      {viewType === 'week' && renderWeekView()}
      {viewType === 'agenda' && renderAgendaView()}

      {/* Floating Find Overlap Button */}
      <button className="fixed bottom-24 right-4 w-14 h-14 bg-[hsl(var(--loom-shared))] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
        <Search className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Calendar;