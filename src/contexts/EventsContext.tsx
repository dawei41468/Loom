import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { CalendarView, EventFilter } from '../types';

 

// 1. Define State Shape
interface EventsState {
  isLoading: boolean;
  filter: EventFilter;
  calendarView: CalendarView;
}

// 2. Define Action Types
type EventsAction =
  | { type: 'SET_EVENTS_LOADING'; payload: boolean }
  | { type: 'SET_EVENT_FILTER'; payload: EventFilter }
  | { type: 'SET_CALENDAR_VIEW'; payload: CalendarView };

// 3. Initial State
const initialState: EventsState = {
  isLoading: false,
  filter: { type: 'all' },
  calendarView: { type: '3day', date: new Date().toISOString().split('T')[0] },
};

// 4. Reducer Function
const eventsReducer = (state: EventsState, action: EventsAction): EventsState => {
  switch (action.type) {
    case 'SET_EVENTS_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_EVENT_FILTER':
      return { ...state, filter: action.payload };
    case 'SET_CALENDAR_VIEW':
      return { ...state, calendarView: action.payload };
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
    setEventsLoading: useCallback((loading: boolean) => dispatch({ type: 'SET_EVENTS_LOADING', payload: loading }), [dispatch]),
    setEventFilter: useCallback((filter: EventFilter) => dispatch({ type: 'SET_EVENT_FILTER', payload: filter }), [dispatch]),
    setCalendarView: useCallback((view: CalendarView) => dispatch({ type: 'SET_CALENDAR_VIEW', payload: view }), [dispatch]),
  };
};