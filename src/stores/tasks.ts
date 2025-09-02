// Tasks Store - Focused on task management
import { create } from 'zustand';
import { Task } from '../types';

interface TasksStore {
  tasks: Task[];
  isLoading: boolean;
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  setTasksLoading: (loading: boolean) => void;
}

export const useTasksStore = create<TasksStore>((set) => ({
  // State
  tasks: [],
  isLoading: false,
  
  // Actions
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
}));

// Atomic selectors
export const useTasks = () => useTasksStore((state) => state.tasks);
export const useTasksLoading = () => useTasksStore((state) => state.isLoading);

// Action selectors
export const useTasksActions = () => useTasksStore((state) => ({
  setTasks: state.setTasks,
  addTask: state.addTask,
  updateTask: state.updateTask,
  removeTask: state.removeTask,
  setTasksLoading: state.setTasksLoading,
}));