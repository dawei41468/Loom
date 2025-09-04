import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { Event, Proposal, CalendarView, EventFilter } from '../types';

 

// 1. Define State Shape
interface EventsState {
  events: Event[];
  proposals: Proposal[];
  isLoading: boolean;
  filter: EventFilter;
  calendarView: CalendarView;
}

// 2. Define Action Types
type EventsAction =
  | { type: 'SET_EVENTS'; payload: Event[] }
  | { type: 'ADD_EVENT'; payload: Event }
  | { type: 'UPDATE_EVENT'; payload: { eventId: string; updates: Partial<Event> } }
  | { type: 'REMOVE_EVENT'; payload: string }
  | { type: 'SET_EVENTS_LOADING'; payload: boolean }
  | { type: 'SET_EVENT_FILTER'; payload: EventFilter }
  | { type: 'SET_CALENDAR_VIEW'; payload: CalendarView }
  | { type: 'SET_PROPOSALS'; payload: Proposal[] }
  | { type: 'ADD_PROPOSAL'; payload: Proposal }
  | { type: 'UPDATE_PROPOSAL'; payload: { proposalId: string; updates: Partial<Proposal> } }
  | { type: 'REMOVE_PROPOSAL'; payload: string };

// 3. Initial State
const initialState: EventsState = {
  events: [],
  proposals: [],
  isLoading: false,
  filter: { type: 'all' },
  calendarView: { type: '3day', date: new Date().toISOString().split('T')[0] },
};

// 4. Reducer Function
const eventsReducer = (state: EventsState, action: EventsAction): EventsState => {
  switch (action.type) {
    case 'SET_EVENTS':
      return { ...state, events: action.payload };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map(event =>
          event.id === action.payload.eventId ? { ...event, ...action.payload.updates } : event
        ),
      };
    case 'REMOVE_EVENT':
      return {
        ...state,
        events: state.events.filter(event => event.id !== action.payload),
      };
    case 'SET_EVENTS_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_EVENT_FILTER':
      return { ...state, filter: action.payload };
    case 'SET_CALENDAR_VIEW':
      return { ...state, calendarView: action.payload };
    case 'SET_PROPOSALS':
      return { ...state, proposals: action.payload };
    case 'ADD_PROPOSAL':
      return { ...state, proposals: [...state.proposals, action.payload] };
    case 'UPDATE_PROPOSAL':
      return {
        ...state,
        proposals: state.proposals.map(proposal =>
          proposal.id === action.payload.proposalId ? { ...proposal, ...action.payload.updates } : proposal
        ),
      };
    case 'REMOVE_PROPOSAL':
      return {
        ...state,
        proposals: state.proposals.filter(proposal => proposal.id !== action.payload),
      };
    default:
      return state;
  }
};

// 5. Create Contexts
const EventsStateContext = createContext<EventsState | undefined>(undefined);
const EventsDispatchContext = createContext<React.Dispatch<EventsAction> | undefined>(undefined);

// 6. Events Provider Component
export const EventsProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(eventsReducer, initialState);

  return (
    <EventsStateContext.Provider value={state}>
      <EventsDispatchContext.Provider value={dispatch}>
        {children}
      </EventsDispatchContext.Provider>
    </EventsStateContext.Provider>
  );
};

// 7. Custom Hooks
export const useEventsState = () => {
  const context = useContext(EventsStateContext);
  if (context === undefined) {
    throw new Error('useEventsState must be used within an EventsProvider');
  }
  return context;
};

export const useEventsDispatch = () => {
  const context = useContext(EventsDispatchContext);
  if (context === undefined) {
    throw new Error('useEventsDispatch must be used within an EventsProvider');
  }
  return context;
};

// 8. Convenience hooks that match the original Zustand selectors
export const useEvents = () => {
  const state = useEventsState();
  return state.events;
};

export const useProposals = () => {
  const state = useEventsState();
  return state.proposals;
};

export const useEventsLoading = () => {
  const state = useEventsState();
  return state.isLoading;
};

export const useEventFilter = () => {
  const state = useEventsState();
  return state.filter;
};

export const useCalendarView = () => {
  const state = useEventsState();
  return state.calendarView;
};

// 9. Action creators for convenience
export const useEventsActions = () => {
  const dispatch = useEventsDispatch();
  
  return {
    setEvents: useCallback((events: Event[]) => dispatch({ type: 'SET_EVENTS', payload: events }), [dispatch]),
    addEvent: useCallback((event: Event) => dispatch({ type: 'ADD_EVENT', payload: event }), [dispatch]),
    updateEvent: useCallback((eventId: string, updates: Partial<Event>) =>
      dispatch({ type: 'UPDATE_EVENT', payload: { eventId, updates } }), [dispatch]),
    removeEvent: useCallback((eventId: string) => dispatch({ type: 'REMOVE_EVENT', payload: eventId }), [dispatch]),
    setEventsLoading: useCallback((loading: boolean) => dispatch({ type: 'SET_EVENTS_LOADING', payload: loading }), [dispatch]),
    setEventFilter: useCallback((filter: EventFilter) => dispatch({ type: 'SET_EVENT_FILTER', payload: filter }), [dispatch]),
    setCalendarView: useCallback((view: CalendarView) => dispatch({ type: 'SET_CALENDAR_VIEW', payload: view }), [dispatch]),
    setProposals: useCallback((proposals: Proposal[]) => dispatch({ type: 'SET_PROPOSALS', payload: proposals }), [dispatch]),
    addProposal: useCallback((proposal: Proposal) => dispatch({ type: 'ADD_PROPOSAL', payload: proposal }), [dispatch]),
    updateProposal: useCallback((proposalId: string, updates: Partial<Proposal>) =>
      dispatch({ type: 'UPDATE_PROPOSAL', payload: { proposalId, updates } }), [dispatch]),
    removeProposal: useCallback((proposalId: string) => dispatch({ type: 'REMOVE_PROPOSAL', payload: proposalId }), [dispatch]),
  };
};