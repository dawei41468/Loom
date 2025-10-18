import { useQuery } from '@tanstack/react-query';
import { useAuthState } from '../contexts/AuthContext';
import { queryKeys, userQueries, partnerQueries } from '../api/queries';
import { resolveColor } from '../utils/colorUtils';

/**
 * Hook that provides resolved colors for the current user and their partner
 * Returns functions and resolved color values for consistent color application
 */
export const useUserColors = () => {
  const { user, partner } = useAuthState();

  // Get fresh user data
  const { data: meData } = useQuery({
    queryKey: queryKeys.user,
    queryFn: userQueries.getMe,
    staleTime: 30000,
  });
  const meUser = meData?.data || user;

  // Get fresh partner data
  const { data: partnerData } = useQuery({
    queryKey: ['partner'],
    queryFn: partnerQueries.getPartner,
    staleTime: 30000,
  });
  const currentPartner = partnerData?.data || partner;

  // Resolve colors with fallbacks
  const userColor = resolveColor(meUser?.ui_self_color);
  const partnerColor = resolveColor(meUser?.ui_partner_color);

  /**
   * Get the appropriate color for a user ID
   */
  const getUserColor = (userId: string): string => {
    if (userId === meUser?.id) {
      return userColor;
    }
    if (userId === currentPartner?.id) {
      return partnerColor;
    }
    return 'hsl(var(--loom-user))'; // Default fallback
  };

  /**
   * Get color for an event based on its creator
   */
  const getEventColor = (eventCreatorId: string): string => {
    if (eventCreatorId === meUser?.id) {
      return userColor;
    }
    if (eventCreatorId === currentPartner?.id) {
      return partnerColor;
    }
    return 'hsl(var(--loom-shared))'; // Default for shared/unknown
  };

  /**
   * Check if a user ID belongs to the current user
   */
  const isCurrentUser = (userId: string): boolean => {
    return userId === meUser?.id;
  };

  /**
   * Check if a user ID belongs to the current user's partner
   */
  const isPartner = (userId: string): boolean => {
    return userId === currentPartner?.id;
  };

  return {
    // Resolved color values
    userColor,
    partnerColor,

    // Utility functions
    getUserColor,
    getEventColor,
    isCurrentUser,
    isPartner,

    // Raw data for advanced usage
    currentUser: meUser,
    partner: currentPartner,
  };
};