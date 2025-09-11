import * as React from 'react';
import { format, parse } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type DatePickerProps = {
  id?: string;
  name?: string;
  value?: string; // expects 'yyyy-MM-dd'
  onChange: (value: string) => void; // emits 'yyyy-MM-dd'
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export const DatePicker: React.FC<DatePickerProps> = ({
  id,
  name,
  value,
  onChange,
  disabled,
  required,
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  const selectedDate: Date | undefined = value
    ? parse(value, 'yyyy-MM-dd', new Date())
    : undefined;

  const display = selectedDate ? format(selectedDate, 'MM/dd/yyyy') : 'Select date';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          name={name}
          aria-required={required}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] flex items-center justify-between',
            disabled && 'opacity-50 cursor-not-allowed',
            className,
          )}
        >
          <span>{display}</span>
          <CalendarIcon className="w-4 h-4 text-[hsl(var(--loom-text-muted))]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className={cn(
          'p-0 z-50 border border-[hsl(var(--loom-border))] shadow-md',
          'bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))]'
        )}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              const next = format(date, 'yyyy-MM-dd');
              onChange(next);
              setOpen(false);
            }
          }}
          className="bg-transparent"
          classNames={{
            // Make 'today' visibly distinct with a subtle outline
            day_today:
              'outline outline-2 outline-[hsl(var(--loom-primary))] text-[hsl(var(--loom-text))] rounded-md',
            // Ensure selected day uses the brand color clearly
            day_selected:
              'bg-[hsl(var(--loom-primary))] text-white hover:bg-[hsl(var(--loom-primary))] focus:bg-[hsl(var(--loom-primary))]',
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
