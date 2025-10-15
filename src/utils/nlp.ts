// Simple natural language parsing helpers for the Add page
// Keep these pure so they are easy to test.
import { addDays, format } from 'date-fns';

export interface ParsedTime {
  startDisplay: string; // e.g., "2:00 PM"
  endDisplay: string;   // e.g., "3:00 PM" (one hour after)
}

/**
 * Extract a title from the beginning of an input string up to the first comma.
 */
export function parseTitle(input: string): string | null {
  const m = input.match(/^([^,]+)/);
  return m ? m[1].trim() : null;
}

/**
 * Parse a time reference in the input and return a display start and end time (+1h)
 */
export function parseTime(input: string): ParsedTime | null {
  const m = input.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.toLowerCase();

  // Validation: reject invalid times
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

  // Secondary: prevent false positives like "30" being parsed as 3:00
  // If no minutes specified and no am/pm, and hour has more than 1 digit, likely not a time
  if (!m[2] && !ampm && m[1].length > 1) return null;

  let displayHour = hour;
  let displayAmpm: 'am' | 'pm' = ampm ? (ampm as 'am' | 'pm') : 'am';

  if (ampm === 'pm' && hour !== 12) {
    displayHour = hour;
    displayAmpm = 'pm';
  } else if (ampm === 'am' && hour === 12) {
    displayHour = 12;
    displayAmpm = 'am';
  } else if (!ampm) {
    const now = new Date();
    const currentHour = now.getHours();
    if (hour < 12) {
      displayAmpm = currentHour >= 12 ? 'pm' : 'am';
    } else {
      displayHour = hour > 12 ? hour - 12 : hour;
      displayAmpm = hour >= 12 ? 'pm' : 'am';
    }
  }

  const startDisplay = `${displayHour}:${minute.toString().padStart(2, '0')} ${displayAmpm.toUpperCase()}`;

  // End time +1h (12-hour wrap)
  let endHour = displayHour + 1;
  let endAmpm: 'am' | 'pm' = displayAmpm;
  if (endHour > 12) {
    endHour = 1;
    endAmpm = displayAmpm === 'am' ? 'pm' : 'am';
  } else if (endHour === 12) {
    endAmpm = displayAmpm === 'am' ? 'pm' : 'am';
  }
  const endDisplay = `${endHour}:${minute.toString().padStart(2, '0')} ${endAmpm.toUpperCase()}`;
  return { startDisplay, endDisplay };
}

/**
 * Parse day references like 'tomorrow' or 'friday' and return a yyyy-MM-dd date string.
 */
export function parseDay(input: string, baseDate: Date = new Date()): string | null {
  const lower = input.toLowerCase();
  if (lower.includes('tomorrow')) {
    return format(addDays(baseDate, 1), 'yyyy-MM-dd');
  }
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i]) || lower.includes(days[i].slice(0,3))) {
      const today = baseDate.getDay();
      const target = i;
      const delta = (target - today + 7) % 7 || 7; // next occurrence, not today
      return format(addDays(baseDate, delta), 'yyyy-MM-dd');
    }
  }
  return null;
}
