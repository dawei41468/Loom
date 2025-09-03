// Loom API Client - Mock services ready for FastAPI backend replacement
import {
  User,
  Partner,
  Event,
  Proposal,
  Task,
  AvailabilitySlot,
  BusyTimeSlot,
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

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
        if (response.status === 401) {
          // The caller should handle this, e.g., by logging out the user.
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

  async invitePartner(email: string): Promise<ApiResponse<{ partnership_id: string }>> {
    return this.request<ApiResponse<{ partnership_id: string }>>('/partner/invite', {
      method: 'POST',
      body: JSON.stringify({ invited_user_email: email }),
    });
  }

  async acceptPartnership(partnershipId: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/partner/accept/${partnershipId}`, {
      method: 'POST',
    });
  }

  async declinePartnership(partnershipId: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/partner/decline/${partnershipId}`, {
      method: 'POST',
    });
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
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);