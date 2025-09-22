import * as React from 'react';
import { useState } from 'react';
import { DateTimePicker } from '@/components/forms/DateTimePicker';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { format } from 'date-fns';
import { useTheme, useUIActions } from '@/contexts/UIContext';

const DateTimePickerTest = () => {
  const { t } = useTranslation();
  const currentTheme = useTheme();
  const { setTheme } = useUIActions();

  // Set initial values
  const now = new Date();
  const oneHourLater = new Date(now);
  oneHourLater.setHours(now.getHours() + 1);

  const toggleTheme = () => {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  };
  
  const [selectedFromDateTime, setSelectedFromDateTime] = useState<Date | undefined>(now);
  const [selectedToDateTime, setSelectedToDateTime] = useState<Date | undefined>(oneHourLater);
  const [savedFromDateTime, setSavedFromDateTime] = useState<Date | undefined>(now);
  const [savedToDateTime, setSavedToDateTime] = useState<Date | undefined>(oneHourLater);

  const handleFromDateTimeChange = (value: Date) => {
    setSelectedFromDateTime(value);
 };

  const handleToDateTimeChange = (value: Date) => {
    setSelectedToDateTime(value);
  };

  const handleSave = () => {
    setSavedFromDateTime(selectedFromDateTime);
    setSavedToDateTime(selectedToDateTime);
  };

  return (
    <div className="container py-4 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="DateTimePicker Test"
          subtitle="Test the DateTimePicker component"
        />
        <Button
          onClick={toggleTheme}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          {currentTheme === 'light' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              <span>Dark</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <span>Light</span>
            </>
          )}
        </Button>
      </div>

      <Section title="Component Preview" variant="card">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--loom-text))] mb-2">
              From Date and Time
            </label>
            <DateTimePicker
              mode="from"
              value={selectedFromDateTime}
              onChange={handleFromDateTimeChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--loom-text))] mb-2">
              To Date and Time
            </label>
            <DateTimePicker
              mode="to"
              value={selectedToDateTime}
              onChange={handleToDateTimeChange}
            />
          </div>

          <div className="pt-4">
            <Button onClick={handleSave}>
              Save Selection
            </Button>
          </div>

          {savedFromDateTime && (
            <div className="pt-4">
              <h3 className="text-lg font-semibold text-[hsl(var(--loom-text))] mb-2">
                Saved From DateTime:
              </h3>
              <p className="text-[hsl(var(--loom-text-muted))]">
                {format(savedFromDateTime, 'EEE, MMM d, yyyy, h:mma').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
          )}

          {savedToDateTime && (
            <div className="pt-4">
              <h3 className="text-lg font-semibold text-[hsl(var(--loom-text))] mb-2">
                Saved To DateTime:
              </h3>
              <p className="text-[hsl(var(--loom-text-muted))]">
                {format(savedToDateTime, 'EEE, MMM d, yyyy, h:mma').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
          )}

          {selectedFromDateTime && (
            <div className="pt-4">
              <h3 className="text-lg font-semibold text-[hsl(var(--loom-text))] mb-2">
                Current From Selection:
              </h3>
              <p className="text-[hsl(var(--loom-text-muted))]">
                {format(selectedFromDateTime, 'EEE, MMM d, yyyy, h:mma').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
          )}

          {selectedToDateTime && (
            <div className="pt-4">
              <h3 className="text-lg font-semibold text-[hsl(var(--loom-text))] mb-2">
                Current To Selection:
              </h3>
              <p className="text-[hsl(var(--loom-text-muted))]">
                {format(selectedToDateTime, 'EEE, MMM d, yyyy, h:mma').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
          )}
        </div>
      </Section>

      <Section title="Usage Instructions" variant="card">
        <div className="space-y-2 text-[hsl(var(--loom-text-muted))]">
          <p>
            1. Click on either the "From" or "To" input field to open the date and time picker
          </p>
          <p>
            2. Use the wheel pickers to select day, hour, and minute
          </p>
          <p>
            3. The middle row of each wheel is the selected value (purple color)
          </p>
          <p>
            4. Click "Confirm" to apply your selection
          </p>
          <p>
            5. Click "Save Selection" to save the current values
          </p>
        </div>
      </Section>
    </div>
  );
};

export default DateTimePickerTest;