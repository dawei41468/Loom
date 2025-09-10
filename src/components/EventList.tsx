import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay, isToday, isTomorrow } from 'date-fns';
import { Clock, MapPin, Users, Bell, Trash2 } from 'lucide-react';
import { Event } from '../types';
import { useTranslation } from '../i18n';
import { useAuthState } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { queryKeys } from '../api/queries';

interface EventListProps {
  events: Event[];
  range: { start: Date; end: Date };
  isLoading?: boolean;
  onEventClick?: (id: string) => void;
}

const intersectsRange = (event: Event, start: Date, end: Date) => {
  const evStart = parseISO(event.start_time);
  const evEnd = parseISO(event.end_time);
  return !(isBefore(evEnd, start) || isAfter(evStart, end));
};

const dayLabel = (day: Date, t: (key: string) => string) => {
  if (isToday(day)) return t('today');
  if (isTomorrow(day)) return t('tomorrow');
  return format(day, 'EEE, MMM d');
};

const EventList: React.FC<EventListProps> = ({ events, range, isLoading, onEventClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const { addToast } = useToastContext();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => apiClient.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      addToast({ type: 'success', title: t('eventDeleted'), description: t('eventDeletedDesc') });
    },
    onError: () => {
      addToast({ type: 'error', title: t('failedToDeleteEvent'), description: t('pleaseTryAgain') });
    }
  });

  const grouped = useMemo(() => {
    const inRange = events
      .filter(e => intersectsRange(e, range.start, range.end))
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());

    const map = new Map<string, Event[]>();
    inRange.forEach(e => {
      const key = format(startOfDay(parseISO(e.start_time)), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });

    return Array.from(map.entries())
      .map(([key, list]) => ({ key, date: parseISO(key + 'T00:00:00'), list }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, range.start, range.end]);

  const handleClick = (id: string) => {
    if (onEventClick) onEventClick(id);
    else navigate(`/event/${id}`);
  };

  const handleDelete = (e: React.MouseEvent, ev: Event) => {
    e.stopPropagation();
    if (!window.confirm(t('confirmDeleteEvent'))) return;
    deleteMutation.mutate(ev.id);
  };

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--loom-primary))] mx-auto mb-2"></div>
          <p className="text-sm text-[hsl(var(--loom-text-muted))]">{t('loadingEvents')}</p>
        </div>
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div className="loom-card text-center py-10">
        <div className="flex justify-center mb-3">
          <Clock className="w-6 h-6 text-[hsl(var(--loom-text-muted))]" />
        </div>
        <h3 className="font-medium mb-1">{t('noEventsInRange')}</h3>
        <p className="text-sm text-[hsl(var(--loom-text-muted))]">{t('adjustViewOrFilters')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(({ key, date, list }) => (
        <div key={key}>
          <div className="sticky top-0 z-10 bg-[hsl(var(--loom-bg))] py-2">
            <h4 className="text-sm font-semibold text-[hsl(var(--loom-text-muted))]">{dayLabel(date, t)}</h4>
          </div>

          <div className="space-y-2">
            {list.map(ev => {
              const start = parseISO(ev.start_time);
              const end = parseISO(ev.end_time);
              const isOwner = ev.created_by === user?.id;

              return (
                <div
                  key={ev.id}
                  className="loom-card hover:bg-[hsl(var(--loom-surface-hover))] transition-colors cursor-pointer"
                  onClick={() => handleClick(ev.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-12 text-[hsl(var(--loom-primary))] text-sm font-medium">
                      {format(start, 'h:mm a')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{ev.title}</span>
                          {ev.reminders && ev.reminders.length > 0 && (
                            <Bell className="w-4 h-4 text-[hsl(var(--loom-primary))] shrink-0" />
                          )}
                        </div>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--loom-text-muted))]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
                          </span>
                        </div>
                        {ev.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[12rem] sm:max-w-[20rem]">{ev.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{ev.attendees.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text-muted))]">
                        {ev.visibility.replace('_', ' ')}
                      </span>
                      {isOwner && (
                        <button
                          className="p-2 rounded-md hover:bg-[hsl(var(--loom-border))]"
                          onClick={(e) => handleDelete(e, ev)}
                          aria-label={t('delete')}
                        >
                          <Trash2 className="w-4 h-4 text-[hsl(var(--loom-danger))]" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventList;
