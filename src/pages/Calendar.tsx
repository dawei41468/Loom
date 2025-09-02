// Calendar View with 3-Day, Week, and Agenda modes
import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEvents, useEventFilter, useEventsActions } from '../stores';
import { Event } from '../types';
import { cn } from '@/lib/utils';
import { PageHeader } from '../components/ui/page-header';
import { Section } from '../components/ui/section';

type ViewType = '3day' | 'week' | 'agenda';

const Calendar = () => {
  const events = useEvents();
  const filter = useEventFilter();
  const { setEventFilter } = useEventsActions();
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
    <div className="flex bg-[hsl(var(--loom-border))] rounded-[var(--loom-radius-lg)] p-1.5 shadow-[var(--loom-shadow-sm)]">
      {(['3day', 'week', 'agenda'] as ViewType[]).map((type) => (
        <button
          key={type}
          onClick={() => setViewType(type)}
          className={cn(
            'flex-1 py-3 px-6 text-sm font-semibold rounded-[var(--loom-radius-md)] transition-all duration-200',
            viewType === type
              ? 'bg-white text-[hsl(var(--loom-text))] shadow-[var(--loom-shadow-md)] transform scale-[1.02]'
              : 'text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))] hover:bg-white/50'
          )}
        >
          {type === '3day' ? '3 Day' : type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      ))}
    </div>
  );

  const renderFilterChips = () => (
    <div className="flex space-x-3 overflow-x-auto pb-2">
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
            'loom-chip whitespace-nowrap hover-scale',
            filter.type === type
              ? 'loom-chip-primary'
              : 'bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text-muted))] border-[hsl(var(--loom-border))] hover:bg-[hsl(var(--loom-border))]'
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
    <div className="container py-8 space-y-8">
      {/* Enhanced Header */}
      <PageHeader
        title="Calendar"
        action={
          <button className="loom-btn-icon">
            <Search className="w-5 h-5" />
          </button>
        }
      />

      {/* Enhanced View Controls */}
      <Section>
        <div className="space-y-6">
          {renderSegmentedControl()}
          {renderFilterChips()}
        </div>
      </Section>

      {/* Enhanced Navigation */}
      <Section>
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek('prev')}
            className="loom-btn-icon hover-scale"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <h2 className="loom-heading-3">
              {viewType === 'week' 
                ? `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')
              }
            </h2>
          </div>
          
          <button
            onClick={() => navigateWeek('next')}
            className="loom-btn-icon hover-scale"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </Section>

      {/* Calendar Content */}
      {viewType === '3day' && render3DayView()}
      {viewType === 'week' && renderWeekView()}
      {viewType === 'agenda' && renderAgendaView()}

      {/* Enhanced Floating Action Button */}
      <button className="fixed bottom-24 right-6 w-16 h-16 loom-gradient-primary text-white rounded-full shadow-[var(--loom-shadow-xl)] hover:shadow-[var(--loom-shadow-xl)] hover-scale flex items-center justify-center z-40">
        <Search className="w-7 h-7" />
      </button>
    </div>
  );
};

export default Calendar;