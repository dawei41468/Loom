// Add Event/Proposal Page
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { format, addDays, addHours, setHours, setMinutes, parseISO } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { X, MapPin } from 'lucide-react';
import { useAuthState } from '../../contexts/AuthContext';
import { useToastContext } from '../../contexts/ToastContext';
import { apiClient } from '../../api/client';
import { useTranslation } from '../../i18n';
import TextInput from '../../components/forms/TextInput';
import TextArea from '../../components/forms/TextArea';
import SubmitButton from '../../components/forms/SubmitButton';
import { convertTimeToISO, computeEndFromStart } from '../../utils/datetime';
import { parseTitle, parseTime, parseDay } from '../../utils/nlp';
import { useProposalSlots } from './hooks/useProposalSlots';
import { submitProposal } from './submitters';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys, partnerQueries } from '../../api/queries';
import EventForm, { VisibilityType } from './EventForm';
import ProposalForm from './ProposalForm';

type AddNavState = {
  startTime?: string;
  endTime?: string;
};

const parsePrefillFromNavState = (state: unknown): { start: Date; end: Date } | null => {
  if (!state || typeof state !== 'object') return null;

  const s = state as AddNavState;
  if (!s.startTime) return null;

  const start = parseISO(s.startTime);
  if (isNaN(start.getTime())) return null;

  const endCandidate = s.endTime ? parseISO(s.endTime) : addHours(start, 1);
  const end = !isNaN(endCandidate.getTime()) && endCandidate.getTime() > start.getTime()
    ? endCandidate
    : addHours(start, 1);

  return { start, end };
};

const AddPage = () => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();
  const { t } = useTranslation();

  const isProposal = searchParams.get('type') === 'proposal';

  // Load partner via React Query for consistent availability
  const { data: partnerResponse } = useQuery({
    queryKey: queryKeys.partner,
    queryFn: partnerQueries.getPartner,
    enabled: !!user,
  });
  const partnerForDisplay = partnerResponse?.data || partner;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const initialPrefill = parsePrefillFromNavState(routerLocation.state);
  const [startDateTime, setStartDateTime] = useState(initialPrefill?.start ?? addHours(new Date(), 1));
  const [endDateTime, setEndDateTime] = useState(initialPrefill?.end ?? addHours(new Date(), 2));
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('shared');
  const [includePartner, setIncludePartner] = useState(false);
  const [reminders, setReminders] = useState([10]);
  // Track if user has manually interacted with visibility, to avoid overriding their choice
  const [userTouchedVisibility, setUserTouchedVisibility] = useState(false);
  // Track whether we auto-forced to private because partner was missing
  const [autoForcedToPrivate, setAutoForcedToPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proposal: support multiple proposed time slots (minimal UX)
  const { proposalSlots, addProposalSlot, removeProposalSlot, updateProposalSlot, syncFirstSlot } = useProposalSlots({
    date: format(startDateTime, 'yyyy-MM-dd'),
    startTime: format(startDateTime, 'h:mm a'),
    endTime: format(endDateTime, 'h:mm a'),
  });

  // Initialize from navigation state (calendar click prefill)
  useEffect(() => {
    const prefill = parsePrefillFromNavState(routerLocation.state);
    if (!prefill) return;

    setStartDateTime(prefill.start);
    setEndDateTime(prefill.end);

    if (isProposal) {
      syncFirstSlot(
        format(prefill.start, 'yyyy-MM-dd'),
        format(prefill.start, 'h:mm a'),
        format(prefill.end, 'h:mm a')
      );
    }
  }, [routerLocation.key, routerLocation.state, isProposal, syncFirstSlot]);

  // Proposal: optional message to partner
  const [proposalMessage, setProposalMessage] = useState('');

  // Natural language suggestions
  const [nlInput, setNlInput] = useState('');

  const reminderOptions = useMemo(() => [
    { value: 5, label: t('fiveMin') },
    { value: 10, label: t('tenMin') },
    { value: 15, label: t('fifteenMin') },
    { value: 30, label: t('thirtyMin') },
    { value: 60, label: t('oneHour') },
  ], [t]);

  // Initialize timezone from user preference if available
  useEffect(() => {
    if (user?.timezone) {
      setTimezone(user.timezone);
    }
  }, [user?.timezone]);

  // If no partner is connected, ensure visibility is Private (since Shared is not possible)
  useEffect(() => {
    if (!partnerForDisplay && visibility === 'shared') {
      setVisibility('private');
      setIncludePartner(false);
      setAutoForcedToPrivate(true);
    }
  }, [partnerForDisplay, visibility]);

  // UX refinement: if partner becomes available and user hasn't manually changed visibility,
  // restore visibility to 'shared' (it may have been auto-forced to 'private' earlier)
  useEffect(() => {
    if (partnerForDisplay && visibility === 'private' && !userTouchedVisibility && autoForcedToPrivate) {
      setVisibility('shared');
      setAutoForcedToPrivate(false);
    }
  }, [partnerForDisplay, visibility, userTouchedVisibility, autoForcedToPrivate]);

  // Wrap setter to record that user intentionally changed visibility
  const handleSetVisibility = (v: VisibilityType) => {
    setUserTouchedVisibility(true);
    setVisibility(v);
  };

  // Natural language parsing via utils
  const parseNaturalLanguage = (input: string) => {
    const t = parseTitle(input);
    if (t) setTitle(t);

    const tm = parseTime(input);
    const day = parseDay(input);

    if (tm || day) {
      const baseDate = day ? new Date(day) : new Date();
      let startDateTime: Date;
      let endDateTime: Date;

      if (tm) {
        // Parse start time from display string (e.g., "3:00 AM")
        const startParts = tm.startDisplay.split(' ');
        const startTimePart = startParts[0];
        const startAmpm = startParts[1]?.toLowerCase();
        const [startHourStr, startMinStr] = startTimePart.split(':');
        let startHour = parseInt(startHourStr, 10);
        const startMinute = parseInt(startMinStr, 10);

        if (startAmpm === 'pm' && startHour !== 12) startHour += 12;
        if (startAmpm === 'am' && startHour === 12) startHour = 0;

        if (isNaN(startHour) || isNaN(startMinute)) return;

        startDateTime = setHours(setMinutes(baseDate, startMinute), startHour);

        // Parse end time
        const endParts = tm.endDisplay.split(' ');
        const endTimePart = endParts[0];
        const endAmpm = endParts[1]?.toLowerCase();
        const [endHourStr, endMinStr] = endTimePart.split(':');
        let endHour = parseInt(endHourStr, 10);
        const endMinute = parseInt(endMinStr, 10);

        if (endAmpm === 'pm' && endHour !== 12) endHour += 12;
        if (endAmpm === 'am' && endHour === 12) endHour = 0;

        if (isNaN(endHour) || isNaN(endMinute)) return;

        endDateTime = setHours(setMinutes(baseDate, endMinute), endHour);
      } else {
        startDateTime = addHours(baseDate, 1);
        endDateTime = addHours(startDateTime, 1);
      }

      // Validate dates before setting
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) return;

      setStartDateTime(startDateTime);
      setEndDateTime(endDateTime);
    }

    // Keep first proposal slot in sync when proposing and exactly one slot exists
    if (isProposal && (tm || day)) {
      const baseDate = day ? new Date(day) : new Date();
      const startTimeStr = tm?.startDisplay ?? format(startDateTime, 'h:mm a');
      const endTimeStr = tm?.endDisplay ?? format(endDateTime, 'h:mm a');
      const dateStr = format(baseDate, 'yyyy-MM-dd');
      syncFirstSlot(dateStr, startTimeStr, endTimeStr);
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

  const createEventMutation = useMutation({
    mutationFn: apiClient.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      addToast({ type: 'success', title: t('eventCreated') });
      navigate('/');
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: t('failedToCreate'), description: err.message });
    },
  });

  const handleSubmit = async () => {
    if (isProposal && !partnerForDisplay) {
      addToast({
        type: 'error',
        title: t('unableToPropose'),
        description: t('pleaseConnectPartner'),
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
      if (isProposal && partnerForDisplay) {
        const times = proposalSlots.map((slot) => {
          const s = convertTimeToISO(slot.startTime, slot.date);
          let e = convertTimeToISO(slot.endTime, slot.date);
          const sNum = Date.parse(s);
          const eNum = Date.parse(e);
          if (!isNaN(sNum) && !isNaN(eNum) && eNum <= sNum) {
            const next = format(addDays(new Date(slot.date), 1), 'yyyy-MM-dd');
            e = convertTimeToISO(slot.endTime, next);
          }
          return { start_time: s, end_time: e };
        });

        if (!times.length) {
          addToast({ type: 'error', title: t('missingTime'), description: t('pleaseAddAtLeastOneSlot') });
          return;
        }
        const bad = times.find((s) => {
          const s1 = new Date(s.start_time).getTime();
          const s2 = new Date(s.end_time).getTime();
          return !isNaN(s1) && !isNaN(s2) && s2 <= s1;
        });
        if (bad) {
          addToast({ type: 'error', title: t('invalidTimeSlot'), description: `${t('endTimeMustBeAfterStartTime')} (${bad.start_time} – ${bad.end_time}).` });
          return;
        }
        if (!/^[a-fA-F0-9]{24}$/.test(partnerForDisplay.id)) {
          try {
            // Re-fetch partner via React Query in case of transient state
            await queryClient.invalidateQueries({ queryKey: queryKeys.partner });
            const refreshed = await partnerQueries.getPartner();
            if (!(refreshed?.data && /^[a-fA-F0-9]{24}$/.test(refreshed.data.id))) {
              addToast({ type: 'error', title: t('partnerNotReady'), description: t('reconnectPartnerTryAgain') });
              return;
            }
          } catch {
            addToast({ type: 'error', title: t('partnerNotReady'), description: t('reconnectPartnerTryAgain') });
            return;
          }
        }

        const proposalPayload = {
          title,
          description: description || undefined,
          message: proposalMessage || undefined,
          proposed_times: times,
          location: location || undefined,
          proposed_to: partnerForDisplay.id as string,
        };
        if (!proposalPayload.proposed_to) {
          console.error('Missing proposed_to. Partner state:', partnerForDisplay);
          addToast({ type: 'error', title: t('partnerNotReady'), description: t('couldNotDeterminePartnerIdReload') });
          return;
        }
        await submitProposal(proposalPayload, { apiClient, addToast, queryClient, t });
        navigate('/');
      } else {
        // Event Creation
        // Convert "Wall Clock" time + Timezone -> UTC
        const startUtc = fromZonedTime(startDateTime, timezone);
        const endUtc = fromZonedTime(endDateTime, timezone);

        const attendees: string[] = [];
        if (user?.id) attendees.push(user.id);
        if (visibility === 'shared' && includePartner && partnerForDisplay?.id) {
          attendees.push(partnerForDisplay.id);
        }

        await createEventMutation.mutateAsync({
          title,
          description: description || undefined,
          start_time: startUtc.toISOString(),
          end_time: endUtc.toISOString(),
          location: location || undefined,
          visibility,
          attendees,
          reminders,
          timezone,
          created_by: user!.id,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('pleaseTryAgain');
      addToast({
        type: 'error',
        title: isProposal ? t('failedToCreateProposal') : t('failedToCreateEvent'),
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--loom-bg))] safe-area-top pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[hsl(var(--loom-bg))] flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--loom-border))]">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-[hsl(var(--loom-border))] rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">
          {isProposal ? t('proposeTime') : t('addEvent')}
        </h1>
        <SubmitButton
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={isSubmitting || !title.trim() || (isProposal && !partnerForDisplay)}
          fullWidth={false}
          className="px-4 py-1.5"
        >
          {isProposal ? t('propose') : t('save')}
        </SubmitButton>
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
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('eventTitlePlaceholder')}
          />
        </div>

        {/* Date/Time, visibility, attendees, reminders (event mode) OR proposal slots (proposal mode) */}
        {!isProposal ? (
          <EventForm
            startDateTime={startDateTime}
            endDateTime={endDateTime}
            onStartDateTimeChange={setStartDateTime}
            onEndDateTimeChange={setEndDateTime}
            computeEndFromStart={computeEndFromStart}
            timezone={timezone}
            onTimezoneChange={setTimezone}
            partnerDisplayName={partnerForDisplay?.display_name}
            partnerExists={!!partnerForDisplay}
            visibility={visibility}
            setVisibility={handleSetVisibility}
            includePartner={includePartner}
            setIncludePartner={setIncludePartner}
            reminders={reminders}
            reminderOptions={reminderOptions}
            toggleReminder={toggleReminder}
            t={t}
          />
        ) : (
          <ProposalForm
            slots={proposalSlots}
            onAdd={() => addProposalSlot()}
            onRemove={removeProposalSlot}
            onUpdate={updateProposalSlot}
            computeEndFromStart={computeEndFromStart}
            t={t}
          />
        )}

        {/* Location */}
        <div className="loom-card">
          <div className="flex items-center space-x-2 mb-3">
            <MapPin className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
            <span className="font-medium">{t('whereSection')}</span>
          </div>
          <TextInput
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('addLocationPlaceholder')}
          />
        </div>

        {/* Description */}
        <div className="loom-card">
          <label className="block text-sm font-medium mb-2">{t('notesLabel')}</label>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('addNotesOrDetailsPlaceholder')}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default AddPage;
