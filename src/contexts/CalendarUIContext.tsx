import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { CalendarView, EventFilter } from '../types';

// 1. Define State Shape
interface CalendarUIState {
  isLoading: boolean;
  filter: EventFilter;
  calendarView: CalendarView;
}

// 2. Define Action Types
type CalendarUIAction =
  | { type: 'SET_EVENTS_LOADING'; payload: boolean }
  | { type: 'SET_EVENT_FILTER'; payload: EventFilter }
  | { type: 'SET_CALENDAR_VIEW'; payload: CalendarView };

// 3. Initial State
const initialState: CalendarUIState = {
  isLoading: false,
  filter: { type: 'all' },
  calendarView: { type: '3day', date: new Date().toISOString().split('T')[0] },
};

// 4. Reducer Function
const calendarUIReducer = (state: CalendarUIState, action: CalendarUIAction): CalendarUIState => {
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
const CalendarUIStateContext = createContext<CalendarUIState | undefined>(undefined);
const CalendarUIDispatchContext = createContext<React.Dispatch<CalendarUIAction> | undefined>(undefined);

// 6. Provider Component
export const CalendarUIProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(calendarUIReducer, initialState);

  return (
    <CalendarUIStateContext.Provider value={state}>
      <CalendarUIDispatchContext.Provider value={dispatch}>
        {children}
      </CalendarUIDispatchContext.Provider>
    </CalendarUIStateContext.Provider>
  );
};

// 7. State selectors
export const useCalendarUIState = () => {
  const context = useContext(CalendarUIStateContext);
  if (context === undefined) {
    throw new Error('useCalendarUIState must be used within a CalendarUIProvider');
  }
  return context;
};

export const useCalendarUIDispatch = () => {
  const context = useContext(CalendarUIDispatchContext);
  if (context === undefined) {
    throw new Error('useCalendarUIDispatch must be used within a CalendarUIProvider');
  }
  return context;
};

export const useEventsLoading = () => {
  const state = useCalendarUIState();
  return state.isLoading;
};

export const useEventFilter = () => {
  const state = useCalendarUIState();
  return state.filter;
};

export const useCalendarView = () => {
  const state = useCalendarUIState();
  return state.calendarView;
};

// 8. Actions
export const useCalendarUIActions = () => {
  const dispatch = useCalendarUIDispatch();

  return {
    setEventsLoading: useCallback((loading: boolean) => dispatch({ type: 'SET_EVENTS_LOADING', payload: loading }), [dispatch]),
    setEventFilter: useCallback((filter: EventFilter) => dispatch({ type: 'SET_EVENT_FILTER', payload: filter }), [dispatch]),
    setCalendarView: useCallback((view: CalendarView) => dispatch({ type: 'SET_CALENDAR_VIEW', payload: view }), [dispatch]),
  };
};
