// Events Store - Focused on events and proposals
import { create } from 'zustand';
import { Event, Proposal, CalendarView, EventFilter } from '../types';

interface EventsStore {
  events: Event[];
  proposals: Proposal[];
  isLoading: boolean;
  filter: EventFilter;
  calendarView: CalendarView;
  
  // Actions
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
  updateEvent: (eventId: string, updates: Partial<Event>) => void;
  removeEvent: (eventId: string) => void;
  setEventsLoading: (loading: boolean) => void;
  setEventFilter: (filter: EventFilter) => void;
  setCalendarView: (view: CalendarView) => void;
  setProposals: (proposals: Proposal[]) => void;
  addProposal: (proposal: Proposal) => void;
  updateProposal: (proposalId: string, updates: Partial<Proposal>) => void;
  removeProposal: (proposalId: string) => void;
}

export const useEventsStore = create<EventsStore>((set) => ({
  // State
  events: [],
  proposals: [],
  isLoading: false,
  filter: { type: 'all' },
  calendarView: { type: '3day', date: new Date().toISOString().split('T')[0] },
  
  // Actions
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
}));

// Atomic selectors
export const useEvents = () => useEventsStore((state) => state.events);
export const useProposals = () => useEventsStore((state) => state.proposals);
export const useEventsLoading = () => useEventsStore((state) => state.isLoading);
export const useEventFilter = () => useEventsStore((state) => state.filter);
export const useCalendarView = () => useEventsStore((state) => state.calendarView);

// Action selectors - stable references to prevent re-renders
export const useEventsActions = () => ({
  setEvents: useEventsStore.getState().setEvents,
  addEvent: useEventsStore.getState().addEvent,
  updateEvent: useEventsStore.getState().updateEvent,
  removeEvent: useEventsStore.getState().removeEvent,
  setEventsLoading: useEventsStore.getState().setEventsLoading,
  setEventFilter: useEventsStore.getState().setEventFilter,
  setCalendarView: useEventsStore.getState().setCalendarView,
  setProposals: useEventsStore.getState().setProposals,
  addProposal: useEventsStore.getState().addProposal,
  updateProposal: useEventsStore.getState().updateProposal,
  removeProposal: useEventsStore.getState().removeProposal,
});