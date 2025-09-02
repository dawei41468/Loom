// UI Store - Focused on UI preferences only (no toasts - handled separately)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'zh';
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'en' | 'zh') => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // State
      theme: 'system',
      language: 'en',
      
      // Actions
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'loom-ui-store',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
      }),
    }
  )
);

// Atomic selectors
export const useTheme = () => useUIStore((state) => state.theme);
export const useLanguage = () => useUIStore((state) => state.language);

// Action selectors
export const useUIActions = () => useUIStore((state) => ({
  setTheme: state.setTheme,
  setLanguage: state.setLanguage,
}));