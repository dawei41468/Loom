import React, { useRef, useEffect, useState, forwardRef } from "react";
import { Clock } from 'lucide-react';

// Generate arrays for hours, minutes, and periods
const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const periods = ["AM", "PM"];

// Utility function to validate and format time
const formatTimeString = (hour: string, minute: string, period: string): string => {
  const h = parseInt(hour) || 1;
  const m = parseInt(minute) || 0;
  const p = period || 'AM';

  // Ensure valid ranges
  const validHour = Math.max(1, Math.min(12, h));
  const validMinute = Math.max(0, Math.min(59, m));

  return `${validHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')} ${p}`;
};

export interface TimePickerProps {
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (time: string) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  defaultOpen?: boolean;
  className?: string;
  use24HourFormat?: boolean;
}

export const TimePicker = forwardRef<HTMLDivElement, TimePickerProps>(
  ({ label, defaultValue, value, onChange, onOpenChange, open, defaultOpen, className, use24HourFormat = false }, ref) => {
    const [isOpen, setIsOpen] = useState(defaultOpen || false);
    const [selectedHour, setSelectedHour] = useState("09");
    const [selectedMinute, setSelectedMinute] = useState("00");
    const [selectedPeriod, setSelectedPeriod] = useState("AM");
    const [isInitialized, setIsInitialized] = useState(false);

    const hoursRef = useRef<HTMLDivElement>(null);
    const minutesRef = useRef<HTMLDivElement>(null);
    const periodsRef = useRef<HTMLDivElement>(null);

    // Parse initial value if provided or set based on context
    useEffect(() => {
      if (!isInitialized) {
        if (value || defaultValue) {
          const val = value || defaultValue || "09:00 AM";
          const match = val.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
          if (match) {
            let hour = parseInt(match[1]);
            let minute = parseInt(match[2]);
            const period = match[3].toUpperCase();

            // Ensure valid ranges
            if (hour < 1) hour = 1;
            if (hour > 12) hour = 12;
            if (minute < 0) minute = 0;
            if (minute > 59) minute = 59;

            setSelectedHour(hour.toString().padStart(2, '0'));
            setSelectedMinute(minute.toString().padStart(2, '0'));
            setSelectedPeriod(period);
          }
        }
        // No context-specific defaults needed for Loom
        setIsInitialized(true);
      }
    }, [value, defaultValue, isInitialized]);

    // Keep internal state in sync when external `value` changes after initialization
    useEffect(() => {
      if (!value) return;
      // Only proceed if component already initialized; otherwise initial effect handles it
      if (!isInitialized) return;
      const match = value.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
      if (match) {
        let hour = parseInt(match[1]);
        let minute = parseInt(match[2]);
        const period = match[3].toUpperCase();

        // Clamp ranges
        if (hour < 1) hour = 1;
        if (hour > 12) hour = 12;
        if (minute < 0) minute = 0;
        if (minute > 59) minute = 59;

        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');

        // Only update if different to avoid unnecessary re-renders
        if (h !== selectedHour) setSelectedHour(h);
        if (m !== selectedMinute) setSelectedMinute(m);
        if (period !== selectedPeriod) setSelectedPeriod(period);
      }
    }, [value, isInitialized, selectedHour, selectedMinute, selectedPeriod]);

    // Cleanup for HMR compatibility - reset initialization on unmount
    useEffect(() => {
      return () => {
        setIsInitialized(false);
      };
    }, []);

    // Ensure selected values are always valid
    useEffect(() => {
      const hour = parseInt(selectedHour);
      const minute = parseInt(selectedMinute);

      let needsUpdate = false;
      let newHour = selectedHour;
      let newMinute = selectedMinute;
      let newPeriod = selectedPeriod;

      if (isNaN(hour) || hour < 1 || hour > 12) {
        newHour = "09";
        needsUpdate = true;
      }
      if (isNaN(minute) || minute < 0 || minute > 59) {
        newMinute = "00";
        needsUpdate = true;
      }
      if (!periods.includes(selectedPeriod)) {
        newPeriod = "AM";
        needsUpdate = true;
      }

      // Only update if we actually need to change something
      if (needsUpdate) {
        setSelectedHour(newHour);
        setSelectedMinute(newMinute);
        setSelectedPeriod(newPeriod);
      }
    }, [selectedHour, selectedMinute, selectedPeriod]);

    // Handle controlled open state
    useEffect(() => {
      if (open !== undefined) {
        setIsOpen(open);
      }
    }, [open]);

    // Handle open state change
    const handleOpenChange = (newOpen: boolean) => {
      setIsOpen(newOpen);
      onOpenChange?.(newOpen);
    };

    // Scroll to the correct position on initial render
    useEffect(() => {
      if (isOpen) {
        scrollToSelected();
      }
    }, [isOpen]);

    // Scroll each column to the selected value
    const scrollToSelected = () => {
      setTimeout(() => {
        if (hoursRef.current) {
          const hourIndex = hours.indexOf(selectedHour);
          if (hourIndex !== -1) {
            hoursRef.current.scrollTop = hourIndex * 40;
          }
        }

        if (minutesRef.current) {
          const minuteIndex = minutes.indexOf(selectedMinute);
          if (minuteIndex !== -1) {
            minutesRef.current.scrollTop = minuteIndex * 40;
          }
        }

        if (periodsRef.current) {
          const periodIndex = periods.indexOf(selectedPeriod);
          if (periodIndex !== -1) {
            periodsRef.current.scrollTop = periodIndex * 40;
          }
        }
      }, 50);
    };

    // Handle scroll end for each column
    const handleScrollEnd = (
      ref: React.RefObject<HTMLDivElement | null>,
      values: string[],
      setter: (value: string) => void
    ) => {
      if (!ref.current) return;

      const scrollPosition = ref.current.scrollTop;
      const itemHeight = 40;
      const index = Math.round(scrollPosition / itemHeight);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));

      // Snap to the nearest item
      ref.current.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: "smooth",
      });

      // Update the selected value
      setter(values[clampedIndex]);
    };

    // Add scroll event listeners with debounce
    useEffect(() => {
      const addScrollListener = (
        ref: React.RefObject<HTMLDivElement | null>,
        values: string[],
        setter: (value: string) => void
      ) => {
        if (!ref.current) return;

        let scrollTimeout: number;

        const handleScroll = () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            handleScrollEnd(ref, values, setter);
          }, 150);
        };

        ref.current.addEventListener("scroll", handleScroll);

        return () => {
          ref.current?.removeEventListener("scroll", handleScroll);
          clearTimeout(scrollTimeout);
        };
      };

      const removeHoursListener = addScrollListener(hoursRef, hours, setSelectedHour);
      const removeMinutesListener = addScrollListener(minutesRef, minutes, setSelectedMinute);
      const removePeriodsListener = addScrollListener(periodsRef, periods, setSelectedPeriod);

      return () => {
        removeHoursListener?.();
        removeMinutesListener?.();
        removePeriodsListener?.();
      };
    }, [isOpen]);

    // Handle touch events for better mobile experience
    const addTouchHandlers = (
      ref: React.RefObject<HTMLDivElement | null>,
      values: string[],
      setter: (value: string) => void
    ) => {
      if (!ref.current) return;

      let startY = 0;
      let startScrollTop = 0;
      let momentum = 0;
      let animationFrame: number;

      const handleTouchStart = (e: TouchEvent) => {
        startY = e.touches[0].clientY;
        startScrollTop = ref.current?.scrollTop || 0;
        momentum = 0;
        cancelAnimationFrame(animationFrame);
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!ref.current) return;
        const y = e.touches[0].clientY;
        const diff = startY - y;
        momentum = diff * 0.1;
        ref.current.scrollTop = startScrollTop + diff;
      };

      const handleTouchEnd = () => {
        if (!ref.current) return;

        const momentumScroll = () => {
          if (!ref.current || Math.abs(momentum) < 0.5) {
            handleScrollEnd(ref, values, setter);
            return;
          }

          momentum *= 0.95;
          if (ref.current) {
            ref.current.scrollTop += momentum;
          }

          animationFrame = requestAnimationFrame(momentumScroll);
        };

        animationFrame = requestAnimationFrame(momentumScroll);
      };

      ref.current.addEventListener("touchstart", handleTouchStart, { passive: true });
      ref.current.addEventListener("touchmove", handleTouchMove, { passive: true });
      ref.current.addEventListener("touchend", handleTouchEnd);

      return () => {
        ref.current?.removeEventListener("touchstart", handleTouchStart);
        ref.current?.removeEventListener("touchmove", handleTouchMove);
        ref.current?.removeEventListener("touchend", handleTouchEnd);
        cancelAnimationFrame(animationFrame);
      };
    };

    // Add touch handlers when modal is open
    useEffect(() => {
      if (!isOpen) return;

      const removeHoursTouchHandlers = addTouchHandlers(hoursRef, hours, setSelectedHour);
      const removeMinutesTouchHandlers = addTouchHandlers(minutesRef, minutes, setSelectedMinute);
      const removePeriodsTouchHandlers = addTouchHandlers(periodsRef, periods, setSelectedPeriod);

      return () => {
        removeHoursTouchHandlers?.();
        removeMinutesTouchHandlers?.();
        removePeriodsTouchHandlers?.();
      };
    }, [isOpen]);

    // Helper to get current selection based on scroll positions (to avoid waiting for debounce)
    const getCurrentSelection = () => {
      const itemHeight = 40;
      // Hours
      let hour = selectedHour;
      if (hoursRef.current) {
        const idx = Math.round(hoursRef.current.scrollTop / itemHeight);
        const clamped = Math.max(0, Math.min(idx, hours.length - 1));
        hour = hours[clamped];
      }
      // Minutes
      let minute = selectedMinute;
      if (minutesRef.current) {
        const idx = Math.round(minutesRef.current.scrollTop / itemHeight);
        const clamped = Math.max(0, Math.min(idx, minutes.length - 1));
        minute = minutes[clamped];
      }
      // Period
      let period = selectedPeriod;
      if (!use24HourFormat && periodsRef.current) {
        const idx = Math.round(periodsRef.current.scrollTop / itemHeight);
        const clamped = Math.max(0, Math.min(idx, periods.length - 1));
        period = periods[clamped];
      }
      return { hour, minute, period };
    };

    // Handle done button click
    const handleDone = () => {
      const { hour, minute, period } = getCurrentSelection();
      const formattedTime = formatTimeString(hour, minute, period);
      // Update internal state so header reflects what was confirmed
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedPeriod(period);
      onChange?.(formattedTime);
      handleOpenChange(false);
    };

    return (
      <div className={`relative ${className || ''}`} key={`timepicker-${label}`}>
        <label className="block text-sm font-medium text-[hsl(var(--loom-text))] mb-1">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center border border-[hsl(var(--loom-border))] rounded-[var(--loom-radius-md)] px-3 py-2 bg-[hsl(var(--loom-surface))] w-full">
            <input
              value={selectedHour}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '');
                const maxHour = use24HourFormat ? 23 : 12;
                if (value.length > 2) value = value.slice(0, 2);
                if (Number(value) > maxHour) value = maxHour.toString();
                if (Number(value) < 1 && !use24HourFormat) value = '1'; // Minimum 1 for 12-hour format
                setSelectedHour(value.padStart(2, '0'));
              }}
              className="w-8 text-center outline-none bg-transparent text-[hsl(var(--loom-text))]"
              maxLength={2}
              inputMode="numeric"
              type="text"
            />
            <span className="text-[hsl(var(--loom-text-muted))]">:</span>
            <input
              value={selectedMinute}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 2) value = value.slice(0, 2);
                if (Number(value) > 59) value = '59';
                setSelectedMinute(value.padStart(2, '0'));
              }}
              className="w-8 text-center outline-none bg-transparent text-[hsl(var(--loom-text))]"
              maxLength={2}
              inputMode="numeric"
              type="text"
            />
            {!use24HourFormat && (
              <span className="ml-2 px-2 py-1 text-sm bg-[hsl(var(--loom-primary-light))] text-[hsl(var(--loom-primary))] rounded-[var(--loom-radius-sm)]">
                {selectedPeriod}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleOpenChange(!isOpen)}
              className="ml-auto p-1 text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-primary))] transition-colors"
            >
              <Clock className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isOpen && (
          <div
            ref={ref}
            className="absolute z-10 mt-1 w-full max-w-full loom-timepicker shadow-[var(--loom-shadow-xl)] overflow-hidden"
            style={{ backgroundColor: 'hsl(var(--loom-surface))' }}
          >
            <div className="relative py-2 px-0">
              {/* Loom-style blur overlays */}
              <div className="absolute top-0 left-0 right-0 h-[80px] loom-blur-top"></div>
              <div className="absolute bottom-0 left-0 right-0 h-[80px] loom-blur-bottom"></div>

              <div className="flex items-center justify-center relative z-10 space-x-2 px-2">
                {/* Hours Column */}
                <div className="relative w-24 h-[120px] overflow-hidden">
                    <div
                      ref={hoursRef}
                      className="absolute inset-0 overflow-y-auto scroll-smooth scrollbar-hide"
                      style={{
                        msOverflowStyle: "none",
                        scrollbarWidth: "none",
                        scrollSnapType: "y mandatory",
                        overscrollBehaviorY: "contain",
                        scrollBehavior: "smooth"
                      }}
                    >
                      <div className="h-[40px]" /> {/* Top spacing */}

                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="h-[40px] flex items-center justify-center scroll-snap-align-center"
                        data-value={hour}
                      >
                        <div className={`text-2xl font-light transition-all duration-200 ${hour === selectedHour ? 'loom-text-accent font-medium scale-110' : 'loom-text-primary opacity-50'}`}>{hour.toString().padStart(2, '0')}</div>
                      </div>
                    ))}

                    <div className="h-[40px]" /> {/* Bottom spacing */}
                  </div>
                </div>

                {/* Colon */}
                <div className="text-2xl font-medium text-[hsl(var(--loom-text-muted))]">:</div>

                {/* Minutes Column */}
                <div className="relative w-16 h-[160px] overflow-hidden">
                  <div
                    ref={minutesRef}
                    className="absolute inset-0 overflow-y-auto scroll-smooth scrollbar-hide"
                    style={{
                      msOverflowStyle: "none",
                      scrollbarWidth: "none",
                      scrollSnapType: "y mandatory",
                      overscrollBehaviorY: "contain",
                      scrollBehavior: "smooth"
                    }}
                  >
                    <div className="h-[60px]"></div> {/* Top spacing */}

                    {minutes.map((minute) => (
                      <div
                        key={minute}
                        className="h-[40px] flex items-center justify-center scroll-snap-align-center"
                        data-value={minute}
                      >
                        <div className={`text-2xl font-light transition-all duration-200 ${minute === selectedMinute ? 'loom-text-accent font-medium scale-110' : 'loom-text-primary opacity-50'}`}>{minute.toString().padStart(2, '0')}</div>
                      </div>
                    ))}

                    <div className="h-[60px]"></div> {/* Bottom spacing */}
                  </div>
                </div>

                {/* AM/PM Column */}
                {!use24HourFormat && (
                  <div className="relative w-16 h-[160px] overflow-hidden">
                    <div
                      ref={periodsRef}
                      className="absolute inset-0 overflow-y-auto scroll-smooth scrollbar-hide"
                      style={{
                        msOverflowStyle: "none",
                        scrollbarWidth: "none",
                        scrollSnapType: "y mandatory",
                        overscrollBehaviorY: "contain",
                        scrollBehavior: "smooth"
                      }}
                    >
                      <div className="h-[60px]"></div> {/* Top spacing */}

                      {periods.map((period) => (
                        <div
                          key={period}
                          className="h-[40px] flex items-center justify-center scroll-snap-align-center"
                          data-value={period}
                        >
                          <div className={`text-xl font-light transition-all duration-200 ${period === selectedPeriod ? 'loom-text-accent font-medium scale-110' : 'loom-text-primary opacity-50'}`}>{period}</div>
                        </div>
                      ))}

                      <div className="h-[60px]"></div> {/* Bottom spacing */}
                    </div>
                  </div>
                )}
              </div>

              {/* Loom-style selection highlight */}
              <div
                className="absolute left-3 right-3 top-1/2 transform -translate-y-1/2 h-[36px] loom-selection pointer-events-none z-5"
              />
            </div>

            <div className="flex justify-center space-x-2 w-full mt-3 px-4 pb-3">
              <button
                onClick={() => handleOpenChange(false)}
                className="loom-button loom-button-cancel flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDone}
                className="loom-button loom-button-done flex-1"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

TimePicker.displayName = "TimePicker";

export default TimePicker;