// Color utility functions for resolving user and partner colors

/**
 * Resolve a color token ('user' | 'partner' | '#RRGGBB') to a CSS color string
 * Falls back to default theme colors if token is invalid or missing
 */
export const resolveColor = (token?: string): string => {
  if (!token) return 'hsl(var(--loom-user))';
  if (token === 'user') return 'hsl(var(--loom-user))';
  if (token === 'partner') return 'hsl(var(--loom-partner))';

  // Check if it's a valid hex color
  if (token.startsWith('#') && /^#[0-9A-F]{6}$/i.test(token)) {
    return token;
  }

  // Fallback to default user color for invalid tokens
  return 'hsl(var(--loom-user))';
};

/**
 * Get the appropriate color for a user based on whether they are the current user or their partner
 */
export const getUserDisplayColor = (
  userId: string,
  currentUserId?: string,
  partnerId?: string,
  currentUserColor?: string,
  partnerColor?: string
): string => {
  if (userId === currentUserId) {
    return resolveColor(currentUserColor);
  }
  if (userId === partnerId) {
    return resolveColor(partnerColor);
  }
  // Default fallback
  return 'hsl(var(--loom-user))';
};

/**
 * Get color for event based on creator and current user context
 */
export const getEventColor = (
  eventCreatorId: string,
  currentUserId?: string,
  partnerId?: string,
  currentUserColor?: string,
  partnerColor?: string
): string => {
  if (eventCreatorId === currentUserId) {
    return resolveColor(currentUserColor);
  }
  if (eventCreatorId === partnerId) {
    return resolveColor(partnerColor);
  }
  // For shared events or unknown creators, use shared color
  return 'hsl(var(--loom-shared))';
};