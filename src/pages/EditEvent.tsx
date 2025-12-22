// Edit Event Sheet Content
import * as React from 'react';
import { useEffect, useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { MapPin, Clock, Users, Bell, X } from 'lucide-react';
import { useAuthState } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { apiClient } from '../api/client';
import { Event } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, eventQueries, partnerQueries } from '../api/queries';
import TextInput from '../components/forms/TextInput';
import TextArea from '../components/forms/TextArea';
import { DateTimePicker } from '../components/forms/DateTimePicker';
import { TimezoneSelect } from '../components/forms/TimezoneSelect';
import SubmitButton from '../components/forms/SubmitButton';
import { cn } from '@/lib/utils';
import { computeEndFromStart } from '../utils/datetime';
import { Button } from '../components/ui/button';

interface EditEventFormContentProps {
  eventId: string;
  onSuccess: () => void;
  formRef: React.RefObject<HTMLFormElement>;
}

const EditEventFormContent = ({ eventId, onSuccess, formRef }: EditEventFormContentProps) => {
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();
  const queryClient = useQueryClient();

  // Load event
  const { data: eventResponse, isLoading } = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () => eventQueries.getEvent(eventId),
    enabled: !!eventId,
  });

  const { data: partnerResp } = useQuery({
    queryKey: queryKeys.partner,
    queryFn: partnerQueries.getPartner,
    enabled: !!user,
  });

  const event = eventResponse?.data as Event | undefined;
  const partnerForDisplay = partnerResp?.data || partner;

  // Local state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDateTime, setStartDateTime] = useState<Date>(new Date());
  const [endDateTime, setEndDateTime] = useState<Date>(new Date());
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<'shared' | 'private'>('private');
  const [includePartner, setIncludePartner] = useState(false); // attendance only when shared
  const [reminders, setReminders] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // UX flags to avoid overriding user's explicit choices
  const [userTouchedVisibility, setUserTouchedVisibility] = useState(false);
  const [autoForcedToPrivate, setAutoForcedToPrivate] = useState(false);

  // Initialize form from event
  useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setDescription(event.description || '');
    setLocation(event.location || '');

    // Handle timezone
    const eventTz = event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(eventTz);

    // Convert UTC to Wall Clock time in event timezone
    // If event.start_time is "2023-10-10T10:00:00Z" and tz is "Asia/Tokyo",
    // toZonedTime will return a Date representing 19:00 Tokyo time (but as a Date object)
    // Wait, toZonedTime returns a Date object that *looks* like the local time if printed in that timezone?
    // No, toZonedTime returns a Date object. When we pass it to DateTimePicker, DateTimePicker uses local browser time.
    // This is tricky.
    // If we want the DateTimePicker to show "10:00 AM", we need a Date object where getHours() returns 10.
    // toZonedTime(utcDate, timeZone) returns a Date which has the same instant.
    // We need to shift the time so that the "UTC" representation matches the "Wall Clock" time of the target timezone.
    // Actually, date-fns-tz `toZonedTime` returns a Date instance which will print the correct wall-clock time
    // ONLY if the system timezone matches the target timezone.
    // If we want to edit "10:00 AM Tokyo" while in "New York", we need to "shift" the date.
    // A common trick is to treat the Date object as a container for YMDHMS values, ignoring its actual timestamp.
    // `toZonedTime` does exactly this: it returns a Date whose UTC components match the wall-clock time of the zoned date.
    // Wait, no. `toZonedTime` constructs a Date instance with the given time in the specific time zone.
    // If we want to bind this to a standard HTML input or our custom picker which uses local Date methods,
    // we usually need to "mock" the date.
    // Let's use `toZonedTime` but be careful.
    // Actually, `toZonedTime` from date-fns-tz v3: "Get a date/time representing the local time in a given time zone..."
    // It returns a Date object.

    // Let's try to just use the values.
    const s = toZonedTime(event.start_time, eventTz);
    const e = toZonedTime(event.end_time, eventTz);
    setStartDateTime(s);
    setEndDateTime(e);

    setReminders(event.reminders || []);
    // Determine visibility and attendance
    const isShared = event.visibility === 'shared';
    setVisibility(isShared ? 'shared' : 'private');
    const partnerIsAttendee = partnerForDisplay?.id
      ? (event.attendees || []).some((a) => String(a) === String(partnerForDisplay.id))
      : false;
    setIncludePartner(isShared && partnerIsAttendee);
  }, [event, partnerForDisplay]);

  // Keep constraints: if no partner, force private
  useEffect(() => {
    if (!partnerForDisplay && visibility === 'shared') {
      setVisibility('private');
      setIncludePartner(false);
      setAutoForcedToPrivate(true);
    }
  }, [partnerForDisplay, visibility]);

  // If partner loads later and we had auto-forced to private, restore to shared unless user changed it
  useEffect(() => {
    if (partnerForDisplay && visibility === 'private' && autoForcedToPrivate && !userTouchedVisibility) {
      setVisibility('shared');
      setAutoForcedToPrivate(false);
    }
  }, [partnerForDisplay, visibility, autoForcedToPrivate, userTouchedVisibility]);

  const handleSetVisibility = (v: 'shared' | 'private') => {
    setUserTouchedVisibility(true);
    if (v === 'private') {
      setIncludePartner(false);
    }
    setVisibility(v);
  };

  const toggleReminder = (minutes: number) => {
    setReminders((prev) =>
      prev.includes(minutes)
        ? prev.filter((m) => m !== minutes)
        : [...prev, minutes].sort((a, b) => a - b)
    );
  };

  const reminderOptions = [5, 10, 15, 30, 60];

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Event>) => apiClient.updateEvent(event!.id, payload),
    onMutate: async (payload: Partial<Event>) => {
      if (!event) return;
      // Cancel outgoing queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.event(event.id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.events });

      // Snapshot previous cache
      const prevEvent = queryClient.getQueryData<unknown>(queryKeys.event(event.id));
      const prevEvents = queryClient.getQueryData<unknown>(queryKeys.events);

      // Optimistically update single event cache
      queryClient.setQueryData<unknown>(queryKeys.event(event.id), (old: unknown) => {
        const curr = (old as { data?: unknown })?.data ?? old;
        const merged = { ...(curr as Record<string, unknown> || {}), ...payload, id: event.id };
        return (old as { data?: unknown })?.data ? { ...(old as Record<string, unknown>), data: merged } : merged;
      });

      // Optimistically update events list cache
      queryClient.setQueryData<unknown>(queryKeys.events, (old: unknown) => {
        const list = (old as { data?: unknown })?.data ?? old;
        if (!Array.isArray(list)) return old;
        const next = list.map((e: Event) => (String(e.id) === String(event.id) ? { ...e, ...payload } : e));
        return (old as { data?: unknown })?.data ? { ...(old as Record<string, unknown>), data: next } : next;
      });

      return { prevEvent, prevEvents };
    },
    onError: (err: Error, _payload, context) => {
      // Rollback caches
      if (event) {
        if (context?.prevEvent !== undefined) {
          queryClient.setQueryData(queryKeys.event(event.id), context.prevEvent);
        }
        if (context?.prevEvents !== undefined) {
          queryClient.setQueryData(queryKeys.events, context.prevEvents);
        }
      }
      addToast({ type: 'error', title: 'Failed to update', description: err.message });
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Event updated' });
      onSuccess();
    },
    onSettled: () => {
      if (!event) return;
      // Ensure caches are synced with server
      queryClient.invalidateQueries({ queryKey: queryKeys.event(event.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
    }
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!event || !title.trim()) {
      addToast({ type: 'error', title: 'Title required' });
      return;
    }
    setIsSubmitting(true);
    try {
      // Convert Wall Clock + Timezone -> UTC
      const startUtc = fromZonedTime(startDateTime, timezone);
      const endUtc = fromZonedTime(endDateTime, timezone);

      const startDateTimeISO = startUtc.toISOString();
      let endDateTimeISO = endUtc.toISOString();

      const sCheck = startUtc.getTime();
      const eCheck = endUtc.getTime();

      if (eCheck <= sCheck) {
        const nextDay = new Date(startUtc);
        nextDay.setDate(nextDay.getDate() + 1);
        endDateTimeISO = nextDay.toISOString();
      }

      const attendees: string[] = [];
      if (user?.id) attendees.push(user.id);
      if (visibility === 'shared' && includePartner && partnerForDisplay?.id) {
        attendees.push(partnerForDisplay.id);
      }

      await updateMutation.mutateAsync({
        title,
        description: description || undefined,
        start_time: startDateTimeISO,
        end_time: endDateTimeISO,
        location: location || undefined,
        visibility,
        attendees,
        reminders,
        timezone,
      } as Partial<Event>);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-[hsl(var(--loom-bg))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--loom-primary))] mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Loading event...</h2>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="loom-card">
          <label className="block text-sm font-medium mb-2">Title</label>
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
        </div>

        {/* Date & Time */}
        <div className="loom-card">
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
            <span className="font-medium">When</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Timezone</label>
              <TimezoneSelect value={timezone} onChange={setTimezone} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">From</label>
              <DateTimePicker
                mode="from"
                value={startDateTime}
                onChange={(val) => {
                  setStartDateTime(val);
                  setEndDateTime(computeEndFromStart(val));
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To</label>
              <DateTimePicker mode="to" value={endDateTime} onChange={setEndDateTime} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="loom-card">
          <div className="flex items-center space-x-2 mb-3">
            <MapPin className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
            <span className="font-medium">Where</span>
          </div>
          <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add a location" />
        </div>

        {/* Description */}
        <div className="loom-card">
          <label className="block text-sm font-medium mb-2">Notes</label>
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add notes or details..." />
        </div>

        {/* Visibility */}
        <div className="loom-card">
          <label className="block text-sm font-medium mb-3">Visibility</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (!partnerForDisplay) return;
                handleSetVisibility('shared');
              }}
              disabled={!partnerForDisplay}
              className={cn(
                'loom-chip text-center',
                visibility === 'shared' ? 'loom-chip-shared' : 'bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text-muted))]',
                !partnerForDisplay && 'opacity-60 cursor-not-allowed'
              )}
              title={!partnerForDisplay ? 'Connect a partner to share events' : undefined}
            >
              Shared
            </button>
            <button
              type="button"
              onClick={() => {
                handleSetVisibility('private');
              }}
              className={cn(
                'loom-chip text-center',
                visibility === 'private' ? 'loom-chip-shared' : 'bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text-muted))]'
              )}
            >
              Private
            </button>
          </div>
        </div>

        {/* Attendees (attendance only when shared) */}
        {partnerForDisplay && visibility === 'shared' && (
          <div className="loom-card">
            <div className="flex items-center space-x-2 mb-3">
              <Users className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
              <span className="font-medium">Attendees</span>
            </div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={includePartner}
                onChange={(e) => setIncludePartner(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-[hsl(var(--loom-border))] text-[hsl(var(--loom-primary))] focus:ring-[hsl(var(--loom-primary))]"
              />
              <span>Include {partnerForDisplay.display_name} (attending)</span>
            </label>
          </div>
        )}

        {/* Reminders */}
        <div className="loom-card">
          <div className="flex items-center space-x-2 mb-3">
            <Bell className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
            <span className="font-medium">Reminders</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {reminderOptions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleReminder(value)}
                className={cn(
                  'loom-chip',
                  reminders.includes(value)
                    ? 'loom-chip-shared'
                    : 'bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text-muted))]'
                )}
              >
                {value < 60 ? `${value} min` : `${Math.floor(value / 60)} hour${Math.floor(value / 60) > 1 ? 's' : ''}`}
              </button>
            ))}
          </div>
        </div>
    </form>
  );
};

export default EditEventFormContent;
