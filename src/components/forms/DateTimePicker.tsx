import * as React from 'react';
import { format, addDays, subDays } from 'date-fns';

export type DateTimePickerProps = {
  id?: string;
  name?: string;
  value?: Date;
  onChange: (value: Date) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  mode: 'from' | 'to';
};

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  id,
  name,
  value,
  onChange,
  disabled,
  required,
  className,
  mode,
}) => {
  const [selectedDate, setSelectedDate] = React.useState(() => (value ? new Date(value) : new Date()));
  const [open, setOpen] = React.useState(false);

  // Accessibility identifiers
  const uid = React.useId();
  const base = id || mode || 'dtp';
  const dialogId = `${base}-${uid}-dialog`;
  const titleId = `${base}-${uid}-title`;

  // Keep internal state in sync with external value changes (without mutating existing Date)
  React.useEffect(() => {
    if (!value) return;
    setSelectedDate((prev) => (prev.getTime() === value.getTime() ? prev : new Date(value)));
  }, [value]);

  // Generate arrays for date/time selection
  const days = React.useMemo(() => {
    const today = new Date();
    return Array.from({ length: 365 }, (_, i) =>
      addDays(today, i - 182) // Center around today, +/- 6 months
    );
  }, []);

  const hours = React.useMemo(
    () => Array.from({ length: 24 }, (_, i) => i),
    []
  );
  const minutes = React.useMemo(
    () => Array.from({ length: 60 }, (_, i) => i),
    []
  );

  // Refs
  const dayRef = React.useRef<HTMLDivElement>(null);
  const hourRef = React.useRef<HTMLDivElement>(null);
  const minuteRef = React.useRef<HTMLDivElement>(null);

  // Adjustment flags
  const dayAdjusting = React.useRef(false);
  const hourAdjusting = React.useRef(false);
  const minuteAdjusting = React.useRef(false);

  // Visual center indices for highlighting only the middle row
  const [centerDayIndex, setCenterDayIndex] = React.useState(0);
  const [centerHourIndex, setCenterHourIndex] = React.useState(0);
  const [centerMinuteIndex, setCenterMinuteIndex] = React.useState(0);

  // Scroll handlers
  const handleDayScroll = React.useCallback(() => {
    if (dayAdjusting.current) return;
    if (!dayRef.current) return;

    const scrollTop = dayRef.current.scrollTop;
    const itemHeight = 48;
    const spacer = 48;
    const containerH = dayRef.current.clientHeight || 144;
    const index = Math.round((scrollTop + containerH / 2 - spacer - itemHeight / 2) / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, days.length - 1));

    // Simple selection logic - no infinite scroll complexity
    if (clampedIndex >= 0 && clampedIndex < days.length) {
      setCenterDayIndex(clampedIndex);

      // Calculate the difference between selected day and current day
      const selectedDay = days[clampedIndex];
      if (selectedDay) {
        const currentDate = selectedDate;
        const newDate = new Date(currentDate.getTime());
        newDate.setFullYear(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate());
        setSelectedDate(newDate);
        if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
          navigator.vibrate(10);
        }
      }
    }
  }, [selectedDate, days]);

  const handleHourScroll = React.useCallback(() => {
    if (hourAdjusting.current) return;
    if (!hourRef.current) return;

    const scrollTop = hourRef.current.scrollTop;
    const itemHeight = 48;
    const spacer = 48;
    const containerH = hourRef.current.clientHeight || 144;
    const index = Math.round((scrollTop + containerH / 2 - spacer - itemHeight / 2) / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, hours.length - 1));

    // Simple selection logic - just use the selected hour directly
    if (clampedIndex >= 0 && clampedIndex < hours.length) {
      setCenterHourIndex(clampedIndex);

      const newDate = new Date(selectedDate.getTime());
      newDate.setHours(clampedIndex, selectedDate.getMinutes(), 0, 0);
      setSelectedDate(newDate);
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(10);
      }
    }
  }, [selectedDate, hours]);

  const handleMinuteScroll = React.useCallback(() => {
    if (minuteAdjusting.current) return;
    if (!minuteRef.current) return;

    const scrollTop = minuteRef.current.scrollTop;
    const itemHeight = 48;
    const spacer = 48;
    const containerH = minuteRef.current.clientHeight || 144;
    const index = Math.round((scrollTop + containerH / 2 - spacer - itemHeight / 2) / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, minutes.length - 1));

    // Simple selection logic - just use the selected minute directly
    if (clampedIndex >= 0 && clampedIndex < minutes.length) {
      setCenterMinuteIndex(clampedIndex);

      const newDate = new Date(selectedDate.getTime());
      newDate.setMinutes(clampedIndex, 0, 0);
      setSelectedDate(newDate);
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(10);
      }
    }
  }, [selectedDate, minutes]);

  // Initial scroll
  React.useEffect(() => {
    if (open) {
      const dayIndex = days.findIndex(
        (d) =>
          d.getDate() === selectedDate.getDate() &&
          d.getMonth() === selectedDate.getMonth()
      );
      const itemH = 48;
      const scrollDayIndex = dayIndex !== -1 ? dayIndex : Math.floor(days.length / 2);
      if (dayRef.current) {
        dayRef.current.scrollTo({ top: scrollDayIndex * itemH, behavior: 'smooth' });
      }
      setCenterDayIndex(scrollDayIndex);

      const hourIndex = hours.indexOf(selectedDate.getHours());
      if (hourRef.current) {
        hourRef.current.scrollTo({ top: hourIndex * itemH, behavior: 'smooth' });
      }
      setCenterHourIndex(hourIndex);

      const minuteIndex = minutes.indexOf(selectedDate.getMinutes());
      if (minuteRef.current) {
        minuteRef.current.scrollTo({ top: minuteIndex * itemH, behavior: 'smooth' });
      }
      setCenterMinuteIndex(minuteIndex);

    }
  }, [open, days, hours, minutes, selectedDate]);

  // Debounced scroll listeners
  React.useEffect(() => {
    if (!open) return;

    let dayTimeout: number;
    let hourTimeout: number;
    let minuteTimeout: number;

    const handleDayScrollDebounced = () => {
      clearTimeout(dayTimeout);
      dayTimeout = setTimeout(handleDayScroll, 100);
    };

    const handleHourScrollDebounced = () => {
      clearTimeout(hourTimeout);
      hourTimeout = setTimeout(handleHourScroll, 100);
    };

    const handleMinuteScrollDebounced = () => {
      clearTimeout(minuteTimeout);
      minuteTimeout = setTimeout(handleMinuteScroll, 100);
    };

    const dayElement = dayRef.current;
    const hourElement = hourRef.current;
    const minuteElement = minuteRef.current;

    dayElement?.addEventListener('scroll', handleDayScrollDebounced, { passive: true });
    hourElement?.addEventListener('scroll', handleHourScrollDebounced, { passive: true });
    minuteElement?.addEventListener('scroll', handleMinuteScrollDebounced, { passive: true });

    return () => {
      dayElement?.removeEventListener('scroll', handleDayScrollDebounced);
      hourElement?.removeEventListener('scroll', handleHourScrollDebounced);
      minuteElement?.removeEventListener('scroll', handleMinuteScrollDebounced);
      clearTimeout(dayTimeout);
      clearTimeout(hourTimeout);
      clearTimeout(minuteTimeout);
    };
  }, [open, handleDayScroll, handleHourScroll, handleMinuteScroll]);

  const handleConfirm = () => {
    onChange(new Date(selectedDate.getTime()));
    setOpen(false);
  };

  const handleCancel = () => {
    setSelectedDate(value ? new Date(value) : new Date());
    setOpen(false);
  };

  const displayDate = format(selectedDate, 'EEE, MMM d, yyyy, h:mma');

  return (
    <div className={className}>
      <button
        type="button"
        id={id}
        name={name}
        aria-required={required}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`
          w-full flex items-center justify-between px-3 py-2 rounded-[var(--loom-radius-md)]
          border border-[hsl(var(--loom-border))]
          bg-[hsl(var(--loom-surface))]
          text-[hsl(var(--loom-text))]
          hover:bg-[hsl(var(--loom-surface-hover))]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="text-[hsl(var(--loom-text-muted))] text-sm">
          {displayDate.charAt(0).toUpperCase() + displayDate.slice(1)}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <div
        className={`fixed inset-0 z-[60] flex items-end justify-center p-6 transition-opacity duration-300 ease-out ${
          open ? 'bg-black/50 opacity-100' : 'bg-transparent opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`bg-[hsl(var(--loom-surface))] rounded-[var(--loom-radius-lg)] shadow-xl w-full max-w-sm flex flex-col transform transition-transform duration-300 ease-out ${
            open ? 'translate-y-0' : 'translate-y-full'
          }`}
          role="dialog"
          aria-modal={open}
          aria-labelledby={titleId}
          id={dialogId}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter') handleConfirm();
          }}
        >
            {/* Header */}
            <div className="py-3 text-center">
              <h3 id={titleId} className="text-base text-[hsl(var(--loom-text))]">
                {mode === 'from' ? 'From' : 'To'}
              </h3>
              <p className="text-xs text-[hsl(var(--loom-text-muted))]">
                {format(selectedDate, 'EEE, MMM d, yyyy').replace(/\b\w/g, (l) => l.toUpperCase())},{' '}
                {format(selectedDate, 'h:mma')}
              </p>
              {/* Live region for screen readers: announce current selection */}
              <p className="sr-only" aria-live="polite">
                {format(selectedDate, 'EEEE, MMMM d, yyyy h:mma')}
              </p>
            </div>

            {/* Wheel Picker */}
            <div className="py-1">
              <div className="flex justify-center">
                {/* Day Picker */}
                <div className="relative w-32 h-36 mr-4">
                  <div
                    ref={dayRef}
                    className="h-full overflow-y-scroll scrollbar-hide"
                    tabIndex={0}
                    role="listbox"
                    aria-label="Day"
                    style={{
                      scrollSnapType: 'y mandatory',
                      scrollBehavior: 'smooth',
                    }}
                  >
                    {/* Spacer */}
                    <div className="h-12"></div>
                    {days.map((day, index) => {
                      const isSelected = index === centerDayIndex;
                      return (
                        <div
                          key={index}
                          className={`h-12 flex items-center justify-center transform
                                      text-base scale-100 opacity-35 text-[hsl(var(--loom-text-muted))]
                                      transition-all duration-200 ease-out
                                      aria-selected:text-[hsl(var(--loom-primary))]
                                      aria-selected:opacity-100 aria-selected:scale-110 aria-selected:text-xl`}
                          style={{ scrollSnapAlign: 'center' }}
                          role="option"
                          aria-selected={isSelected}
                        >
                          {format(day, 'EEE, MMM d').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </div>
                      );
                    })}
                    {/* Spacer */}
                    <div className="h-12"></div>
                  </div>
                </div>

                {/* Hour Picker */}
                <div className="relative w-14 h-36">
                  <div
                    ref={hourRef}
                    className="h-full overflow-y-scroll scrollbar-hide"
                    tabIndex={0}
                    role="listbox"
                    aria-label="Hour"
                    style={{
                      scrollSnapType: 'y mandatory',
                      scrollBehavior: 'smooth',
                    }}
                  >
                    {/* Spacer */}
                    <div className="h-12"></div>
                    {hours.map((hour, index) => (
                      <div
                        key={index}
                        className={`h-12 flex items-center justify-center transform
                                    text-base scale-100 opacity-35 text-[hsl(var(--loom-text-muted))]
                                    transition-all duration-200 ease-out
                                    aria-selected:text-[hsl(var(--loom-primary))]
                                    aria-selected:opacity-100 aria-selected:scale-110 aria-selected:text-xl`}
                        style={{ scrollSnapAlign: 'center' }}
                        role="option"
                        aria-selected={index === centerHourIndex}
                      >
                        {hour.toString().padStart(2, '0')}
                      </div>
                    ))}
                    {/* Spacer */}
                    <div className="h-12"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="absolute text-[hsl(var(--loom-primary))] text-xs top-1/2 -translate-y-1/2 left-10 transform">
                      H
                    </div>
                  </div>
                </div>

                {/* Minute Picker */}
                <div className="relative w-14 h-36">
                  <div
                    ref={minuteRef}
                    className="h-full overflow-y-scroll scrollbar-hide"
                    tabIndex={0}
                    role="listbox"
                    aria-label="Minute"
                    style={{
                      scrollSnapType: 'y mandatory',
                      scrollBehavior: 'smooth',
                    }}
                  >
                    {/* Spacer */}
                    <div className="h-12"></div>
                    {minutes.map((minute, index) => (
                      <div
                        key={index}
                        className={`h-12 flex items-center justify-center transform
                                    text-base scale-100 opacity-35 text-[hsl(var(--loom-text-muted))]
                                    transition-all duration-200 ease-out
                                    aria-selected:text-[hsl(var(--loom-primary))]
                                    aria-selected:opacity-100 aria-selected:scale-110 aria-selected:text-xl`}
                        style={{ scrollSnapAlign: 'center' }}
                        role="option"
                        aria-selected={index === centerMinuteIndex}
                      >
                        {minute.toString().padStart(2, '0')}
                      </div>
                    ))}
                    {/* Spacer */}
                    <div className="h-12"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="absolute text-[hsl(var(--loom-primary))] text-xs top-1/2 -translate-y-1/2 left-10 transform">
                      M
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 pb-5 flex justify-center space-x-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-2 text-sm rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] hover:bg-[hsl(var(--loom-surface-hover))] flex-1 max-w-[120px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-3 py-2 text-sm rounded-[var(--loom-radius-md)] bg-[hsl(var(--loom-primary))] text-white hover:bg-[hsl(var(--loom-primary-dark))] flex-1 max-w-[120px]"
              >
                OK
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};