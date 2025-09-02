// Auth Store - Focused on authentication state only
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Partner } from '../types';

interface AuthStore {
  user: User | null;
  partner: Partner | null;
  isOnboarded: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setPartner: (partner: Partner | null) => void;
  setOnboarded: (onboarded: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // State
      user: null,
      partner: null,
      isOnboarded: false,
      
      // Actions
      setUser: (user) => set({ user }),
      setPartner: (partner) => set({ partner }),
      setOnboarded: (onboarded) => set({ isOnboarded: onboarded }),
    }),
    {
      name: 'loom-auth-store',
      partialize: (state) => ({
        user: state.user,
        partner: state.partner,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
);

// Atomic selectors - return primitive values to prevent object recreation
export const useUser = () => useAuthStore((state) => state.user);
export const usePartner = () => useAuthStore((state) => state.partner);
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user);
export const useIsOnboarded = () => useAuthStore((state) => state.isOnboarded);

// Individual action selectors - stable references
export const useSetUser = () => useAuthStore((state) => state.setUser);
export const useSetPartner = () => useAuthStore((state) => state.setPartner);
export const useSetOnboarded = () => useAuthStore((state) => state.setOnboarded);

// Combined action selectors - for convenience
export const useAuthActions = () => ({
  setUser: useAuthStore.getState().setUser,
  setPartner: useAuthStore.getState().setPartner,
  setOnboarded: useAuthStore.getState().setOnboarded,
});