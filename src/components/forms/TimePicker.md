# Loom TimePicker Component

A beautiful, iOS-style time picker component that integrates seamlessly with the Loom design system.

## Features

- 🎨 **Loom Design System**: Fully integrated with your app's color scheme and design tokens
- 📱 **Mobile Optimized**: Touch-friendly interface with momentum scrolling
- ⌚ **iOS-style Interface**: Smooth scrolling columns with snap-to-center behavior
- 🎯 **Context Aware**: Smart defaults for morning/evening deadlines
- ♿ **Accessible**: Keyboard navigation and screen reader support
- 🌙 **Dark Mode**: Automatic theme switching
- 📏 **Responsive**: Optimized for all screen sizes including 361px mobile

## Installation

The TimePicker component is already included in your project. Just import it:

```tsx
import { TimePicker } from './components/ui/TimePicker';
```

## Basic Usage

```tsx
import React, { useState } from 'react';
import { TimePicker } from './components/ui/TimePicker';

const MyComponent = () => {
  const [selectedTime, setSelectedTime] = useState('09:00 AM');

  return (
    <TimePicker
      label="Select Time"
      value={selectedTime}
      onChange={setSelectedTime}
    />
  );
};
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Label text for the time picker |
| `value` | `string` | - | Current selected time value |
| `defaultValue` | `string` | - | Default time value |
| `onChange` | `(time: string) => void` | - | Callback when time changes |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when picker opens/closes |
| `open` | `boolean` | - | Controlled open state |
| `defaultOpen` | `boolean` | `false` | Default open state |
| `className` | `string` | - | Additional CSS classes |
| `use24HourFormat` | `boolean` | `false` | Use 24-hour format |
| `context` | `'morningDeadline' \| 'eveningDeadline'` | - | Context for smart defaults |

## Examples

### Basic Time Selection

```tsx
<TimePicker
  label="Meeting Time"
  value={meetingTime}
  onChange={setMeetingTime}
/>
```

### Context-Aware Time Picker

```tsx
<TimePicker
  label="Morning Deadline"
  value={morningDeadline}
  onChange={setMorningDeadline}
  context="morningDeadline"
/>
```

### 24-Hour Format

```tsx
<TimePicker
  label="24-Hour Time"
  value={time24}
  onChange={setTime24}
  use24HourFormat={true}
/>
```

### Controlled Component

```tsx
<TimePicker
  label="Controlled Time"
  value={controlledTime}
  onChange={setControlledTime}
  open={isOpen}
  onOpenChange={setIsOpen}
/>
```

## Styling

The TimePicker uses Loom design system colors:

- **Primary**: `hsl(var(--loom-primary))` for selected items
- **Surface**: `hsl(var(--loom-surface))` for backgrounds
- **Border**: `hsl(var(--loom-border))` for borders
- **Text**: `hsl(var(--loom-text))` for text colors

## Mobile Optimization

The TimePicker is specifically optimized for your 361px mobile width:

- **Touch Targets**: Minimum 44px height for all interactive elements
- **Momentum Scrolling**: Smooth touch interactions with momentum
- **Responsive Layout**: Adapts to different screen sizes
- **Swipe Gestures**: Natural scrolling behavior

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and descriptions
- **Focus Management**: Clear focus indicators
- **Touch Targets**: Adequate size for touch interaction

## Integration with Forms

```tsx
import React, { useState } from 'react';
import { TimePicker } from './components/ui/TimePicker';

const EventForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    startTime: '09:00 AM',
    endTime: '10:00 AM'
  });

  const handleTimeChange = (field: string) => (time: string) => {
    setFormData(prev => ({ ...prev, [field]: time }));
  };

  return (
    <form>
      <input
        type="text"
        placeholder="Event Title"
        value={formData.title}
        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
      />

      <TimePicker
        label="Start Time"
        value={formData.startTime}
        onChange={handleTimeChange('startTime')}
      />

      <TimePicker
        label="End Time"
        value={formData.endTime}
        onChange={handleTimeChange('endTime')}
      />
    </form>
  );
};
```

## Technical Details

- **Framework**: React with TypeScript
- **Styling**: CSS with Loom design system variables
- **Animation**: CSS transitions and transforms
- **Touch Handling**: Native touch events with momentum
- **Performance**: Optimized rendering and event handling

## Browser Support

- **Modern Browsers**: Full feature support
- **Mobile Safari**: Optimized touch interactions
- **Chrome Mobile**: Full compatibility
- **Firefox Mobile**: Full compatibility

The TimePicker component provides a premium user experience that matches the quality of native mobile time pickers while maintaining full integration with your Loom design system.