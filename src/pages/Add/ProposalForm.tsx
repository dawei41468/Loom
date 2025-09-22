import * as React from 'react';
import { DateTimePicker } from '../../components/forms/DateTimePicker';

export type ProposalSlot = { date: string; startTime: string; endTime: string };

interface Props {
  slots: ProposalSlot[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<ProposalSlot>) => void;
  computeEndFromStart: (dt: Date) => Date;
  t: (key: string) => string;
}

const ProposalForm: React.FC<Props> = ({
  slots,
  onAdd,
  onRemove,
  onUpdate,
  computeEndFromStart,
  t,
}) => {
  return (
    <div className="loom-card">
      <div className="space-y-4">
        {slots.map((slot, idx) => (
          <div key={idx} className="space-y-3 border border-[hsl(var(--loom-border))] rounded-[var(--loom-radius-md)] p-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">{t('dateLabel')} #{idx + 1}</label>
              {slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="text-xs text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))]"
                >
                  {t('remove')}
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">From</label>
              <DateTimePicker
                mode="from"
                value={(() => {
                  try {
                    // Parse the existing date and time strings into a Date object
                    const dateTimeStr = `${slot.date} ${slot.startTime}`;
                    return new Date(dateTimeStr);
                  } catch {
                    return new Date();
                  }
                })()}
                onChange={(val) => {
                  const dateStr = val.toISOString().split('T')[0];
                  const timeStr = val.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  const endDateTime = computeEndFromStart(val);
                  const endTimeStr = endDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  onUpdate(idx, { date: dateStr, startTime: timeStr, endTime: endTimeStr });
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To</label>
              <DateTimePicker
                mode="to"
                value={(() => {
                  try {
                    // Parse the existing date and time strings into a Date object
                    const dateTimeStr = `${slot.date} ${slot.endTime}`;
                    return new Date(dateTimeStr);
                  } catch {
                    return new Date();
                  }
                })()}
                onChange={(val) => {
                  const timeStr = val.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  onUpdate(idx, { endTime: timeStr });
                }}
              />
            </div>
          </div>
        ))}
        <div>
          <button type="button" onClick={onAdd} className="loom-chip border border-[hsl(var(--loom-border))]">
            {t('addAnotherTime')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalForm;
