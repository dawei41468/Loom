import * as React from 'react';
import { Clock, Users, Bell } from 'lucide-react';
import { DatePicker } from '../../components/forms/DatePicker';
import { TimePicker } from '../../components/forms/TimePicker';
import { cn } from '@/lib/utils';

export type VisibilityType = 'shared' | 'private' | 'title_only';

interface ReminderOption {
  value: number;
  label: string;
}

interface Props {
  // date & time
  date: string;
  startTime: string;
  endTime: string;
  onDateChange: (d: string) => void;
  onStartTimeChange: (t: string) => void;
  onEndTimeChange: (t: string) => void;
  computeEndFromStart: (t: string) => string;

  // visibility & attendees
  partnerDisplayName?: string;
  partnerExists: boolean;
  visibility: VisibilityType;
  setVisibility: (v: VisibilityType) => void;
  includePartner: boolean;
  setIncludePartner: (b: boolean) => void;

  // reminders
  reminders: number[];
  reminderOptions: ReminderOption[];
  toggleReminder: (minutes: number) => void;

  // i18n
  t: (key: string) => string;
}

const EventForm: React.FC<Props> = ({
  date,
  startTime,
  endTime,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  computeEndFromStart,
  partnerDisplayName,
  partnerExists,
  visibility,
  setVisibility,
  includePartner,
  setIncludePartner,
  reminders,
  reminderOptions,
  toggleReminder,
  t,
}) => {
  return (
    <>
      {/* Date & Time */}
      <div className="loom-card">
        <div className="flex items-center space-x-2 mb-3">
          <Clock className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
          <span className="font-medium">{t('whenSection')}</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">{t('dateLabel')}</label>
            <DatePicker value={date} onChange={onDateChange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TimePicker
              label={t('startTimeLabel')}
              value={startTime}
              onChange={(val) => {
                onStartTimeChange(val);
                onEndTimeChange(computeEndFromStart(val));
              }}
            />
            <TimePicker label={t('endTimeLabel')} value={endTime} onChange={onEndTimeChange} />
          </div>
        </div>
      </div>

      {/* Visibility */}
      <div className="loom-card">
        <label className="block text-sm font-medium mb-3">{t('visibilitySection')}</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (!partnerExists) return;
              setVisibility('shared');
            }}
            disabled={!partnerExists}
            className={cn(
              'loom-chip text-center',
              visibility === 'shared'
                ? 'loom-chip-shared'
                : 'bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text-muted))]',
              !partnerExists && 'opacity-60 cursor-not-allowed'
            )}
            title={!partnerExists ? 'Connect a partner to share events' : undefined}
          >
            {t('sharedVisibility')}
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
            {t('privateVisibility')}
          </button>
        </div>
      </div>

      {/* Attendees (only when shared) */}
      {partnerExists && visibility === 'shared' && (
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
            <span>
              {t('includePartnerLabel').replace('{partnerName}', partnerDisplayName || 'Partner')} (attending)
            </span>
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
                (reminders || []).includes(value)
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
  );
};

export default EventForm;
