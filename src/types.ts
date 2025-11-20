// Loom Types - API compatible with FastAPI backend

export interface User {
  id: string;
  email: string;
  display_name: string;
  color_preference: 'user' | 'partner';
  // Viewer-centric colors: 'user' | 'partner' | '#RRGGBB'
  ui_self_color?: string;
  ui_partner_color?: string;
  timezone: string;
  language: 'en' | 'zh';
  is_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Partner {
  id: string;
  display_name: string;
  color_preference: 'user' | 'partner';
  timezone: string;
  invite_status: 'pending' | 'accepted';
  connected_at?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  location?: string;
  visibility: 'shared' | 'private' | 'title_only';
  attendees: string[]; // User IDs
  created_by: string; // User ID
  reminders: number[]; // Minutes before event
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  title: string;
  description?: string;
  message?: string;
  proposed_times: {
    start_time: string;
    end_time: string;
  }[];
  location?: string;
  proposed_by: string; // User ID
  proposed_to: string; // User ID
  status: 'pending' | 'accepted' | 'declined';
  accepted_time_slot?: {
    start_time: string;
    end_time: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string; // ISO string
  completed: boolean;
  created_by: string; // User ID
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

// UI State Types
export interface EventFilter {
  type: 'all' | 'mine' | 'partner' | 'shared';
}

export interface CalendarView {
  type: '3day' | 'week' | 'agenda';
  date: string; // ISO date string
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  duration?: number;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

// Authentication Types
export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserCreate {
  email: string;
  display_name: string;
  password: string;
  color_preference: 'user' | 'partner';
  timezone: string;
  language: 'en' | 'zh';
}

export interface UserUpdate {
  display_name?: string;
  color_preference?: 'user' | 'partner';
  ui_self_color?: string;
  ui_partner_color?: string;
  timezone?: string;
  language?: 'en' | 'zh';
}

export interface AvailabilityRequest {
  duration_minutes: number;
  date_range_days: number;
}

export interface BusyTimeSlot {
  start_time: string;
  end_time: string;
  title: string;
  visibility: string;
}

// Event Chat Types
export interface EventMessage {
  id: string;
  event_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  updated_at: string;
  sender?: User; // populated from API
}

// Event Checklist Types
export interface ChecklistItem {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  completed: boolean;
  completed_by?: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}