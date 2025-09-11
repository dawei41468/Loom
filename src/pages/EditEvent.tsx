// Edit Event Page
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO, addDays } from 'date-fns';
import { MapPin, Clock, Users, Bell, X } from 'lucide-react';
import { useAuthState } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { apiClient } from '../api/client';
import { Event } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, eventQueries, partnerQueries } from '../api/queries';
import TextInput from '../components/forms/TextInput';
import TextArea from '../components/forms/TextArea';
import { DatePicker } from '../components/forms/DatePicker';
import { TimePicker } from '../components/forms/TimePicker';
import SubmitButton from '../components/forms/SubmitButton';
import { cn } from '@/lib/utils';

const EditEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();
  const queryClient = useQueryClient();

  // Load event
  const { data: eventResponse, isLoading } = useQuery({
    queryKey: queryKeys.event(id!),
    queryFn: () => eventQueries.getEvent(id!),
    enabled: !!id,
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
  const [date, setDate] = useState<string>(''); // yyyy-MM-dd
  const [startTime, setStartTime] = useState(''); // h:mm AM/PM
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<'shared' | 'private'>('private');
  const [includePartner, setIncludePartner] = useState(false); // attendance only when shared
  const [reminders, setReminders] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helpers
  const toDisplayTime = (iso: string) => {
    const d = parseISO(iso);
    return format(d, 'h:mm a');
  };
  const toDateOnly = (iso: string) => format(parseISO(iso), 'yyyy-MM-dd');

  // Convert time string + date to ISO with local offset (same as Add.tsx)
  const convertTimeToISO = (timeString: string, dateString: string) => {
    const trimmed = (timeString || '').trim();
    let m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (m) {
      let hour = parseInt(m[1], 10);
      const minute = m[2] ? parseInt(m[2], 10) : 0;
      const ampm = m[3].toUpperCase();
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const time24 = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      const localDate = new Date(`${dateString}T${time24}:00`);
      const tzMinutes = localDate.getTimezoneOffset();
      const sign = tzMinutes > 0 ? '-' : '+';
      const abs = Math.abs(tzMinutes);
      const offH = String(Math.floor(abs / 60)).padStart(2, '0');
      const offM = String(abs % 60).padStart(2, '0');
      return `${dateString}T${time24}:00${sign}${offH}:${offM}`;
    }
    m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (m) {
      const hour = Math.min(23, parseInt(m[1], 10));
      const minute = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
      const time24 = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      const localDate = new Date(`${dateString}T${time24}:00`);
      const tzMinutes = localDate.getTimezoneOffset();
      const sign = tzMinutes > 0 ? '-' : '+';
      const abs = Math.abs(tzMinutes);
      const offH = String(Math.floor(abs / 60)).padStart(2, '0');
      const offM = String(abs % 60).padStart(2, '0');
      return `${dateString}T${time24}:00${sign}${offH}:${offM}`;
    }
    const localDate = new Date(`${dateString}T12:00:00`);
    const tzMinutes = localDate.getTimezoneOffset();
    const sign = tzMinutes > 0 ? '-' : '+';
    const abs = Math.abs(tzMinutes);
    const offH = String(Math.floor(abs / 60)).padStart(2, '0');
    const offM = String(abs % 60).padStart(2, '0');
    return `${dateString}T12:00:00${sign}${offH}:${offM}`;
  };

  const computeEndFromStart = (timeString: string): string => {
    const trimmed = (timeString || '').trim();
    let m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (m) {
      let hour12 = parseInt(m[1], 10);
      const minute = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
      const ampm = m[3].toUpperCase();
      let hour24 = hour12 % 12;
      if (ampm === 'PM') hour24 += 12;
      hour24 = (hour24 + 1) % 24;
      const displayHour = hour24 % 12 === 0 ? 12 : hour24 % 12;
      const displayAmpm = hour24 >= 12 ? 'PM' : 'AM';
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${displayAmpm}`;
    }
    m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (m) {
      let hour24 = Math.min(23, parseInt(m[1], 10));
      const minute = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
      hour24 = (hour24 + 1) % 24;
      const displayHour = hour24 % 12 === 0 ? 12 : hour24 % 12;
      const displayAmpm = hour24 >= 12 ? 'PM' : 'AM';
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${displayAmpm}`;
    }
    return '1:00 PM';
  };

  // Initialize form from event
  useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setDescription(event.description || '');
    setLocation(event.location || '');
    setDate(toDateOnly(event.start_time));
    setStartTime(toDisplayTime(event.start_time));
    setEndTime(toDisplayTime(event.end_time));
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
    }
  }, [partnerForDisplay, visibility]);

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
    onSuccess: (resp) => {
      // Refresh caches
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.invalidateQueries({ queryKey: queryKeys.event(event!.id) });
      addToast({ type: 'success', title: 'Event updated' });
      navigate(`/event/${event!.id}`);
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to update', description: err.message });
    }
  });

  const handleSubmit = async () => {
    if (!event || !title.trim()) {
      addToast({ type: 'error', title: 'Title required' });
      return;
    }
    setIsSubmitting(true);
    try {
      let startDateTime = convertTimeToISO(startTime, date);
      let endDateTime = convertTimeToISO(endTime, date);
      const sCheck = Date.parse(startDateTime);
      const eCheck = Date.parse(endDateTime);
      if (!isNaN(sCheck) && !isNaN(eCheck) && eCheck <= sCheck) {
        const nextDay = format(addDays(new Date(date), 1), 'yyyy-MM-dd');
        endDateTime = convertTimeToISO(endTime, nextDay);
      }

      const attendees: string[] = [];
      if (user?.id) attendees.push(user.id);
      if (visibility === 'shared' && includePartner && partnerForDisplay?.id) {
        attendees.push(partnerForDisplay.id);
      }

      await updateMutation.mutateAsync({
        title,
        description: description || undefined,
        start_time: startDateTime as unknown as any,
        end_time: endDateTime as unknown as any,
        location: location || undefined,
        visibility,
        attendees: attendees as unknown as any,
        reminders,
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
    <div className="min-h-screen bg-[hsl(var(--loom-bg))] safe-area-top">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[hsl(var(--loom-bg))] flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--loom-border))]">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-[hsl(var(--loom-border))] rounded-full">
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Edit Event</h1>
        <SubmitButton
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={isSubmitting || !title.trim()}
          fullWidth={false}
          className="px-4 py-1.5"
        >
          Save
        </SubmitButton>
      </div>

      <div className="container py-6 space-y-6">
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
              <label className="block text-sm font-medium mb-2">Date</label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TimePicker
                label="Start time"
                value={startTime}
                onChange={(val) => {
                  setStartTime(val);
                  setEndTime(computeEndFromStart(val));
                }}
              />
              <TimePicker
                label="End time"
                value={endTime}
                onChange={setEndTime}
              />
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
                setVisibility('shared');
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
                setVisibility('private');
                setIncludePartner(false);
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
      </div>
    </div>
  );
};

export default EditEvent;
