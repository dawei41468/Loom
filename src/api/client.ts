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

  constructor(baseURL: string) {
    this.baseURL = baseURL;
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

  private async refreshTokens(): Promise<Token> {
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
      if (response.status === 401) {
        throw new Error('Refresh token expired. Please login again.');
      }
      throw new Error('Failed to refresh token');
    }

    const tokenData: Token = await response.json();
    this.token = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token;

    // Notify AuthContext of token refresh
    if (this.onTokensRefreshed) {
      this.onTokensRefreshed(tokenData);
    }

    return tokenData;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
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

      if (!response.ok) {
        if (response.status === 401 && !isRetry && this.refreshToken) {
          // Attempt to refresh token and retry the request
          try {
            if (this.isRefreshing) {
              // Wait for ongoing refresh to complete
              await this.refreshPromise;
            } else {
              // Start refresh process
              this.isRefreshing = true;
              this.refreshPromise = this.refreshTokens();
              const newTokens = await this.refreshPromise;

              // Update AuthContext with new tokens
              // This will be handled by the AuthContext when tokens are updated
              this.isRefreshing = false;
              this.refreshPromise = null;
            }

            // Retry the original request with new token
            return this.request<T>(endpoint, options, true);
          } catch (refreshError) {
            this.isRefreshing = false;
            this.refreshPromise = null;
            // If refresh fails, throw the original 401 error
            throw new Error('Authentication failed. Please login again.');
          }
        } else if (response.status === 401) {
          // Either no refresh token or already retried
          throw new Error('Authentication failed. Please login again.');
        }

        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `API Error: ${response.statusText}`);
      }

      // Handle cases with no content
      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }


  // Auth
  async login(credentials: UserLogin): Promise<Token> {
    return this.request<Token>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: UserCreate): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getMe(): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/auth/me');
  }

  async updateMe(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Partner
  async getPartner(): Promise<ApiResponse<Partner | null>> {
    return this.request<ApiResponse<Partner | null>>('/partner');
  }


  async checkEmailRegistered(email: string): Promise<ApiResponse<{ is_registered: boolean; email: string }>> {
    return this.request<ApiResponse<{ is_registered: boolean; email: string }>>(`/partner/check-email/${encodeURIComponent(email)}`);
  }

  async generateInviteToken(expiresInDays: number = 7): Promise<ApiResponse<{ invite_token: string; invite_url: string; expires_at: string }>> {
    return this.request<ApiResponse<{ invite_token: string; invite_url: string; expires_at: string }>>('/partner/generate-invite', {
      method: 'POST',
      body: JSON.stringify({ expires_in_days: expiresInDays }),
    });
  }

  async checkInviteToken(token: string): Promise<ApiResponse<{ inviter: { id: string; display_name: string; email: string }; expires_at: string; token: string }>> {
    return this.request<ApiResponse<{ inviter: { id: string; display_name: string; email: string }; expires_at: string; token: string }>>(`/partner/check-invite/${token}`);
  }

  // Events
  async getEvents(): Promise<ApiResponse<Event[]>> {
    return this.request<ApiResponse<Event[]>>('/events');
  }

  async createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Event>> {
    return this.request<ApiResponse<Event>>('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async getEvent(eventId: string): Promise<ApiResponse<Event>> {
    return this.request<ApiResponse<Event>>(`/events/${eventId}`);
  }

  async updateEvent(eventId: string, eventData: Partial<Event>): Promise<ApiResponse<Event>> {
    return this.request<ApiResponse<Event>>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async deleteEvent(eventId: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // Proposals
  async getProposals(): Promise<ApiResponse<Proposal[]>> {
    return this.request<ApiResponse<Proposal[]>>('/proposals');
  }

  async createProposal(proposal: Omit<Proposal, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Proposal>> {
    return this.request<ApiResponse<Proposal>>('/proposals', {
      method: 'POST',
      body: JSON.stringify(proposal),
    });
  }

  async acceptProposal(proposalId: string, selectedTimeSlot: { start_time: string; end_time: string }): Promise<ApiResponse<{ proposal: Proposal; event: Event }>> {
    return this.request<ApiResponse<{ proposal: Proposal; event: Event }>>(`/proposals/${proposalId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ selected_time_slot: selectedTimeSlot }),
    });
  }

  async getProposal(proposalId: string): Promise<ApiResponse<Proposal>> {
    return this.request<ApiResponse<Proposal>>(`/proposals/${proposalId}`);
  }

  async declineProposal(proposalId: string): Promise<ApiResponse<Proposal>> {
    return this.request<ApiResponse<Proposal>>(`/proposals/${proposalId}/decline`, {
      method: 'POST',
    });
  }

  // Tasks
  async getTasks(): Promise<ApiResponse<Task[]>> {
    return this.request<ApiResponse<Task[]>>('/tasks');
  }

  async createTask(task: Omit<Task, 'id' | 'completed' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Task>> {
    return this.request<ApiResponse<Task>>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async getTask(taskId: string): Promise<ApiResponse<Task>> {
    return this.request<ApiResponse<Task>>(`/tasks/${taskId}`);
  }

  async updateTask(taskId: string, taskData: Partial<Task>): Promise<ApiResponse<Task>> {
    return this.request<ApiResponse<Task>>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async toggleTask(taskId: string): Promise<ApiResponse<Task>> {
    return this.request<ApiResponse<Task>>(`/tasks/${taskId}/toggle`, {
      method: 'PATCH',
    });
  }

  async deleteTask(taskId: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // Availability
  async findOverlap(params: { duration_minutes: number; date_range_days: number }): Promise<ApiResponse<AvailabilitySlot[]>> {
    return this.request<ApiResponse<AvailabilitySlot[]>>('/availability/find-overlap', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getUserBusyTimes(startDate: string, endDate: string): Promise<ApiResponse<BusyTimeSlot[]>> {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    return this.request<ApiResponse<BusyTimeSlot[]>>(`/availability/user-busy?${params.toString()}`);
  }

  // Event Chat
  async getEventMessages(eventId: string): Promise<ApiResponse<EventMessage[]>> {
    return this.request<ApiResponse<EventMessage[]>>(`/events/${eventId}/messages`);
  }

  async sendEventMessage(eventId: string, message: string): Promise<ApiResponse<EventMessage>> {
    return this.request<ApiResponse<EventMessage>>(`/events/${eventId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async deleteEventMessage(eventId: string, messageId: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/events/${eventId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // Event Checklist
  async getEventChecklist(eventId: string): Promise<ApiResponse<ChecklistItem[]>> {
    return this.request<ApiResponse<ChecklistItem[]>>(`/events/${eventId}/checklist`);
  }

  async createChecklistItem(eventId: string, item: { title: string; description?: string }): Promise<ApiResponse<ChecklistItem>> {
    return this.request<ApiResponse<ChecklistItem>>(`/events/${eventId}/checklist`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateChecklistItem(eventId: string, itemId: string, updates: { completed: boolean }): Promise<ApiResponse<ChecklistItem>> {
    return this.request<ApiResponse<ChecklistItem>>(`/events/${eventId}/checklist/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteChecklistItem(eventId: string, itemId: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/events/${eventId}/checklist/${itemId}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);