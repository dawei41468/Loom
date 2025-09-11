// Add Event/Proposal Page (moved from src/pages/Add.tsx)
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, addDays, addHours } from 'date-fns';
import { X, MapPin } from 'lucide-react';
// EventsContext no longer used for server-derived state
import { useAuthState, useAuthDispatch } from '../../contexts/AuthContext';
import { useToastContext } from '../../contexts/ToastContext';
import { apiClient } from '../../api/client';
// no direct TimePicker usage in this container after splitting forms
// import { TimePicker } from '../../components/forms/TimePicker';
// import { cn } from '@/lib/utils';
import { useTranslation } from '../../i18n';
// import { DatePicker } from '../../components/forms/DatePicker';
import TextInput from '../../components/forms/TextInput';
import TextArea from '../../components/forms/TextArea';
import SubmitButton from '../../components/forms/SubmitButton';
import { convertTimeToISO, computeEndFromStart } from '../../utils/datetime';
import { parseTitle, parseTime, parseDay } from '../../utils/nlp';
import { useProposalSlots } from './hooks/useProposalSlots';
import { submitEvent, submitProposal } from './submitters';
import { useQueryClient } from '@tanstack/react-query';
import EventForm from './EventForm';
import ProposalForm from './ProposalForm';

// TODO: In a subsequent step, extract NL parsing into src/utils/nlp.ts

type VisibilityType = 'shared' | 'private' | 'title_only';

const AddPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, partner } = useAuthState();
  const authDispatch = useAuthDispatch();
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
  const [includePartner, setIncludePartner] = useState(false);
  const [reminders, setReminders] = useState([10]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proposal: support multiple proposed time slots (minimal UX)
  const { proposalSlots, addProposalSlot, removeProposalSlot, updateProposalSlot, syncFirstSlot } = useProposalSlots({
    date,
    startTime,
    endTime,
  });

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

  // Ensure partner is loaded for proposal flow
  useEffect(() => {
    const loadPartnerIfNeeded = async () => {
      if (!isProposal) return;
      const validId = partner && /^[a-fA-F0-9]{24}$/.test(partner.id);
      if (!validId) {
        try {
          const resp = await apiClient.getPartner();
          if (resp?.data) {
            authDispatch({ type: 'SET_PARTNER', payload: resp.data });
          }
        } catch {
          // ignore
        }
      }
    };
    loadPartnerIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProposal]);

  // If no partner is connected, ensure visibility is Private (since Shared is not possible)
  useEffect(() => {
    if (!partner && visibility === 'shared') {
      setVisibility('private');
      setIncludePartner(false);
    }
  }, [partner, visibility]);

  // Natural language parsing via utils
  const parseNaturalLanguage = (input: string) => {
    const t = parseTitle(input);
    if (t) setTitle(t);

    const tm = parseTime(input);
    if (tm) {
      setStartTime(tm.startDisplay);
      setEndTime(tm.endDisplay);
    }

    const day = parseDay(input);
    if (day) setDate(day);

    // Keep first proposal slot in sync when proposing and exactly one slot exists
    if (isProposal) {
      syncFirstSlot(day ?? date, tm?.startDisplay ?? startTime, tm?.endDisplay ?? endTime);
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

  // Proposal slots helpers are provided by useProposalSlots

  const handleSubmit = async () => {
    if (isProposal && !partner) {
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
      let startDateTime = convertTimeToISO(startTime, date);
      let endDateTime = convertTimeToISO(endTime, date);
      const sCheck = Date.parse(startDateTime);
      const eCheck = Date.parse(endDateTime);
      if (!isNaN(sCheck) && !isNaN(eCheck) && eCheck <= sCheck) {
        const nextDay = format(addDays(new Date(date), 1), 'yyyy-MM-dd');
        endDateTime = convertTimeToISO(endTime, nextDay);
      }

      if (isProposal && partner) {
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
          const s1 = Date.parse(s.start_time);
          const s2 = Date.parse(s.end_time);
          return !isNaN(s1) && !isNaN(s2) && s2 <= s1;
        });
        if (bad) {
          addToast({ type: 'error', title: t('invalidTimeSlot'), description: `${t('endTimeMustBeAfterStartTime')} (${bad.start_time} – ${bad.end_time}).` });
          return;
        }
        if (!/^[a-fA-F0-9]{24}$/.test(partner.id)) {
          try {
            const resp = await apiClient.getPartner();
            if (resp?.data && /^[a-fA-F0-9]{24}$/.test(resp.data.id)) {
              authDispatch({ type: 'SET_PARTNER', payload: resp.data });
            } else {
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
          proposed_to: partner.id as string,
        };
        if (!proposalPayload.proposed_to) {
          console.error('Missing proposed_to. Partner state:', partner);
          addToast({ type: 'error', title: t('partnerNotReady'), description: t('couldNotDeterminePartnerIdReload') });
          return;
        }
        await submitProposal(proposalPayload, { apiClient, addToast, queryClient, t });
      } else {
        await submitEvent({
          title,
          description: description || undefined,
          start_time: startDateTime,
          end_time: endDateTime,
          location: location || undefined,
          visibility,
          attendees: includePartner && partner ? [user!.id, partner.id] : [user!.id],
          created_by: user!.id,
          reminders,
        }, { apiClient, addToast, queryClient, t });
      }

      navigate('/');
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
    <div className="min-h-screen bg-[hsl(var(--loom-bg))] safe-area-top">
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
          disabled={isSubmitting || !title.trim() || (isProposal && !partner)}
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
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('eventTitlePlaceholder')}
          />
        </div>

        {/* Date/Time, visibility, attendees, reminders (event mode) OR proposal slots (proposal mode) */}
        {!isProposal ? (
          <EventForm
            date={date}
            startTime={startTime}
            endTime={endTime}
            onDateChange={setDate}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            computeEndFromStart={computeEndFromStart}
            partnerDisplayName={partner?.display_name}
            partnerExists={!!partner}
            visibility={visibility}
            setVisibility={setVisibility}
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
            type="text"
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

      {/* Event-only sections (visibility, attendees, reminders) now rendered inside EventForm */}
    </div>
    </div>
  );
};

export default AddPage;
