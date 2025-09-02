// Loom Global Store - Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  User, 
  Partner, 
  Event, 
  Proposal, 
  Task, 
  CalendarView, 
  EventFilter, 
  Toast 
} from '../types';

interface AuthState {
  user: User | null;
  partner: Partner | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
}

interface EventsState {
  events: Event[];
  proposals: Proposal[];
  isLoading: boolean;
  filter: EventFilter;
  calendarView: CalendarView;
}

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
}

interface UIState {
  toasts: Toast[];
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'zh';
}

interface LoomState extends AuthState, EventsState, TasksState, UIState {
  // Auth actions
  setUser: (user: User | null) => void;
  setPartner: (partner: Partner | null) => void;
  setOnboarded: (onboarded: boolean) => void;
  
  // Events actions
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
  updateEvent: (eventId: string, updates: Partial<Event>) => void;
  removeEvent: (eventId: string) => void;
  setEventsLoading: (loading: boolean) => void;
  setEventFilter: (filter: EventFilter) => void;
  setCalendarView: (view: CalendarView) => void;
  
  // Proposals actions
  setProposals: (proposals: Proposal[]) => void;
  addProposal: (proposal: Proposal) => void;
  updateProposal: (proposalId: string, updates: Partial<Proposal>) => void;
  removeProposal: (proposalId: string) => void;
  
  // Tasks actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  setTasksLoading: (loading: boolean) => void;
  
  // UI actions
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (toastId: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'en' | 'zh') => void;
}

export const useLoomStore = create<LoomState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      partner: null,
      isAuthenticated: false,
      isOnboarded: false,
      
      events: [],
      proposals: [],
      isLoading: false,
      filter: { type: 'all' },
      calendarView: { type: '3day', date: new Date().toISOString().split('T')[0] },
      
      tasks: [],
      
      toasts: [],
      theme: 'system',
      language: 'en',
      
      // Auth actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setPartner: (partner) => set({ partner }),
      setOnboarded: (onboarded) => set({ isOnboarded: onboarded }),
      
      // Events actions
      setEvents: (events) => set({ events }),
      addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
      updateEvent: (eventId, updates) => set((state) => ({
        events: state.events.map(event => 
          event.id === eventId ? { ...event, ...updates } : event
        )
      })),
      removeEvent: (eventId) => set((state) => ({
        events: state.events.filter(event => event.id !== eventId)
      })),
      setEventsLoading: (loading) => set({ isLoading: loading }),
      setEventFilter: (filter) => set({ filter }),
      setCalendarView: (view) => set({ calendarView: view }),
      
      // Proposals actions
      setProposals: (proposals) => set({ proposals }),
      addProposal: (proposal) => set((state) => ({ proposals: [...state.proposals, proposal] })),
      updateProposal: (proposalId, updates) => set((state) => ({
        proposals: state.proposals.map(proposal => 
          proposal.id === proposalId ? { ...proposal, ...updates } : proposal
        )
      })),
      removeProposal: (proposalId) => set((state) => ({
        proposals: state.proposals.filter(proposal => proposal.id !== proposalId)
      })),
      
      // Tasks actions
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (taskId, updates) => set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        )
      })),
      removeTask: (taskId) => set((state) => ({
        tasks: state.tasks.filter(task => task.id !== taskId)
      })),
      setTasksLoading: (loading) => set({ isLoading: loading }),
      
      // UI actions
      addToast: (toast) => {
        const id = Date.now().toString();
        const newToast = { ...toast, id };
        set((state) => ({ toasts: [...state.toasts, newToast] }));
        
        // Auto-remove toast after duration using a proper cleanup approach
        if (toast.duration !== 0) {
          setTimeout(() => {
            set((state) => ({
              toasts: state.toasts.filter(t => t.id !== id)
            }));
          }, toast.duration || 5000);
        }
      },
      removeToast: (toastId) => set((state) => ({
        toasts: state.toasts.filter(toast => toast.id !== toastId)
      })),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'loom-store',
      partialize: (state) => ({
        user: state.user,
        partner: state.partner,
        isOnboarded: state.isOnboarded,
        theme: state.theme,
        language: state.language,
        calendarView: state.calendarView,
        filter: state.filter,
      }),
    }
  )
);

// Selectors
export const useAuth = () => useLoomStore((state) => ({
  user: state.user,
  partner: state.partner,
  isAuthenticated: state.isAuthenticated,
  isOnboarded: state.isOnboarded,
  setUser: state.setUser,
  setPartner: state.setPartner,
  setOnboarded: state.setOnboarded,
}));

export const useEvents = () => useLoomStore((state) => ({
  events: state.events,
  proposals: state.proposals,
  isLoading: state.isLoading,
  filter: state.filter,
  calendarView: state.calendarView,
  setEvents: state.setEvents,
  addEvent: state.addEvent,
  updateEvent: state.updateEvent,
  removeEvent: state.removeEvent,
  setEventsLoading: state.setEventsLoading,
  setEventFilter: state.setEventFilter,
  setCalendarView: state.setCalendarView,
  setProposals: state.setProposals,
  addProposal: state.addProposal,
  updateProposal: state.updateProposal,
  removeProposal: state.removeProposal,
}));

export const useTasks = () => useLoomStore((state) => ({
  tasks: state.tasks,
  isLoading: state.isLoading,
  setTasks: state.setTasks,
  addTask: state.addTask,
  updateTask: state.updateTask,
  removeTask: state.removeTask,
  setTasksLoading: state.setTasksLoading,
}));

export const useUI = () => useLoomStore((state) => ({
  toasts: state.toasts,
  theme: state.theme,
  language: state.language,
  addToast: state.addToast,
  removeToast: state.removeToast,
  setTheme: state.setTheme,
  setLanguage: state.setLanguage,
}));