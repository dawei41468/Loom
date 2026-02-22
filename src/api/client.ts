// Loom API Client - Mock services ready for FastAPI backend replacement
import {
  User,
  Partner,
  Event,
  Proposal,
  Task,
  AvailabilitySlot,
  BusyTimeSlot,
  EventMessage,
  ChecklistItem,
  ApiResponse,
  Token,
  UserLogin,
  UserCreate
} from '../types';


// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7500/api';

// API Client Class
class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<Token> | null = null;
  private onTokensRefreshed?: (tokens: Token) => void;
  private onAuthError?: (error: Error) => void;
  private lastRefreshAttempt = 0;
  private refreshCooldownMs = 5000; // 5 second cooldown after rate limit

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  public setOnAuthError(callback: (error: Error) => void) {
    this.onAuthError = callback;
  }

  public setOnTokensRefreshed(callback: (tokens: Token) => void) {
    this.onTokensRefreshed = callback;
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  public setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken;
  }

  public getAccessToken(): string | null {
    return this.token;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  // Decode a JWT without verifying signature to read the payload
  private decodeJwt(token: string): { exp?: number } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
      return null;
    }
  }

  /**
   * Ensure the access token is valid and not near expiry.
   * If missing or expiring within the next 60 seconds, attempt to refresh using the refresh token.
   */
  public async ensureValidAccessToken(): Promise<void> {
    // If no token set, nothing to ensure
    if (!this.token) return;

    const payload = this.decodeJwt(this.token);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const bufferSeconds = 60; // refresh a bit before expiry

    if (!payload?.exp || payload.exp <= nowSeconds + bufferSeconds) {
      // Token expired or close to expiring, try refresh if available
      if (!this.refreshToken) return;
      try {
        if (this.isRefreshing && this.refreshPromise) {
          await this.refreshPromise;
        } else {
          this.isRefreshing = true;
          this.refreshPromise = this.refreshTokens();
          await this.refreshPromise;
        }
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    }
  }

  private refreshTokens = async (): Promise<Token> => {
    // Rate limit: don't try to refresh if we recently got a 429
    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.refreshCooldownMs) {
      throw new Error('Rate limited. Please wait before retrying.');
    }
    this.lastRefreshAttempt = now;

    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });

    if (!response.ok) {
      // Handle rate limiting - increase cooldown
      if (response.status === 429) {
        this.refreshCooldownMs = Math.min(this.refreshCooldownMs * 2, 60000); // max 60s
        throw new Error('Too many requests. Please wait.');
      }
      if (response.status === 401) {
        // Reset cooldown on auth failure
        this.refreshCooldownMs = 5000;
        // Trigger logout
        if (this.onAuthError) {
          this.onAuthError(new Error('Session expired. Please login again.'));
        }
        throw new Error('Refresh token expired. Please login again.');
      }
      throw new Error('Failed to refresh token');
    }

    // Reset cooldown on success
    this.refreshCooldownMs = 5000;

    const tokenData: Token = await response.json();
    this.token = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token;

    // Notify AuthContext of token refresh
    if (this.onTokensRefreshed) {
      this.onTokensRefreshed(tokenData);
    }

    return tokenData;
  }

  private request = async <T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`API Response for ${endpoint}: Status=${response.status}, OK=${response.ok}`);

      if (!response.ok) {
        const text = await response.text();
        console.error(`API Error Response Text for ${endpoint}:`, text);
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;

        try {
          const errorData = JSON.parse(text);
          interface ErrorDetail {
            loc?: (string | number)[];
            msg?: string;
            type?: string;
          }

          if (Array.isArray(errorData?.detail)) {
            const msgs = errorData.detail.map((d: ErrorDetail) => {
              const loc = Array.isArray(d?.loc) ? d.loc.slice(1).join('.') : undefined;
              const msg = d?.msg || JSON.stringify(d);
              return loc ? `${loc}: ${msg}` : msg;
            }).join('; ');
            errorMessage = msgs || errorMessage;
          } else if (typeof errorData?.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (typeof errorData?.message === 'string') {
            errorMessage = errorData.message;
          } else {
              errorMessage = text || errorMessage;
          }
        } catch {
          if (text) errorMessage = text;
        }

        // Handle token refresh only if it's a 401 and not a retry
        if (response.status === 401 && !isRetry && this.refreshToken) {
          try {
            if (this.isRefreshing) {
              await this.refreshPromise;
            } else {
              this.isRefreshing = true;
              this.refreshPromise = this.refreshTokens();
              await this.refreshPromise;
              this.isRefreshing = false;
              this.refreshPromise = null;
            }
            return this.request<T>(endpoint, options, true);
          } catch (refreshError) {
            this.isRefreshing = false;
            this.refreshPromise = null;
            // Trigger logout on auth failure
            if (this.onAuthError) {
              this.onAuthError(new Error('Authentication failed. Please login again.'));
            }
            throw new Error('Authentication failed. Please login again.');
          }
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error(errorMessage);
      }

      if (response.status === 204) {
        console.log(`API Response for ${endpoint}: No content (204)`);
        return {} as T;
      }

      const jsonResponse = await response.json();
      console.log(`API Response JSON for ${endpoint}:`, jsonResponse);
      return jsonResponse;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }


  // Auth
  login = async (credentials: UserLogin): Promise<Token> => {
    return this.request<Token>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  register = async (userData: UserCreate): Promise<ApiResponse<User>> => {
    return this.request<ApiResponse<User>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  getMe = async (): Promise<ApiResponse<User>> => {
    return this.request<ApiResponse<User>>('/auth/me');
  }

  updateMe = async (userData: Partial<User>): Promise<ApiResponse<User>> => {
    return this.request<ApiResponse<User>>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  changePassword = async (payload: { current_password: string; new_password: string }): Promise<ApiResponse<void>> => {
    return this.request<ApiResponse<void>>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  deleteAccount = async (payload: { current_password: string }): Promise<ApiResponse<void>> => {
    return this.request<ApiResponse<void>>('/auth/me', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  }

  // Partner
  getPartner = async (): Promise<ApiResponse<Partner | null>> => {
    return this.request<ApiResponse<Partner | null>>('/partner');
  }


  checkEmailRegistered = async (email: string): Promise<ApiResponse<{ is_registered: boolean; email: string }>> => {
    return this.request<ApiResponse<{ is_registered: boolean; email: string }>>(`/partner/check-email/${encodeURIComponent(email)}`);
  }

  connectPartner = async (token: { invite_token: string }): Promise<ApiResponse<Partner>> => {
    return this.request<ApiResponse<Partner>>('/partner/connect', {
      method: 'POST',
      body: JSON.stringify(token),
    });
  }

  generateInviteToken = async (expiresInDays: number = 7): Promise<ApiResponse<{ invite_token: string; invite_url: string; expires_at: string }>> => {
    return this.request<ApiResponse<{ invite_token: string; invite_url: string; expires_at: string }>>('/partner/generate-invite', {
      method: 'POST',
      body: JSON.stringify({ expires_in_days: expiresInDays }),
    });
  }

  checkInviteToken = async (token: string): Promise<ApiResponse<{ inviter: { id: string; display_name: string; email: string }; expires_at: string; token: string }>> => {
    return this.request<ApiResponse<{ inviter: { id: string; display_name: string; email: string }; expires_at: string; token: string }>>(`/partner/check-invite/${token}`);
  }

  disconnectPartner = async (): Promise<ApiResponse<void>> => {
    return this.request<ApiResponse<void>>('/partner', {
      method: 'DELETE',
    });
  }

  // Events
  getEvents = async (): Promise<ApiResponse<Event[]>> => {
    return this.request<ApiResponse<Event[]>>('/events');
  }

  createEvent = async (event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Event>> => {
    return this.request<ApiResponse<Event>>('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  getEvent = async (eventId: string): Promise<ApiResponse<Event>> => {
    return this.request<ApiResponse<Event>>(`/events/${eventId}`);
  }

  updateEvent = async (eventId: string, eventData: Partial<Event>): Promise<ApiResponse<Event>> => {
    return this.request<ApiResponse<Event>>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  deleteEvent = async (eventId: string): Promise<ApiResponse<void>> => {
    return this.request<ApiResponse<void>>(`/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // Proposals
  getProposals = async (): Promise<ApiResponse<Proposal[]>> => {
    return this.request<ApiResponse<Proposal[]>>('/proposals');
  }

  // Matches backend ProposalCreate shape (no proposed_by; backend derives from auth)
  createProposal = async (proposal: {
    title: string;
    description?: string;
    message?: string;
    proposed_times: { start_time: string; end_time: string }[];
    location?: string;
    proposed_to: string;
  }): Promise<ApiResponse<Proposal>> => {
    return this.request<ApiResponse<Proposal>>('/proposals', {
      method: 'POST',
      body: JSON.stringify(proposal),
    });
  }

  acceptProposal = async (proposalId: string, selectedTimeSlot: { start_time: string; end_time: string }): Promise<ApiResponse<{ proposal: Proposal; event: Event }>> => {
    return this.request<ApiResponse<{ proposal: Proposal; event: Event }>>(`/proposals/${proposalId}/accept`, {
      method: 'POST',
      body: JSON.stringify(selectedTimeSlot),
    });
  }

  getProposal = async (proposalId: string): Promise<ApiResponse<Proposal>> => {
    return this.request<ApiResponse<Proposal>>(`/proposals/${proposalId}`);
  }

  declineProposal = async (proposalId: string): Promise<ApiResponse<Proposal>> => {
    return this.request<ApiResponse<Proposal>>(`/proposals/${proposalId}/decline`, {
      method: 'POST',
    });
  }

  // Tasks
  getTasks = async (): Promise<ApiResponse<Task[]>> => {
    return this.request<ApiResponse<Task[]>>('/tasks');
  }

  createTask = async (task: Omit<Task, 'id' | 'completed' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Task>> => {
    return this.request<ApiResponse<Task>>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  getTask = async (taskId: string): Promise<ApiResponse<Task>> => {
    return this.request<ApiResponse<Task>>(`/tasks/${taskId}`);
  }

  updateTask = async (taskId: string, taskData: Partial<Task>): Promise<ApiResponse<Task>> => {
    return this.request<ApiResponse<Task>>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  toggleTask = async (taskId: string): Promise<ApiResponse<Task>> => {
    return this.request<ApiResponse<Task>>(`/tasks/${taskId}/toggle`, {
      method: 'PATCH',
    });
  }

  deleteTask = async (taskId: string): Promise<ApiResponse<void>> => {
    return this.request<ApiResponse<void>>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // Availability
  findOverlap = async (params: { duration_minutes: number; date_range_days: number }): Promise<ApiResponse<AvailabilitySlot[]>> => {
    return this.request<ApiResponse<AvailabilitySlot[]>>('/availability/find-overlap', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  getUserBusyTimes = async (startDate: string, endDate: string): Promise<ApiResponse<BusyTimeSlot[]>> => {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    return this.request<ApiResponse<BusyTimeSlot[]>>(`/availability/user-busy?${params.toString()}`);
  }

  // Event Chat
  getEventMessages = async (eventId: string): Promise<ApiResponse<EventMessage[]>> => {
    return this.request<ApiResponse<EventMessage[]>>(`/events/${eventId}/messages`);
  }

  sendEventMessage = async (eventId: string, message: string): Promise<ApiResponse<EventMessage>> => {
    return this.request<ApiResponse<EventMessage>>(`/events/${eventId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  deleteEventMessage = async (eventId: string, messageId: string): Promise<ApiResponse<void>> => {
    return this.request<ApiResponse<void>>(`/events/${eventId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // Event Checklist
  getEventChecklist = async (eventId: string): Promise<ApiResponse<ChecklistItem[]>> => {
    return this.request<ApiResponse<ChecklistItem[]>>(`/events/${eventId}/checklist`);
  }

  createChecklistItem = async (eventId: string, item: { title: string; description?: string }): Promise<ApiResponse<ChecklistItem>> => {
    return this.request<ApiResponse<ChecklistItem>>(`/events/${eventId}/checklist`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  updateChecklistItem = async (eventId: string, itemId: string, updates: { completed: boolean }): Promise<ApiResponse<ChecklistItem>> => {
    return this.request<ApiResponse<ChecklistItem>>(`/events/${eventId}/checklist/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  deleteChecklistItem = async (eventId: string, itemId: string): Promise<ApiResponse<void>> => {
      return this.request<ApiResponse<void>>(`/events/${eventId}/checklist/${itemId}`, {
          method: 'DELETE',
      });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);