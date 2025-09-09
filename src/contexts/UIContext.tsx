import React, { createContext, useContext, useReducer, useEffect } from 'react';

 

// 1. Define State Shape
interface UIState {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'zh';
}

// 2. Define Action Types
type UIAction =
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'SET_LANGUAGE'; payload: 'en' | 'zh' };

// 3. Initial State
const initialState: UIState = {
  theme: 'light',
  language: 'en',
};

// 4. LocalStorage keys
const UI_STORAGE_KEY = 'ui-preferences';

// 5. Load from localStorage
const loadFromStorage = (): UIState | null => {
  try {
    const stored = localStorage.getItem(UI_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// 6. Save to localStorage
const saveToStorage = (state: UIState) => {
  try {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save UI preferences:', error);
  }
};

// 7. Reducer Function
const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    default:
      return state;
  }
};

// 8. Create Contexts
const UIStateContext = createContext<UIState | undefined>(undefined);
const UIDispatchContext = createContext<React.Dispatch<UIAction> | undefined>(undefined);

// 9. UI Provider Component
export const UIProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(uiReducer, initialState, () => {
    const stored = loadFromStorage();
    return stored || initialState;
  });

  // Persist to localStorage on state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  return (
    <UIStateContext.Provider value={state}>
      <UIDispatchContext.Provider value={dispatch}>
        {children}
      </UIDispatchContext.Provider>
    </UIStateContext.Provider>
  );
};

// 10. Custom Hooks
export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (context === undefined) {
    throw new Error('useUIState must be used within a UIProvider');
  }
  return context;
};

export const useUIDispatch = () => {
  const context = useContext(UIDispatchContext);
  if (context === undefined) {
    throw new Error('useUIDispatch must be used within a UIProvider');
  }
  return context;
};

// 11. Convenience hooks that match the original Zustand selectors
export const useTheme = () => {
  const state = useUIState();
  return state.theme;
};

export const useLanguage = () => {
  const state = useUIState();
  return state.language;
};

// 12. Action creators for convenience
export const useUIActions = () => {
  const dispatch = useUIDispatch();
  
  return {
    setTheme: (theme: 'light' | 'dark' | 'system') => dispatch({ type: 'SET_THEME', payload: theme }),
    setLanguage: (language: 'en' | 'zh') => dispatch({ type: 'SET_LANGUAGE', payload: language }),
  };
};