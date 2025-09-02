// Loom API Client - Mock services ready for FastAPI backend replacement
import { 
  User, 
  Partner, 
  Event, 
  Proposal, 
  Task, 
  AvailabilitySlot,
  ApiResponse 
} from '../types';
import { addDays, addHours, format, startOfWeek } from 'date-fns';

// Configuration
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Mock delay to simulate network
const mockDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data
const MOCK_USER: User = {
  id: 'user-1',
  email: 'alex@example.com',
  display_name: 'Alex',
  color_preference: 'user',
  timezone: 'America/New_York',
  language: 'en',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_PARTNER: Partner = {
  id: 'user-2',
  display_name: 'Jordan',
  color_preference: 'partner',
  timezone: 'America/New_York',
  invite_status: 'accepted',
  connected_at: new Date().toISOString(),
};

// Generate mock events for this week
const generateMockEvents = (): Event[] => {
  const events: Event[] = [];
  const weekStart = startOfWeek(new Date());
  
  // User events
  events.push({
    id: 'event-1',
    title: 'Morning Workout',
    start_time: addHours(weekStart, 7).toISOString(),
    end_time: addHours(weekStart, 8).toISOString(),
    visibility: 'shared',
    attendees: [MOCK_USER.id],
    created_by: MOCK_USER.id,
    reminders: [10],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  events.push({
    id: 'event-2',
    title: 'Team Meeting',
    description: 'Weekly standup with the team',
    start_time: addHours(weekStart, 34).toISOString(), // Day 1, 10 AM
    end_time: addHours(weekStart, 35).toISOString(),
    visibility: 'title_only',
    attendees: [MOCK_USER.id],
    created_by: MOCK_USER.id,
    reminders: [15, 5],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Partner events
  events.push({
    id: 'event-3',
    title: 'Lunch Break',
    start_time: addHours(weekStart, 37).toISOString(), // Day 1, 1 PM
    end_time: addHours(weekStart, 38).toISOString(),
    visibility: 'shared',
    attendees: [MOCK_PARTNER.id],
    created_by: MOCK_PARTNER.id,
    reminders: [5],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Shared events
  events.push({
    id: 'event-4',
    title: 'Date Night',
    description: 'Dinner at that new Italian place',
    location: '123 Main St',
    start_time: addHours(weekStart, 43).toISOString(), // Day 1, 7 PM
    end_time: addHours(weekStart, 46).toISOString(),
    visibility: 'shared',
    attendees: [MOCK_USER.id, MOCK_PARTNER.id],
    created_by: MOCK_USER.id,
    reminders: [30, 10],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  events.push({
    id: 'event-5',
    title: 'Weekend Hike',
    description: 'Trail at Bear Mountain',
    location: 'Bear Mountain State Park',
    start_time: addDays(addHours(weekStart, 10), 5).toISOString(), // Saturday 10 AM
    end_time: addDays(addHours(weekStart, 14), 5).toISOString(),
    visibility: 'shared',
    attendees: [MOCK_USER.id, MOCK_PARTNER.id],
    created_by: MOCK_PARTNER.id,
    reminders: [60],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return events;
};

const MOCK_EVENTS = generateMockEvents();

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'proposal-1',
    title: 'Movie Night',
    description: 'Want to watch that new sci-fi movie?',
    proposed_times: [
      {
        start_time: addDays(addHours(new Date(), 19), 1).toISOString(),
        end_time: addDays(addHours(new Date(), 22), 1).toISOString(),
      },
      {
        start_time: addDays(addHours(new Date(), 20), 2).toISOString(),
        end_time: addDays(addHours(new Date(), 23), 2).toISOString(),
      },
    ],
    proposed_by: MOCK_PARTNER.id,
    proposed_to: MOCK_USER.id,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'proposal-2',
    title: 'Coffee Catch-up',
    proposed_times: [
      {
        start_time: addDays(addHours(new Date(), 9), 3).toISOString(),
        end_time: addDays(addHours(new Date(), 10), 3).toISOString(),
      },
    ],
    proposed_by: MOCK_USER.id,
    proposed_to: MOCK_PARTNER.id,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Buy groceries',
    due_date: addDays(new Date(), 1).toISOString(),
    completed: false,
    created_by: MOCK_USER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Book restaurant for anniversary',
    due_date: addDays(new Date(), 7).toISOString(),
    completed: false,
    created_by: MOCK_PARTNER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'Order birthday gift',
    completed: true,
    created_by: MOCK_USER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// API Client Class
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!USE_REAL_API) {
      // Mock implementation
      await mockDelay();
      return this.mockRequest<T>(endpoint, options);
    }

    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  private async mockRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body as string) : null;

    // Mock routing
    if (endpoint === '/auth/me' && method === 'GET') {
      return { data: MOCK_USER } as T;
    }

    if (endpoint === '/partner' && method === 'GET') {
      return { data: MOCK_PARTNER } as T;
    }

    if (endpoint === '/events' && method === 'GET') {
      return { data: MOCK_EVENTS } as T;
    }

    if (endpoint === '/events' && method === 'POST') {
      const newEvent: Event = {
        ...body,
        id: `event-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_EVENTS.push(newEvent);
      return { data: newEvent } as T;
    }

    if (endpoint === '/proposals' && method === 'GET') {
      return { data: MOCK_PROPOSALS } as T;
    }

    if (endpoint === '/proposals' && method === 'POST') {
      const newProposal: Proposal = {
        ...body,
        id: `proposal-${Date.now()}`,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_PROPOSALS.push(newProposal);
      return { data: newProposal } as T;
    }

    if (endpoint.includes('/proposals/') && endpoint.includes('/accept') && method === 'POST') {
      const proposalId = endpoint.split('/')[2];
      const proposal = MOCK_PROPOSALS.find(p => p.id === proposalId);
      if (proposal && body.selected_time_slot) {
        proposal.status = 'accepted';
        proposal.accepted_time_slot = body.selected_time_slot;
        
        // Create event from accepted proposal
        const newEvent: Event = {
          id: `event-${Date.now()}`,
          title: proposal.title,
          description: proposal.description,
          start_time: body.selected_time_slot.start_time,
          end_time: body.selected_time_slot.end_time,
          visibility: 'shared',
          attendees: [proposal.proposed_by, proposal.proposed_to],
          created_by: proposal.proposed_by,
          reminders: [10],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        MOCK_EVENTS.push(newEvent);
        
        return { data: { proposal, event: newEvent } } as T;
      }
    }

    if (endpoint === '/tasks' && method === 'GET') {
      return { data: MOCK_TASKS } as T;
    }

    if (endpoint === '/tasks' && method === 'POST') {
      const newTask: Task = {
        ...body,
        id: `task-${Date.now()}`,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_TASKS.push(newTask);
      return { data: newTask } as T;
    }

    if (endpoint.includes('/tasks/') && endpoint.includes('/toggle') && method === 'PATCH') {
      const taskId = endpoint.split('/')[2];
      const task = MOCK_TASKS.find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        task.updated_at = new Date().toISOString();
        return { data: task } as T;
      }
    }

    if (endpoint === '/availability/find-overlap' && method === 'POST') {
      // Mock availability calculation
      const slots: AvailabilitySlot[] = [
        {
          start_time: addDays(addHours(new Date(), 14), 1).toISOString(), // Tomorrow 2 PM
          end_time: addDays(addHours(new Date(), 16), 1).toISOString(),
          duration_minutes: 120,
        },
        {
          start_time: addDays(addHours(new Date(), 19), 2).toISOString(), // Day after 7 PM
          end_time: addDays(addHours(new Date(), 21), 2).toISOString(),
          duration_minutes: 120,
        },
      ];
      return { data: slots } as T;
    }

    throw new Error(`Mock endpoint not implemented: ${method} ${endpoint}`);
  }

  // Auth
  async getMe(): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/auth/me');
  }

  // Partner
  async getPartner(): Promise<ApiResponse<Partner | null>> {
    return this.request<ApiResponse<Partner | null>>('/partner');
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
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export mock data for development
export { MOCK_USER, MOCK_PARTNER, MOCK_EVENTS, MOCK_PROPOSALS, MOCK_TASKS };