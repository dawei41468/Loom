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
  isUpdatingProfile: boolean;
  profileUpdateError: string | null;
}

// 2. Define Action Types
type AuthAction =
  | { type: 'LOGIN'; payload: { token: string; refreshToken: string; user: User } }
  | { type: 'REFRESH_TOKENS'; payload: { token: string; refreshToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_PARTNER'; payload: Partner | null }
  | { type: 'SET_ONBOARDED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_PROFILE_START' }
  | { type: 'UPDATE_PROFILE_SUCCESS'; payload: User }
  | { type: 'UPDATE_PROFILE_ERROR'; payload: string };

// 3. Initial State
const initialState: AuthState = {
  user: null,
  partner: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isOnboarded: false,
  isLoading: true,
  isUpdatingProfile: false,
  profileUpdateError: null,
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
        user: state.user ? { ...state.user, is_onboarded: action.payload } : null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'UPDATE_PROFILE_START':
      return {
        ...state,
        isUpdatingProfile: true,
        profileUpdateError: null,
      };
    case 'UPDATE_PROFILE_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isUpdatingProfile: false,
        profileUpdateError: null,
      };
    case 'UPDATE_PROFILE_ERROR':
      return {
        ...state,
        isUpdatingProfile: false,
        profileUpdateError: action.payload,
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
      const partnerString = localStorage.getItem('loom-auth-partner');
      if (token && refreshToken && userString) {
        const user: User = JSON.parse(userString);
        const partner: Partner | null = partnerString ? JSON.parse(partnerString) : null;
        apiClient.setToken(token);
        apiClient.setRefreshToken(refreshToken);
        return {
          ...initializer,
          isAuthenticated: true,
          token,
          refreshToken,
          user,
          partner,
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
      if (state.partner) {
        localStorage.setItem('loom-auth-partner', JSON.stringify(state.partner));
      } else {
        localStorage.removeItem('loom-auth-partner');
      }
      apiClient.setToken(state.token);
      apiClient.setRefreshToken(state.refreshToken);
    } else {
      localStorage.removeItem('loom-auth-token');
      localStorage.removeItem('loom-auth-refresh-token');
      localStorage.removeItem('loom-auth-user');
      localStorage.removeItem('loom-auth-partner');
      apiClient.setToken(null);
      apiClient.setRefreshToken(null);
    }
  }, [state.token, state.refreshToken, state.user, state.partner]);

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

// Custom hook for profile updates with API integration
export const useUpdateProfile = () => {
  const dispatch = useAuthDispatch();
  const { user, isUpdatingProfile, profileUpdateError } = useAuthState();

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    dispatch({ type: 'UPDATE_PROFILE_START' });

    try {
      const response = await apiClient.updateMe(updates);
      dispatch({ type: 'UPDATE_PROFILE_SUCCESS', payload: response.data });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      dispatch({ type: 'UPDATE_PROFILE_ERROR', payload: errorMessage });
      throw error;
    }
  };

  return {
    updateProfile,
    isUpdating: isUpdatingProfile,
    error: profileUpdateError,
  };
};