// Date/time utilities for Add page and others
// Note: Keep pure and framework-agnostic for easy testing

/**
 * Build an ISO 8601 datetime string WITH local timezone offset (e.g., 2025-09-10T19:00:00+08:00)
 * Accepts formats: "2:14 PM", "2:14pm", "14:14", "2 PM", "2pm", "14"
 */
export const convertTimeToISO = (timeString: string, dateString: string): string => {
  const trimmed = (timeString || '').trim();
  // 1) h:mm AM/PM (with or without space, case-insensitive)
  let m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (m) {
    let hour = parseInt(m[1], 10);
    const minute = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = m[3].toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const localDate = new Date(`${dateString}T${time24}:00`);
    const tzMinutes = localDate.getTimezoneOffset();
    const sign = tzMinutes > 0 ? '-' : '+';
    const abs = Math.abs(tzMinutes);
    const offH = String(Math.floor(abs / 60)).padStart(2, '0');
    const offM = String(abs % 60).padStart(2, '0');
    return `${dateString}T${time24}:00${sign}${offH}:${offM}`;
  }
  // 2) 24h format: H:mm or H
  m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (m) {
    const hour = Math.min(23, parseInt(m[1], 10));
    const minute = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
    const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const localDate = new Date(`${dateString}T${time24}:00`);
    const tzMinutes = localDate.getTimezoneOffset();
    const sign = tzMinutes > 0 ? '-' : '+';
    const abs = Math.abs(tzMinutes);
    const offH = String(Math.floor(abs / 60)).padStart(2, '0');
    const offM = String(abs % 60).padStart(2, '0');
    return `${dateString}T${time24}:00${sign}${offH}:${offM}`;
  }
  // Fallback noon
  const localDate = new Date(`${dateString}T12:00:00`);
  const tzMinutes = localDate.getTimezoneOffset();
  const sign = tzMinutes > 0 ? '-' : '+';
  const abs = Math.abs(tzMinutes);
  const offH = String(Math.floor(abs / 60)).padStart(2, '0');
  const offM = String(abs % 60).padStart(2, '0');
  return `${dateString}T12:00:00${sign}${offH}:${offM}`;
};

/**
 * Compute an end time display string (e.g., "1:00 PM") one hour after the provided start time.
 * Accepts both AM/PM and 24h inputs.
 */
export const computeEndFromStart = (timeString: string): string => {
  const trimmed = (timeString || '').trim();
  // AM/PM
  let m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (m) {
    let hour12 = parseInt(m[1], 10);
    const minute = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
    const ampm = m[3].toUpperCase();
    let hour24 = hour12 % 12;
    if (ampm === 'PM') hour24 += 12;
    hour24 = (hour24 + 1) % 24;
    const displayHour = (hour24 % 12) === 0 ? 12 : (hour24 % 12);
    const displayAmpm = hour24 >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${displayAmpm}`;
  }
  // 24h
  m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (m) {
    let hour24 = Math.min(23, parseInt(m[1], 10));
    const minute = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
    hour24 = (hour24 + 1) % 24;
    const displayHour = (hour24 % 12) === 0 ? 12 : (hour24 % 12);
    const displayAmpm = hour24 >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${displayAmpm}`;
  }
  // Default +1h from 12:00 PM
  return '1:00 PM';
};
