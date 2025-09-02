import React, { createContext, useContext, useReducer } from 'react';
import { Task } from '../types';

 

// 1. Define State Shape
interface TasksState {
  tasks: Task[];
  isLoading: boolean;
}

// 2. Define Action Types
type TasksAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { taskId: string; updates: Partial<Task> } }
  | { type: 'REMOVE_TASK'; payload: string }
  | { type: 'SET_TASKS_LOADING'; payload: boolean };

// 3. Initial State
const initialState: TasksState = {
  tasks: [],
  isLoading: false,
};

// 4. Reducer Function
const tasksReducer = (state: TasksState, action: TasksAction): TasksState => {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.taskId ? { ...task, ...action.payload.updates } : task
        ),
      };
    case 'REMOVE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
      };
    case 'SET_TASKS_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

// 5. Create Contexts
const TasksStateContext = createContext<TasksState | undefined>(undefined);
const TasksDispatchContext = createContext<React.Dispatch<TasksAction> | undefined>(undefined);

// 6. Tasks Provider Component
export const TasksProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(tasksReducer, initialState);

  return (
    <TasksStateContext.Provider value={state}>
      <TasksDispatchContext.Provider value={dispatch}>
        {children}
      </TasksDispatchContext.Provider>
    </TasksStateContext.Provider>
  );
};

// 7. Custom Hooks
export const useTasksState = () => {
  const context = useContext(TasksStateContext);
  if (context === undefined) {
    throw new Error('useTasksState must be used within a TasksProvider');
  }
  return context;
};

export const useTasksDispatch = () => {
  const context = useContext(TasksDispatchContext);
  if (context === undefined) {
    throw new Error('useTasksDispatch must be used within a TasksProvider');
  }
  return context;
};

// 8. Convenience hooks that match the original Zustand selectors
export const useTasks = () => {
  const state = useTasksState();
  return state.tasks;
};

export const useTasksLoading = () => {
  const state = useTasksState();
  return state.isLoading;
};

// 9. Action creators for convenience
export const useTasksActions = () => {
  const dispatch = useTasksDispatch();
  
  return {
    setTasks: (tasks: Task[]) => dispatch({ type: 'SET_TASKS', payload: tasks }),
    addTask: (task: Task) => dispatch({ type: 'ADD_TASK', payload: task }),
    updateTask: (taskId: string, updates: Partial<Task>) => 
      dispatch({ type: 'UPDATE_TASK', payload: { taskId, updates } }),
    removeTask: (taskId: string) => dispatch({ type: 'REMOVE_TASK', payload: taskId }),
    setTasksLoading: (loading: boolean) => dispatch({ type: 'SET_TASKS_LOADING', payload: loading }),
  };
};