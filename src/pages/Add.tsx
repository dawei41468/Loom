// Add Event/Proposal Page
import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, addDays, addHours } from 'date-fns';
import { X, MapPin, Clock, Users, Bell, Calendar } from 'lucide-react';
import { useEventsActions } from '../contexts/EventsContext';
import { useAuthState } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { apiClient } from '../api/client';
import { TimePicker } from '../components/ui/TimePicker';
import { cn } from '@/lib/utils';
import { useTranslation } from '../i18n';

type VisibilityType = 'shared' | 'private' | 'title_only';

const Add = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addEvent, addProposal } = useEventsActions();
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();
  const { t } = useTranslation();

  const isProposal = searchParams.get('type') === 'proposal';

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(addHours(new Date(), 1), 'h:mm a'));
  const [endTime, setEndTime] = useState(format(addHours(new Date(), 2), 'h:mm a'));
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('shared');
  const [includePartner, setIncludePartner] = useState(true);
  const [reminders, setReminders] = useState([10]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proposal: support multiple proposed time slots (minimal UX)
  const [proposalSlots, setProposalSlots] = useState<{ date: string; startTime: string; endTime: string }[]>([
    { date, startTime, endTime },
  ]);

  // Proposal: optional message to partner
  const [proposalMessage, setProposalMessage] = useState('');

  // Natural language suggestions
  const [nlInput, setNlInput] = useState('');

  const reminderOptions = [
    { value: 5, label: t('fiveMin') },
    { value: 10, label: t('tenMin') },
    { value: 15, label: t('fifteenMin') },
    { value: 30, label: t('thirtyMin') },
    { value: 60, label: t('oneHour') },
  ];

  const parseNaturalLanguage = (input: string) => {
    // Simple NL parsing - in real app, would use more sophisticated parsing
    const titleMatch = input.match(/^([^,]+)/);
    if (titleMatch) {
      setTitle(titleMatch[1].trim());
    }

    // Look for time patterns
    const timeMatch = input.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();

      // Convert to 12-hour format for display
      let displayHour = hour;
      let displayAmpm = ampm || 'am';

      if (ampm === 'pm' && hour !== 12) {
        displayHour = hour;
        displayAmpm = 'pm';
      } else if (ampm === 'am' && hour === 12) {
        displayHour = 12;
        displayAmpm = 'am';
      } else if (!ampm) {
        // No AM/PM specified, assume current time context
        const now = new Date();
        const currentHour = now.getHours();
        if (hour < 12) {
          displayAmpm = currentHour >= 12 ? 'pm' : 'am';
        } else {
          displayHour = hour > 12 ? hour - 12 : hour;
          displayAmpm = hour >= 12 ? 'pm' : 'am';
        }
      }

      const timeString = `${displayHour}:${minute.toString().padStart(2, '0')} ${displayAmpm.toUpperCase()}`;
      setStartTime(timeString);

      // Set end time to 1 hour later
      let endHour = displayHour + 1;
      let endAmpm = displayAmpm;
      if (endHour > 12) {
        endHour = 1;
        endAmpm = displayAmpm === 'am' ? 'pm' : 'am';
      } else if (endHour === 12) {
        endAmpm = displayAmpm === 'am' ? 'pm' : 'am';
      }

      setEndTime(`${endHour}:${minute.toString().padStart(2, '0')} ${endAmpm.toUpperCase()}`);
    }

    // Look for day references
    if (input.toLowerCase().includes('tomorrow')) {
      setDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    } else if (input.toLowerCase().includes('friday') || input.toLowerCase().includes('fri')) {
      // Find next Friday - simplified
      const nextFriday = addDays(new Date(), (5 - new Date().getDay() + 7) % 7 || 7);
      setDate(format(nextFriday, 'yyyy-MM-dd'));
    }

    // Keep first proposal slot in sync when proposing (only when there's exactly 1 slot)
    if (isProposal && proposalSlots.length === 1) {
      setProposalSlots((prev) => {
        const first = prev[0] || { date, startTime, endTime };
        return [
          {
            date,
            startTime,
            endTime,
          },
          ...prev.slice(1),
        ];
      });
    }
  };

  const handleNLInputChange = (input: string) => {
    setNlInput(input);
    if (input.length > 5) {
      parseNaturalLanguage(input);
    }
  };

  const toggleReminder = (minutes: number) => {
    setReminders(prev => 
      prev.includes(minutes)
        ? prev.filter(r => r !== minutes)
        : [...prev, minutes].sort((a, b) => a - b)
    );
  };

  // Proposal slots helpers
  const addProposalSlot = () => {
    setProposalSlots((prev) => [
      ...prev,
      {
        date,
        startTime,
        endTime,
      },
    ]);
  };

  const removeProposalSlot = (index: number) => {
    setProposalSlots((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateProposalSlot = (
    index: number,
    updates: Partial<{ date: string; startTime: string; endTime: string }>
  ) => {
    setProposalSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...updates } : slot)));
  };

  // Helper function to convert TimePicker format to ISO datetime
  const convertTimeToISO = (timeString: string, dateString: string) => {
    // Accept formats: "2:14 PM", "2:14pm", "14:14", "2 PM", "2pm"
    const trimmed = (timeString || '').trim();
    // 1) h:mm AM/PM (with or without space, case-insensitive)
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
      return new Date(`${dateString}T${time24}`).toISOString();
    }
    // 2) 24h format: H:mm or H
    m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (m) {
      const hour = Math.min(23, parseInt(m[1], 10));
      const minute = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
      const time24 = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      return new Date(`${dateString}T${time24}`).toISOString();
    }
    // Fallback noon
    return new Date(`${dateString}T12:00:00`).toISOString();
  };

  // Compute end time string (display format like "h:mm AM/PM") that is 1 hour after the given start time string
  const computeEndFromStart = (timeString: string): string => {
    const trimmed = (timeString || '').trim();

    // Try AM/PM first
    let m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (m) {
      let hour12 = parseInt(m[1], 10);
      const minute = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
      const ampm = m[3].toUpperCase();
      // to 24h
      let hour24 = hour12 % 12;
      if (ampm === 'PM') hour24 += 12;
      // add 1 hour
      hour24 = (hour24 + 1) % 24;
      // back to 12h
      const displayHour = (hour24 % 12) === 0 ? 12 : (hour24 % 12);
      const displayAmpm = hour24 >= 12 ? 'PM' : 'AM';
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${displayAmpm}`;
    }

    // Fallback: 24h input like "14:05" or "14"
    m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (m) {
      let hour24 = Math.min(23, parseInt(m[1], 10));
      const minute = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
      hour24 = (hour24 + 1) % 24;
      const displayHour = (hour24 % 12) === 0 ? 12 : (hour24 % 12);
      const displayAmpm = hour24 >= 12 ? 'PM' : 'AM';
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${displayAmpm}`;
    }

    // Default to +1h from 12:00 PM => 1:00 PM
    return '1:00 PM';
  };

  const handleSubmit = async () => {
    // Guard: if proposing but no partner connected, prevent accidental event creation
    if (isProposal && !partner) {
      addToast({
        type: 'error',
        title: 'Unable to propose',
        description: 'Please connect a partner before sending a proposal.',
      });
      return;
    }
    if (!title.trim()) {
      addToast({
        type: 'error',
        title: t('titleRequired'),
        description: t('enterTitleForEvent'),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateTime = convertTimeToISO(startTime, date);
      const endDateTime = convertTimeToISO(endTime, date);

      if (isProposal && partner) {
        // Create proposal
        const times = proposalSlots.map((slot) => ({
          start_time: convertTimeToISO(slot.startTime, slot.date),
          end_time: convertTimeToISO(slot.endTime, slot.date),
        }));

        const proposal = await apiClient.createProposal({
          title,
          description: description || undefined,
          message: proposalMessage || undefined,
          proposed_times: times,
          location: location || undefined,
          proposed_to: partner.id,
        });

        addProposal(proposal.data);
        addToast({
          type: 'success',
          title: t('proposalSent'),
          description: `${t('sent')} "${title}" to ${partner.display_name}`,
        });
      } else {
        // Create event
        const event = await apiClient.createEvent({
          title,
          description: description || undefined,
          start_time: startDateTime,
          end_time: endDateTime,
          location: location || undefined,
          visibility,
          attendees: includePartner && partner ? [user!.id, partner.id] : [user!.id],
          created_by: user!.id,
          reminders,
        });

        addEvent(event.data);
        addToast({
          type: 'success',
          title: t('eventCreated'),
          description: `"${title}" ${t('addedToCalendar')}`,
        });
      }

      navigate('/');
    } catch (error) {
      addToast({
        type: 'error',
        title: t('failedToCreateEvent'),
        description: t('pleaseTryAgain'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-lg font-semibold">
          {isProposal ? t('proposeTime') : t('addEvent')}
        </h1>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim() || (isProposal && !partner)}
          className="loom-btn-primary px-6 disabled:opacity-50"
        >
          {isSubmitting ? t('saving') : isProposal ? t('propose') : t('save')}
        </button>
      </div>

      <div className="container py-6 space-y-6">
        {/* Natural Language Input */}
        <div className="loom-card">
          <label className="block text-sm font-medium mb-2">{t('quickAdd')}</label>
          <input
            type="text"
            value={nlInput}
            onChange={(e) => handleNLInputChange(e.target.value)}
            placeholder={t('exampleNaturalLanguage')}
            className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
          />
          <p className="text-xs text-[hsl(var(--loom-text-muted))] mt-2">
            {t('naturalLanguageHelper')}
          </p>
        </div>

        {/* Title */}
        <div className="loom-card">
          <label className="block text-sm font-medium mb-2">{t('titleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('eventTitlePlaceholder')}
            className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
          />
        </div>

        {/* Date & Time */}
        <div className="loom-card">
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
            <span className="font-medium">{t('whenSection')}</span>
          </div>

          {!isProposal ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">{t('dateLabel')}</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] opacity-0 absolute inset-0 z-10 cursor-pointer"
                  />
                  <div className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] flex items-center justify-between">
                    <span>{format(new Date(date), 'MM/dd/yyyy')}</span>
                    <Calendar className="w-4 h-4 text-[hsl(var(--loom-text-muted))]" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <TimePicker
                    label={t('startTimeLabel')}
                    value={startTime}
                    onChange={(val) => {
                      setStartTime(val);
                      setEndTime(computeEndFromStart(val));
                    }}
                  />
                </div>
                <div>
                  <TimePicker
                    label={t('endTimeLabel')}
                    value={endTime}
                    onChange={setEndTime}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {proposalSlots.map((slot, idx) => (
                <div key={idx} className="space-y-3 border border-[hsl(var(--loom-border))] rounded-[var(--loom-radius-md)] p-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">{t('dateLabel')} #{idx + 1}</label>
                    {proposalSlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProposalSlot(idx)}
                        className="text-xs text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))]"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={slot.date}
                      onChange={(e) => updateProposalSlot(idx, { date: e.target.value })}
                      className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] opacity-0 absolute inset-0 z-10 cursor-pointer"
                    />
                    <div className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] flex items-center justify-between">
                      <span>{format(new Date(slot.date), 'MM/dd/yyyy')}</span>
                      <Calendar className="w-4 h-4 text-[hsl(var(--loom-text-muted))]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <TimePicker
                        label={t('startTimeLabel')}
                        value={slot.startTime}
                        onChange={(val) =>
                          updateProposalSlot(idx, {
                            startTime: val,
                            endTime: computeEndFromStart(val),
                          })
                        }
                      />
                    </div>
                    <div>
                      <TimePicker
                        label={t('endTimeLabel')}
                        value={slot.endTime}
                        onChange={(val) => updateProposalSlot(idx, { endTime: val })}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div>
                <button
                  type="button"
                  onClick={addProposalSlot}
                  className="loom-chip border border-[hsl(var(--loom-border))]"
                >
                  + Add another time
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="loom-card">
          <div className="flex items-center space-x-2 mb-3">
            <MapPin className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
            <span className="font-medium">{t('whereSection')}</span>
          </div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('addLocationPlaceholder')}
            className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
          />
        </div>

        {/* Description */}
        <div className="loom-card">
          <label className="block text-sm font-medium mb-2">{t('notesLabel')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('addNotesOrDetailsPlaceholder')}
            rows={3}
            className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] resize-none"
          />
        </div>

        {/* Proposal message (only for proposals) */}
        {isProposal && (
          <div className="loom-card">
            <label className="block text-sm font-medium mb-2">Message to partner (optional)</label>
            <textarea
              value={proposalMessage}
              onChange={(e) => setProposalMessage(e.target.value)}
              placeholder="Share context or a note with your proposal"
              rows={2}
              className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] resize-none"
            />
          </div>
        )}

        {!isProposal && (
          <>
            {/* Visibility */}
            <div className="loom-card">
              <label className="block text-sm font-medium mb-3">{t('visibilitySection')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'shared', label: t('sharedVisibility') },
                  { value: 'private', label: t('privateVisibility') },
                  { value: 'title_only', label: t('titleOnlyVisibility') },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setVisibility(value as VisibilityType)}
                    className={cn(
                      'loom-chip text-center',
                      visibility === value
                        ? 'loom-chip-shared'
                        : 'bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text-muted))]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Attendees */}
            {partner && (
              <div className="loom-card">
                <div className="flex items-center space-x-2 mb-3">
                  <Users className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
                  <span className="font-medium">{t('attendeesSection')}</span>
                </div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includePartner}
                    onChange={(e) => setIncludePartner(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-[hsl(var(--loom-border))] text-[hsl(var(--loom-primary))] focus:ring-[hsl(var(--loom-primary))]"
                  />
                  <span>{t('includePartnerLabel').replace('{partnerName}', partner.display_name)}</span>
                </label>
              </div>
            )}

            {/* Reminders */}
            <div className="loom-card">
              <div className="flex items-center space-x-2 mb-3">
                <Bell className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
                <span className="font-medium">{t('remindersSection')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {reminderOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleReminder(value)}
                    className={cn(
                      'loom-chip',
                      reminders.includes(value)
                        ? 'loom-chip-shared'
                        : 'bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text-muted))]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Add;