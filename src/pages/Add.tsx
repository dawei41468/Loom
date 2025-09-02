// Add Event/Proposal Page
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, addDays, addHours } from 'date-fns';
import { X, MapPin, Clock, Users, Bell } from 'lucide-react';
import { useEvents, useAuth, useUI } from '../store';
import { apiClient } from '../api/client';
import { cn } from '@/lib/utils';

type VisibilityType = 'shared' | 'private' | 'title_only';

const Add = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addEvent, addProposal } = useEvents();
  const { user, partner } = useAuth();
  const { addToast } = useUI();

  const isProposal = searchParams.get('type') === 'proposal';

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(addHours(new Date(), 1), 'HH:mm'));
  const [endTime, setEndTime] = useState(format(addHours(new Date(), 2), 'HH:mm'));
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('shared');
  const [includePartner, setIncludePartner] = useState(true);
  const [reminders, setReminders] = useState([10]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Natural language suggestions
  const [nlInput, setNlInput] = useState('');

  const reminderOptions = [
    { value: 5, label: '5 min' },
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
  ];

  const parseNaturalLanguage = (input: string) => {
    // Simple NL parsing - in real app, would use more sophisticated parsing
    const titleMatch = input.match(/^([^,]+)/);
    if (titleMatch) {
      setTitle(titleMatch[1].trim());
    }

    // Look for time patterns
    const timeMatch = input.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      
      if (ampm === 'pm' && hour !== 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      
      setStartTime(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      setEndTime(`${(hour + 1).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }

    // Look for day references
    if (input.toLowerCase().includes('tomorrow')) {
      setDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    } else if (input.toLowerCase().includes('friday') || input.toLowerCase().includes('fri')) {
      // Find next Friday - simplified
      const nextFriday = addDays(new Date(), (5 - new Date().getDay() + 7) % 7 || 7);
      setDate(format(nextFriday, 'yyyy-MM-dd'));
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

  const handleSubmit = async () => {
    if (!title.trim()) {
      addToast({
        type: 'error',
        title: 'Title required',
        description: 'Please enter a title for your event.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateTime = new Date(`${date}T${startTime}`).toISOString();
      const endDateTime = new Date(`${date}T${endTime}`).toISOString();

      if (isProposal && partner) {
        // Create proposal
        const proposal = await apiClient.createProposal({
          title,
          description: description || undefined,
          proposed_times: [
            {
              start_time: startDateTime,
              end_time: endDateTime,
            },
          ],
          location: location || undefined,
          proposed_by: user!.id,
          proposed_to: partner.id,
        });

        addProposal(proposal.data);
        addToast({
          type: 'success',
          title: 'Proposal sent!',
          description: `Sent "${title}" to ${partner.display_name}`,
        });
      } else {
        // Create event
        const event = await apiClient.createEvent({
          title,
          description: description || undefined,
          start_time: startDateTime,
          end_time: endDateTime,
          location: location || undefined,
          visibility,
          attendees: includePartner && partner ? [user!.id, partner.id] : [user!.id],
          created_by: user!.id,
          reminders,
        });

        addEvent(event.data);
        addToast({
          type: 'success',
          title: 'Event created!',
          description: `"${title}" added to your calendar.`,
        });
      }

      navigate('/');
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to create event',
        description: 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--loom-bg))] safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--loom-border))]">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[hsl(var(--loom-border))] rounded-full"
        >
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">
          {isProposal ? 'Propose Time' : 'Add Event'}
        </h1>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim()}
          className="loom-btn-primary px-6 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isProposal ? 'Propose' : 'Save'}
        </button>
      </div>

      <div className="container py-6 space-y-6">
        {/* Natural Language Input */}
        <div className="loom-card">
          <label className="block text-sm font-medium mb-2">Quick Add</label>
          <input
            type="text"
            value={nlInput}
            onChange={(e) => handleNLInputChange(e.target.value)}
            placeholder="e.g., Dinner Friday 7-9pm at Luigi's"
            className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
          />
          <p className="text-xs text-[hsl(var(--loom-text-muted))] mt-2">
            Try typing something like "Coffee tomorrow 9am" or "Date night Friday 7pm"
          </p>
        </div>

        {/* Title */}
        <div className="loom-card">
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
          />
        </div>

        {/* Date & Time */}
        <div className="loom-card">
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
            <span className="font-medium">When</span>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="loom-card">
          <div className="flex items-center space-x-2 mb-3">
            <MapPin className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
            <span className="font-medium">Where</span>
          </div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add location"
            className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
          />
        </div>

        {/* Description */}
        <div className="loom-card">
          <label className="block text-sm font-medium mb-2">Notes</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes or details..."
            rows={3}
            className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] resize-none"
          />
        </div>

        {!isProposal && (
          <>
            {/* Visibility */}
            <div className="loom-card">
              <label className="block text-sm font-medium mb-3">Visibility</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'shared', label: 'Shared' },
                  { value: 'private', label: 'Private' },
                  { value: 'title_only', label: 'Title Only' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setVisibility(value as VisibilityType)}
                    className={cn(
                      'loom-chip text-center',
                      visibility === value
                        ? 'loom-chip-shared'
                        : 'bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text-muted))]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Attendees */}
            {partner && (
              <div className="loom-card">
                <div className="flex items-center space-x-2 mb-3">
                  <Users className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
                  <span className="font-medium">Attendees</span>
                </div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includePartner}
                    onChange={(e) => setIncludePartner(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-[hsl(var(--loom-border))] text-[hsl(var(--loom-primary))] focus:ring-[hsl(var(--loom-primary))]"
                  />
                  <span>Include {partner.display_name}</span>
                </label>
              </div>
            )}

            {/* Reminders */}
            <div className="loom-card">
              <div className="flex items-center space-x-2 mb-3">
                <Bell className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
                <span className="font-medium">Reminders</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {reminderOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleReminder(value)}
                    className={cn(
                      'loom-chip',
                      reminders.includes(value)
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
        )}
      </div>
    </div>
  );
};

export default Add;