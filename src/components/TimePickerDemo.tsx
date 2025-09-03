import React, { useState } from 'react';
import { TimePicker } from './ui/TimePicker';
import { Section } from './ui/section';
import { PageHeader } from './ui/page-header';

const TimePickerDemo = () => {
  const [selectedTime, setSelectedTime] = useState<string>('09:00 AM');
  const [morningDeadline, setMorningDeadline] = useState<string>('08:00 AM');
  const [eveningDeadline, setEveningDeadline] = useState<string>('08:00 PM');

  return (
    <div className="container py-4 sm:py-8 space-y-6 sm:space-y-8">
      <PageHeader
        title="TimePicker Demo"
        subtitle="Showcasing the new Loom-style TimePicker component"
      />

      <Section variant="card">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--loom-text))]">
              Basic TimePicker
            </h3>
            <TimePicker
              label="Select Time"
              value={selectedTime}
              onChange={setSelectedTime}
            />
            <p className="mt-2 text-sm text-[hsl(var(--loom-text-muted))]">
              Selected: {selectedTime}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--loom-text))]">
              Custom Time Selection
            </h3>
            <TimePicker
              label="Morning Deadline"
              value={morningDeadline}
              onChange={setMorningDeadline}
            />
            <p className="mt-2 text-sm text-[hsl(var(--loom-text-muted))]">
              Selected: {morningDeadline}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--loom-text))]">
              Another Time Selection
            </h3>
            <TimePicker
              label="Evening Deadline"
              value={eveningDeadline}
              onChange={setEveningDeadline}
            />
            <p className="mt-2 text-sm text-[hsl(var(--loom-text-muted))]">
              Selected: {eveningDeadline}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--loom-text))]">
              24-Hour Format
            </h3>
            <TimePicker
              label="24-Hour Time"
              use24HourFormat={true}
            />
          </div>
        </div>
      </Section>

      <Section>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--loom-text))]">
            Features
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div className="p-4 bg-[hsl(var(--loom-surface))] border border-[hsl(var(--loom-border))] rounded-[var(--loom-radius-lg)]">
              <h4 className="font-medium text-[hsl(var(--loom-text))] mb-2">iOS-style Interface</h4>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                Smooth scrolling columns with momentum and snap-to-center behavior
              </p>
            </div>

            <div className="p-4 bg-[hsl(var(--loom-surface))] border border-[hsl(var(--loom-border))] rounded-[var(--loom-radius-lg)]">
              <h4 className="font-medium text-[hsl(var(--loom-text))] mb-2">Loom Design System</h4>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                Fully integrated with your app's color scheme and design tokens
              </p>
            </div>

            <div className="p-4 bg-[hsl(var(--loom-surface))] border border-[hsl(var(--loom-border))] rounded-[var(--loom-radius-lg)]">
              <h4 className="font-medium text-[hsl(var(--loom-text))] mb-2">Touch Optimized</h4>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                Enhanced touch interactions with momentum scrolling and haptic feedback
              </p>
            </div>

            <div className="p-4 bg-[hsl(var(--loom-surface))] border border-[hsl(var(--loom-border))] rounded-[var(--loom-radius-lg)]">
              <h4 className="font-medium text-[hsl(var(--loom-text))] mb-2">Flexible Usage</h4>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                Works seamlessly in any context with customizable time selection
              </p>
            </div>

            <div className="p-4 bg-[hsl(var(--loom-surface))] border border-[hsl(var(--loom-border))] rounded-[var(--loom-radius-lg)]">
              <h4 className="font-medium text-[hsl(var(--loom-text))] mb-2">Responsive Design</h4>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                Optimized for all screen sizes including your 361px mobile width
              </p>
            </div>

            <div className="p-4 bg-[hsl(var(--loom-surface))] border border-[hsl(var(--loom-border))] rounded-[var(--loom-radius-lg)]">
              <h4 className="font-medium text-[hsl(var(--loom-text))] mb-2">Accessibility</h4>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                Keyboard navigation, screen reader support, and proper ARIA labels
              </p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default TimePickerDemo;