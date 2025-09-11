import * as React from 'react';
import { DatePicker } from '../../components/forms/DatePicker';
import { TimePicker } from '../../components/forms/TimePicker';

export type ProposalSlot = { date: string; startTime: string; endTime: string };

interface Props {
  slots: ProposalSlot[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<ProposalSlot>) => void;
  computeEndFromStart: (t: string) => string;
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
            <DatePicker value={slot.date} onChange={(val) => onUpdate(idx, { date: val })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TimePicker
                label={t('startTimeLabel')}
                value={slot.startTime}
                onChange={(val) =>
                  onUpdate(idx, { startTime: val, endTime: computeEndFromStart(val) })
                }
              />
              <TimePicker
                label={t('endTimeLabel')}
                value={slot.endTime}
                onChange={(val) => onUpdate(idx, { endTime: val })}
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
