// Custom Calendar View
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { useEventFilter, useCalendarUIActions } from '../contexts/CalendarUIContext';
import { Event } from '../types';
import { PageHeader } from '../components/ui/page-header';
import { Section } from '../components/ui/section';
import CustomCalendar from '../components/CustomCalendar';
import { useQuery } from '@tanstack/react-query';
import { queryKeys, eventQueries, userQueries, partnerQueries } from '../api/queries';
import { useToastContext } from '../contexts/ToastContext';
import { useTranslation } from '../i18n';
import { useAuthState } from '../contexts/AuthContext';
import EventList from '../components/EventList';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, parseISO } from 'date-fns';

interface CalendarEventType {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Event;
}


const CalendarPage = () => {
  const navigate = useNavigate();
  const filter = useEventFilter();
  const { setEventFilter } = useCalendarUIActions();
  const { addToast } = useToastContext();
  const { t } = useTranslation();
  const { user, partner } = useAuthState();
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState('600px');

  const STORAGE_KEY = 'calendar_last_viewed_date';

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = parseISO(stored);
        setCurrentDate(parsed);
      } catch {
        // invalid, ignore
      }
    }
  }, []);

  const handleSetCurrentDate = (date: Date) => {
    setCurrentDate(date);
    localStorage.setItem(STORAGE_KEY, date.toISOString());
  };

  const handleHeaderClick = () => {
    const now = new Date();
    setCurrentDate(now);
    localStorage.removeItem(STORAGE_KEY);
  };

  // React Query for fresh user/partner
  const { data: meData } = useQuery({ queryKey: queryKeys.user, queryFn: userQueries.getMe, staleTime: 30000, enabled: true });
  const meUser = meData?.data || user;
  const { data: partnerData } = useQuery({ queryKey: queryKeys.partner, queryFn: partnerQueries.getPartner, staleTime: 30000, enabled: true });
  const partnerForDisplay = partnerData?.data || partner;

  // Use React Query for events data
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: queryKeys.events,
    queryFn: eventQueries.getEvents,
    select: (resp) => resp.data ?? [],
    staleTime: 30_000,
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Failed to load events:', error);
      addToast({
        title: t('error'),
        description: t('failedToLoadEvents'),
        type: 'error',
      });
    }
  }, [error, addToast, t]);


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


  // Compute filtered events once for both calendar and list views
  const filteredEvents = useMemo(() => {
    if (!events) return [] as Event[];
    return events.filter((event) => {
      switch (filter.type) {
        case 'mine':
          return meUser ? event.created_by === meUser.id : true;
        case 'partner':
          return partnerForDisplay ? event.created_by === partnerForDisplay.id : false;
        case 'shared':
          return event.attendees.length > 1;
        case 'all':
        default:
          return true;
      }
    });
  }, [events, filter.type, meUser, partnerForDisplay]);

  // Transform events for calendar
  const calendarEvents = useMemo(() => {
    return filteredEvents.map(event => ({
      id: event.id,
      title: event.title,
      start: parseISO(event.start_time),
      end: parseISO(event.end_time),
      resource: event,
    }));
  }, [filteredEvents]);

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


  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (currentView === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    handleSetCurrentDate(newDate);
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

  // Derive date range for current view to keep list in sync with calendar frame
  const currentRange = useMemo(() => {
    if (currentView === 'month') {
      return {
        start: startOfWeek(startOfMonth(currentDate)),
        end: endOfWeek(endOfMonth(currentDate)),
      };
    }
    if (currentView === 'week') {
      return {
        start: startOfWeek(currentDate),
        end: endOfWeek(currentDate),
      };
    }
    // day view
    return {
      start: startOfDay(currentDate),
      end: endOfDay(currentDate),
    };
  }, [currentView, currentDate]);

  return (
    <div className="container py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Mobile-Optimized Header */}
      <div className="flex items-center justify-between">
        <PageHeader title={t('calendar')} subtitle={t('viewAllYourEvents')} className="flex-1" />

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="loom-btn-icon ml-4 hover-scale"
          aria-label={t('toggleFilters')}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Filter Controls */}
      {showFilters && (
        <div className="flex justify-between gap-2 pb-2 sm:flex sm:space-x-3 sm:overflow-x-auto sm:pb-2">
          {[
            { type: 'all', label: t('all') },
            { type: 'mine', label: t('mine') },
            { type: 'partner', label: t('partner') },
            { type: 'shared', label: t('shared') },
          ].map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setEventFilter({ type: type as 'all' | 'mine' | 'partner' | 'shared' })}
              className={`loom-chip whitespace-nowrap hover-scale text-sm py-2 px-3 min-h-[40px] flex-1 ${
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

      {/* Mobile-Optimized Calendar */}
      <Section variant="card" className="p-2 sm:p-6">
        {isLoading ? (
          <div
            style={{
              height: calendarHeight,
              minHeight: '300px'
            }}
            className="w-full flex items-center justify-center"
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--loom-primary))] mx-auto mb-2"></div>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">{t('loadingEvents')}</p>
            </div>
          </div>
        ) : (
          <div
            style={
              currentView === 'month'
                ? { minHeight: '300px' }
                : { height: calendarHeight, minHeight: '300px' }
            }
            className="w-full"
          >
            <CustomCalendar
              events={calendarEvents}
              view={currentView}
              date={currentDate}
              onViewChange={setCurrentView}
              onNavigate={handleSetCurrentDate}
              onSelectEvent={handleEventClick}
              onSelectSlot={handleSlotSelect}
              onHeaderClick={handleHeaderClick}
              height={currentView === 'month' ? undefined : calendarHeight}
              className="loom-calendar"
            />
          </div>
        )}
      </Section>
      {/* Events List under the calendar */}
      <div>
        <EventList
          events={filteredEvents}
          range={currentRange}
          isLoading={isLoading}
          onEventClick={(id) => navigate(`/event/${id}`)}
        />
      </div>
    </div>
  );
};

export default CalendarPage;