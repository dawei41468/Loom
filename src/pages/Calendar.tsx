// Calendar View with react-big-calendar
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, Event as CalendarEvent, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useEvents, useEventFilter, useEventsActions } from '../contexts/EventsContext';
import { Event } from '../types';
import { PageHeader } from '../components/ui/page-header';
import { Section } from '../components/ui/section';
import 'react-big-calendar/lib/css/react-big-calendar.css';

interface CalendarEventType extends CalendarEvent {
  id: string;
  resource: Event;
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-US': enUS,
  },
});

const CalendarPage = () => {
  const navigate = useNavigate();
  const events = useEvents();
  const filter = useEventFilter();
  const { setEventFilter } = useEventsActions();
  const [currentView, setCurrentView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState('600px');

  // Touch gesture handling
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Handle responsive calendar height
  useEffect(() => {
    const updateHeight = () => {
      const height = getCalendarHeight();
      setCalendarHeight(height);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Transform events for calendar
  const calendarEvents: CalendarEventType[] = useMemo(() => {
    let filteredEvents = events;

    // Apply filtering based on filter.type
    if (filter.type !== 'all') {
      filteredEvents = events.filter(event => {
        switch (filter.type) {
          case 'mine':
            return event.created_by === events.find(e => e.id === event.id)?.created_by;
          case 'partner':
            return event.attendees.length === 1; // Simplified - single attendee events
          case 'shared':
            return event.attendees.length > 1;
          default:
            return true;
        }
      });
    }

    return filteredEvents.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start_time),
      end: new Date(event.end_time),
      resource: event,
    }));
  }, [events, filter]);

  const handleEventClick = (event: CalendarEventType) => {
    navigate(`/event/${event.id}`);
  };

  const handleSlotSelect = ({ start, end }: { start: Date; end: Date }) => {
    // Navigate to add event with pre-filled times
    navigate('/add', {
      state: {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      }
    });
  };

  const eventStyleGetter = (event: CalendarEventType) => {
    const loomEvent = event.resource;
    const isShared = loomEvent.attendees.length > 1;

    return {
      style: {
        backgroundColor: isShared ? 'hsl(var(--loom-primary))' : 'hsl(var(--loom-secondary))',
        borderRadius: 'var(--loom-radius-md)',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '11px',
        padding: '1px 4px'
      }
    };
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (currentView === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getCalendarHeight = () => {
    // Responsive height based on screen size
    if (window.innerWidth <= 361) {
      return '400px'; // Very small mobile screens
    } else if (window.innerWidth <= 640) {
      return '450px'; // Mobile screens
    } else {
      return '600px'; // Desktop
    }
  };

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchStartX.current - touchEndX;
    const deltaY = touchStartY.current - touchEndY;

    // Minimum swipe distance
    const minSwipeDistance = 50;

    // Check if it's a horizontal swipe (more significant than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Swipe left - next period
        navigateDate('next');
      } else {
        // Swipe right - previous period
        navigateDate('prev');
      }
    }

    // Reset touch coordinates
    touchStartX.current = 0;
    touchStartY.current = 0;
  };

  return (
    <div className="container py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Mobile-Optimized Header */}
      <div className="flex items-center justify-between">
        <PageHeader title="Calendar" subtitle="View all your events" className="flex-1" />

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="loom-btn-icon ml-4 hover-scale"
          aria-label="Toggle filters"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Navigation */}
      <Section>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateDate('prev')}
            className="loom-btn-icon hover-scale"
            aria-label="Previous period"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center flex-1 mx-2">
            <h3 className="font-semibold text-lg">
              {format(currentDate, currentView === 'month' ? 'MMMM yyyy' : 'MMM d, yyyy')}
            </h3>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="text-xs text-[hsl(var(--loom-primary))] hover:underline mt-1"
            >
              Today
            </button>
          </div>

          <button
            onClick={() => navigateDate('next')}
            className="loom-btn-icon hover-scale"
            aria-label="Next period"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Filter Controls */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:space-x-3 sm:overflow-x-auto sm:pb-2">
            {[
              { type: 'all', label: 'All' },
              { type: 'mine', label: 'Mine' },
              { type: 'partner', label: 'Partner' },
              { type: 'shared', label: 'Shared' },
            ].map(({ type, label }) => (
              <button
                key={type}
                onClick={() => setEventFilter({ type: type as 'all' | 'mine' | 'partner' | 'shared' })}
                className={`loom-chip whitespace-nowrap hover-scale text-sm py-2 px-3 min-h-[40px] ${
                  filter.type === type
                    ? 'loom-chip-primary'
                    : 'bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text-muted))] border-[hsl(var(--loom-border))] hover:bg-[hsl(var(--loom-border))]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Mobile-Optimized Calendar */}
      <Section variant="card" className="p-2 sm:p-6">
        <div
          ref={calendarRef}
          style={{
            height: calendarHeight,
            minHeight: '300px'
          }}
          className="w-full"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            onSelectEvent={handleEventClick}
            onSelectSlot={handleSlotSelect}
            selectable
            popup={false} // Disable popup on mobile for better UX
            views={['month', 'week', 'day']}
            view={currentView}
            onView={setCurrentView}
            date={currentDate}
            onNavigate={setCurrentDate}
            eventPropGetter={eventStyleGetter}
            className="loom-calendar"
            components={{
              toolbar: () => null, // Hide default toolbar, using our custom mobile navigation
            }}
            formats={{
              monthHeaderFormat: 'MMMM yyyy',
              dayHeaderFormat: 'dddd, MMM d',
              dayRangeHeaderFormat: ({ start, end }) =>
                `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`,
            }}
          />
        </div>
      </Section>

      {/* Mobile Quick Actions */}
      <Section>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setCurrentView('month')}
            className={`loom-btn-ghost text-center py-3 px-2 min-h-[50px] ${
              currentView === 'month' ? 'bg-[hsl(var(--loom-primary-light))]' : ''
            }`}
          >
            <div className="text-sm font-medium">Month</div>
          </button>
          <button
            onClick={() => setCurrentView('week')}
            className={`loom-btn-ghost text-center py-3 px-2 min-h-[50px] ${
              currentView === 'week' ? 'bg-[hsl(var(--loom-primary-light))]' : ''
            }`}
          >
            <div className="text-sm font-medium">Week</div>
          </button>
          <button
            onClick={() => setCurrentView('day')}
            className={`loom-btn-ghost text-center py-3 px-2 min-h-[50px] ${
              currentView === 'day' ? 'bg-[hsl(var(--loom-primary-light))]' : ''
            }`}
          >
            <div className="text-sm font-medium">Day</div>
          </button>
        </div>
      </Section>
    </div>
  );
};

export default CalendarPage;