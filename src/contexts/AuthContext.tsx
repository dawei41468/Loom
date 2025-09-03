import React, { createContext, useReducer, useContext, useEffect } from 'react';
import { User, Partner, Token } from '../types';
import { apiClient } from '../api/client';

 

// 1. Define State Shape
interface AuthState {
  user: User | null;
  partner: Partner | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
}

// 2. Define Action Types
type AuthAction =
  | { type: 'LOGIN'; payload: { token: string; refreshToken: string; user: User } }
  | { type: 'REFRESH_TOKENS'; payload: { token: string; refreshToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_PARTNER'; payload: Partner | null }
  | { type: 'SET_ONBOARDED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean };

// 3. Initial State
const initialState: AuthState = {
  user: null,
  partner: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isOnboarded: false,
  isLoading: true,
};

// 4. Reducer Function
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        isAuthenticated: true,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        user: action.payload.user,
        isOnboarded: action.payload.user.is_onboarded || false,
      };
    case 'REFRESH_TOKENS':
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isOnboarded: action.payload?.is_onboarded || false,
      };
    case 'SET_PARTNER':
      return {
        ...state,
        partner: action.payload,
      };
    case 'SET_ONBOARDED':
      return {
        ...state,
        isOnboarded: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

// 5. Create Contexts
const AuthStateContext = createContext<AuthState | undefined>(undefined);
const AuthDispatchContext = createContext<React.Dispatch<AuthAction> | undefined>(undefined);

// 6. Auth Provider Component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState, (initializer) => {
    try {
      const token = localStorage.getItem('loom-auth-token');
      const refreshToken = localStorage.getItem('loom-auth-refresh-token');
      const userString = localStorage.getItem('loom-auth-user');
      if (token && refreshToken && userString) {
        const user: User = JSON.parse(userString);
        apiClient.setToken(token);
        apiClient.setRefreshToken(refreshToken);
        return {
          ...initializer,
          isAuthenticated: true,
          token,
          refreshToken,
          user,
          isOnboarded: user.is_onboarded,
        };
      }
    } catch (error) {
      console.error("Failed to parse auth data from localStorage", error);
    }
    return initializer;
  });

  useEffect(() => {
    // Set loading to false after initial authentication check
    if (state.isLoading) {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.isLoading]);

  useEffect(() => {
    // Set up token refresh callback
    apiClient.setOnTokensRefreshed((tokens: Token) => {
      dispatch({
        type: 'REFRESH_TOKENS',
        payload: { token: tokens.access_token, refreshToken: tokens.refresh_token }
      });
    });
  }, []);

  useEffect(() => {
    // Persist token and user to localStorage
    if (state.token && state.refreshToken && state.user) {
      localStorage.setItem('loom-auth-token', state.token);
      localStorage.setItem('loom-auth-refresh-token', state.refreshToken);
      localStorage.setItem('loom-auth-user', JSON.stringify(state.user));
      apiClient.setToken(state.token);
      apiClient.setRefreshToken(state.refreshToken);
    } else {
      localStorage.removeItem('loom-auth-token');
      localStorage.removeItem('loom-auth-refresh-token');
      localStorage.removeItem('loom-auth-user');
      apiClient.setToken(null);
      apiClient.setRefreshToken(null);
    }
  }, [state.token, state.refreshToken, state.user]);

  return (
    <AuthStateContext.Provider value={state}>
      <AuthDispatchContext.Provider value={dispatch}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  );
};

// 7. Custom Hooks
export const useAuthState = () => {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }
  return context;
};

export const useAuthDispatch = () => {
  const context = useContext(AuthDispatchContext);
  if (context === undefined) {
    throw new Error('useAuthDispatch must be used within an AuthProvider');
  }
  return context;
};