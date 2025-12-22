import React, { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, getDay, parseISO, addHours, startOfDay, isBefore } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '../types';
import { useTranslation } from '../i18n';
import { useUserColors } from '../hooks/useUserColors';

interface CustomCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Event;
}

interface CustomCalendarProps {
  events: CustomCalendarEvent[];
  view: 'month' | 'week' | 'day';
  date: Date;
  onViewChange: (view: 'month' | 'week' | 'day') => void;
  onNavigate: (date: Date) => void;
  onSelectEvent: (event: CustomCalendarEvent) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  onHeaderClick?: () => void;
  height?: string;
  className?: string;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  events,
  view,
  date,
  onViewChange,
  onNavigate,
  onSelectEvent,
  onSelectSlot,
  onHeaderClick,
  height = '600px',
  className = '',
}) => {
  const [currentDate, setCurrentDate] = useState(date);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const weekHeaderRef = useRef<HTMLDivElement | null>(null);
  const { getEventColor } = useUserColors();

  useEffect(() => {
    setCurrentDate(date);
  }, [date]);

  // Auto-scroll to 07:00 when entering week/day views
  useEffect(() => {
    if (view !== 'week' && view !== 'day') return;
    const container = scrollRef.current;
    if (!container) return;

    const scrollToSeven = () => {
      const target = container.querySelector('[data-hour="7"]') as HTMLElement | null;
      if (!target) return;
      const headerHeight = view === 'week' ? (weekHeaderRef.current?.offsetHeight ?? 0) : 0;
      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const top = targetRect.top - containerRect.top + container.scrollTop - headerHeight;
      container.scrollTop = Math.max(0, Math.round(top));
    };

    // Ensure layout is ready before measuring
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToSeven);
    });
  }, [view]);

  // Also auto-scroll when navigating dates within week/day views
  useEffect(() => {
    if (view !== 'week' && view !== 'day') return;
    const container = scrollRef.current;
    if (!container) return;

    const scrollToSeven = () => {
      const target = container.querySelector('[data-hour="7"]') as HTMLElement | null;
      if (!target) return;
      const headerHeight = view === 'week' ? (weekHeaderRef.current?.offsetHeight ?? 0) : 0;
      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const top = targetRect.top - containerRect.top + container.scrollTop - headerHeight;
      container.scrollTop = Math.max(0, Math.round(top));
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToSeven);
    });
  }, [currentDate, view]);

  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate: Date;
    if (view === 'month') {
      newDate = direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
    } else if (view === 'week') {
      newDate = direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
    } else {
      newDate = direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1);
    }
    setCurrentDate(newDate);
    onNavigate(newDate);
  };

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

    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        navigateDate('next');
      } else {
        navigateDate('prev');
      }
    }

    touchStartX.current = 0;
    touchStartY.current = 0;
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekDays = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')];

    return (
      <div className="custom-calendar-month">
        {/* Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-[hsl(var(--loom-text-muted))] py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dayEvents = events.filter(event =>
              isSameDay(event.start, day) || (event.start <= day && event.end >= day)
            );

            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[80px] p-1 border border-[hsl(var(--loom-border))] rounded-md cursor-pointer hover:bg-[hsl(var(--loom-surface-hover))] ${
                  !isCurrentMonth ? 'text-[hsl(var(--loom-text-muted))]' : ''
                } ${isToday ? 'bg-[hsl(var(--loom-primary-light))] border-[hsl(var(--loom-primary))]' : ''}`}
                onClick={() => {
                  const todayStart = startOfDay(new Date());
                  if (isBefore(day, todayStart)) return;

                  const now = new Date();
                  let start: Date;

                  if (isSameDay(day, now)) {
                    start = new Date(now);
                    start.setSeconds(0, 0);
                    start.setMinutes(0);
                    start.setHours(start.getHours() + 1);
                  } else {
                    start = new Date(day);
                    start.setHours(8, 0, 0, 0);
                  }

                  const end = addHours(start, 1);
                  onSelectSlot({ start, end });
                }}
              >
                <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => {
                    const eventColor = getEventColor(event.resource.created_by);
                    return (
                      <div
                        key={event.id}
                        className="text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: eventColor }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-[hsl(var(--loom-text-muted))]">
                      +{dayEvents.length - 3} {t('more')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const now = new Date();
    const currentHour = now.getHours();

    return (
      <div className="custom-calendar-week">
        <div ref={weekHeaderRef} className="grid grid-cols-8 gap-0 sticky top-0 z-10 bg-[hsl(var(--loom-surface))] border-b border-[hsl(var(--loom-border))]">
          {/* Time column */}
          <div className="text-sm font-medium text-[hsl(var(--loom-text-muted))] py-2 pr-2 text-right">{t('time')}</div>
          {days.map((day) => {
            const dayIndex = getDay(day);
            const dayNames = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')];
            return (
              <div
                key={day.toISOString()}
                className="text-center text-sm font-medium py-2 border-l border-[hsl(var(--loom-border))]"
              >
                <div>{dayNames[dayIndex]}</div>
                <div className="text-xs">{format(day, 'd')}</div>
              </div>
            );
          })}
        </div>

        {/* Time slots */}
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} data-hour={hour} className="grid grid-cols-8 gap-0 border-t border-[hsl(var(--loom-border))]">
            <div className="text-xs text-[hsl(var(--loom-text-muted))] py-2 pr-2 text-right">
              {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
            </div>
            {days.map(day => {
              const dayEvents = events.filter(event => {
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                const slotStart = new Date(day);
                slotStart.setHours(hour, 0, 0, 0);
                const slotEnd = new Date(slotStart);
                slotEnd.setHours(hour + 1, 0, 0, 0);

                return eventStart < slotEnd && eventEnd > slotStart;
              });

              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className={`min-h-[40px] p-1 cursor-pointer hover:bg-[hsl(var(--loom-surface-hover))] border-l border-[hsl(var(--loom-border))] ${
                    isSameDay(day, now) && hour === currentHour
                      ? 'relative z-10 bg-[hsl(var(--loom-primary-light))] ring-1 ring-inset ring-[hsl(var(--loom-primary))]'
                      : ''
                  }`}
                  onClick={() => {
                    const slotStart = new Date(day);
                    slotStart.setHours(hour, 0, 0, 0);
                    const slotEnd = new Date(slotStart);
                    slotEnd.setHours(hour + 1, 0, 0, 0);

                    if (slotEnd.getTime() <= now.getTime()) return;

                    const start = slotStart.getTime() <= now.getTime() ? slotEnd : slotStart;
                    const end = addHours(start, 1);
                    onSelectSlot({ start, end });
                  }}
                >
                  {dayEvents.map(event => {
                    const eventColor = getEventColor(event.resource.created_by);
                    return (
                      <div
                        key={event.id}
                        className="text-xs p-1 mb-1 rounded text-white truncate cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: eventColor }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderDayView = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    return (
      <div className="custom-calendar-day">
        <div className="space-y-2">
          {Array.from({ length: 24 }, (_, hour) => {
            const hourEvents = events.filter(event => {
              const eventStart = new Date(event.start);
              const eventEnd = new Date(event.end);
              const slotStart = new Date(currentDate);
              slotStart.setHours(hour, 0, 0, 0);
              const slotEnd = new Date(slotStart);
              slotEnd.setHours(hour + 1, 0, 0, 0);

              return eventStart < slotEnd && eventEnd > slotStart;
            });

            return (
              <div key={hour} data-hour={hour} className="flex border-b border-[hsl(var(--loom-border))]">
                <div className="w-16 text-xs text-[hsl(var(--loom-text-muted))] py-2 pr-2 text-right border-r border-[hsl(var(--loom-border))]">
                  {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                </div>
                <div
                  className={`flex-1 min-h-[40px] p-1 cursor-pointer hover:bg-[hsl(var(--loom-surface-hover))] ${
                    isSameDay(currentDate, now) && hour === currentHour
                      ? 'relative z-10 bg-[hsl(var(--loom-primary-light))] ring-1 ring-inset ring-[hsl(var(--loom-primary))]'
                      : ''
                  }`}
                  onClick={() => {
                    const slotStart = new Date(currentDate);
                    slotStart.setHours(hour, 0, 0, 0);
                    const slotEnd = new Date(slotStart);
                    slotEnd.setHours(hour + 1, 0, 0, 0);

                    if (slotEnd.getTime() <= now.getTime()) return;

                    const start = slotStart.getTime() <= now.getTime() ? slotEnd : slotStart;
                    const end = addHours(start, 1);
                    onSelectSlot({ start, end });
                  }}
                >
                  {hourEvents.map(event => {
                    const eventColor = getEventColor(event.resource.created_by);
                    return (
                      <div
                        key={event.id}
                        className="text-xs p-2 mb-1 rounded text-white cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: eventColor }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="text-xs opacity-80">
                          {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`custom-calendar ${className}`}
      style={{ height: view === 'month' ? 'auto' : height }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateDate('prev')}
          className="p-2 hover:bg-[hsl(var(--loom-surface-hover))] rounded-md"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className={`text-xl font-semibold ${onHeaderClick ? 'cursor-pointer hover:opacity-80' : ''}`} onClick={onHeaderClick}>
            {view === 'month' && format(currentDate, 'MMMM yyyy')}
            {view === 'week' && `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`}
            {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>

        <button
          onClick={() => navigateDate('next')}
          className="p-2 hover:bg-[hsl(var(--loom-surface-hover))] rounded-md"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex justify-center mb-4 space-x-2">
        {(['month', 'week', 'day'] as const).map(viewOption => (
          <button
            key={viewOption}
            onClick={() => onViewChange(viewOption)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              view === viewOption
                ? 'bg-[hsl(var(--loom-primary))] text-white'
                : 'bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] hover:bg-[hsl(var(--loom-surface-hover))]'
            }`}
          >
            {t(viewOption)}
          </button>
        ))}
      </div>

      {/* Calendar Content */}
      {view === 'month' ? (
        // In month view, avoid internal scroll to show the full month grid
        <div>
          {renderMonthView()}
        </div>
      ) : (
        // For week/day, keep internal scrolling for the time grid
        <div
          ref={scrollRef}
          className="overflow-auto border border-[hsl(var(--loom-border))] rounded-md"
          style={{ height: `calc(${height} - 120px)` }}
        >
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </div>
      )}
    </div>
  );
};

export default CustomCalendar;