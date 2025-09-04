import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { indexedDBManager, createOfflineAction, OfflineAction, isOnline, waitForOnline } from '../utils/indexedDB';
import { apiClient } from '../api/client';
import { queryKeys } from '../api/queries';
import { useToastContext } from '../contexts/ToastContext';

export interface UseOfflineQueueReturn {
  isOnline: boolean;
  pendingActionsCount: number;
  addOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>) => Promise<void>;
  syncNow: () => Promise<void>;
  clearQueue: () => Promise<void>;
}

export const useOfflineQueue = (): UseOfflineQueueReturn => {
  const [isOnlineStatus, setIsOnlineStatus] = useState(isOnline());
  const [pendingActionsCount, setPendingActionsCount] = useState(0);
  const queryClient = useQueryClient();
  const { addToast } = useToastContext();

  // Initialize IndexedDB
  useEffect(() => {
    indexedDBManager.init().catch(console.error);
  }, []);

  // Update pending actions count
  const updatePendingCount = useCallback(async () => {
    try {
      const actions = await indexedDBManager.getOfflineActions();
      setPendingActionsCount(actions.length);
    } catch (error) {
      console.error('Failed to get pending actions count:', error);
    }
  }, []);

  // Process individual offline action with conflict resolution
  const processOfflineAction = useCallback(async (action: OfflineAction) => {
    try {
      switch (action.type) {
        case 'send_message':
          await apiClient.sendEventMessage(action.eventId, action.data.message as string);
          queryClient.invalidateQueries({ queryKey: queryKeys.eventMessages(action.eventId) });
          break;

        case 'create_checklist_item':
          await apiClient.createChecklistItem(action.eventId, action.data as { title: string; description?: string });
          queryClient.invalidateQueries({ queryKey: queryKeys.eventChecklist(action.eventId) });
          break;

        case 'update_checklist_item': {
          const updateData = action.data as { itemId: string; updates: { completed: boolean } };

          // Check if item still exists before updating
          try {
            await apiClient.updateChecklistItem(action.eventId, updateData.itemId, updateData.updates);
            queryClient.invalidateQueries({ queryKey: queryKeys.eventChecklist(action.eventId) });
          } catch (error: unknown) {
            // If item not found, it was deleted by another user - resolve by removing from queue
            const axiosError = error as { response?: { status?: number } };
            if (axiosError?.response?.status === 404) {
              console.warn(`Checklist item ${updateData.itemId} no longer exists, skipping update`);
              return; // Don't throw error, just skip this action
            }
            throw error;
          }
          break;
        }

        case 'delete_message':
          try {
            await apiClient.deleteEventMessage(action.eventId, (action.data as { messageId: string }).messageId);
            queryClient.invalidateQueries({ queryKey: queryKeys.eventMessages(action.eventId) });
          } catch (error: unknown) {
            // If message not found, it was already deleted - resolve by removing from queue
            const axiosError = error as { response?: { status?: number } };
            if (axiosError?.response?.status === 404) {
              console.warn(`Message ${(action.data as { messageId: string }).messageId} no longer exists, skipping delete`);
              return; // Don't throw error, just skip this action
            }
            throw error;
          }
          break;

        case 'delete_checklist_item':
          try {
            await apiClient.deleteChecklistItem(action.eventId, (action.data as { itemId: string }).itemId);
            queryClient.invalidateQueries({ queryKey: queryKeys.eventChecklist(action.eventId) });
          } catch (error: unknown) {
            // If item not found, it was already deleted - resolve by removing from queue
            const axiosError = error as { response?: { status?: number } };
            if (axiosError?.response?.status === 404) {
              console.warn(`Checklist item ${(action.data as { itemId: string }).itemId} no longer exists, skipping delete`);
              return; // Don't throw error, just skip this action
            }
            throw error;
          }
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error: unknown) {
      // Handle event-level conflicts (event deleted)
      const axiosError = error as { response?: { status?: number; data?: { detail?: string } } };
      if (axiosError?.response?.status === 404 && axiosError?.response?.data?.detail?.includes('Event not found')) {
        console.warn(`Event ${action.eventId} no longer exists, removing all related offline actions`);
        // Remove all actions for this event
        const allActions = await indexedDBManager.getOfflineActions();
        const eventActions = allActions.filter(a => a.eventId === action.eventId);
        for (const eventAction of eventActions) {
          await indexedDBManager.removeOfflineAction(eventAction.id);
        }
        return; // Don't throw error for event-level conflicts
      }

      // Handle rate limiting
      if (axiosError?.response?.status === 429) {
        console.warn('Rate limited, will retry later');
        throw new Error('RATE_LIMITED');
      }

      throw error;
    }
  }, [queryClient]);

  // Sync offline actions
  const syncOfflineActions = useCallback(async () => {
    if (!isOnline()) return;

    try {
      const actions = await indexedDBManager.getOfflineActions();

      if (actions.length === 0) return;

      addToast({
        type: 'info',
        title: 'Syncing actions',
        description: `Processing ${actions.length} offline action${actions.length > 1 ? 's' : ''}...`,
      });

      for (const action of actions) {
        try {
          await processOfflineAction(action);
          await indexedDBManager.removeOfflineAction(action.id);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);

          // Increment retry count
          if (action.retryCount < action.maxRetries) {
            await indexedDBManager.updateOfflineAction(action.id, {
              retryCount: action.retryCount + 1
            });
          } else {
            // Max retries reached, remove the action
            await indexedDBManager.removeOfflineAction(action.id);
            addToast({
              type: 'error',
              title: 'Sync failed',
              description: `Action could not be completed after ${action.maxRetries} attempts.`,
            });
          }
        }
      }

      await updatePendingCount();

      const remainingActions = await indexedDBManager.getOfflineActions();
      if (remainingActions.length === 0) {
        addToast({
          type: 'success',
          title: 'Sync complete',
          description: 'All offline actions have been processed.',
        });
      }

    } catch (error) {
      console.error('Failed to sync offline actions:', error);
    }
  }, [updatePendingCount, addToast, processOfflineAction]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnlineStatus(true);
      addToast({
        type: 'success',
        title: 'Back online',
        description: 'Syncing offline actions...',
      });
      // Auto-sync when coming back online
      syncOfflineActions();
    };

    const handleOffline = () => {
      setIsOnlineStatus(false);
      addToast({
        type: 'warning',
        title: 'You are offline',
        description: 'Actions will be saved locally and synced when connection is restored.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast, syncOfflineActions]);


  // Add offline action
  const addOfflineAction = useCallback(async (actionData: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>) => {
    const action = createOfflineAction(actionData.type, actionData.eventId, actionData.data);
    await indexedDBManager.addOfflineAction(action);
    await updatePendingCount();

    if (isOnline()) {
      // If online, try to sync immediately
      try {
        await processOfflineAction(action);
        await indexedDBManager.removeOfflineAction(action.id);
        await updatePendingCount();
      } catch (error) {
        console.error('Immediate sync failed, will retry later:', error);
      }
    }
  }, [updatePendingCount, processOfflineAction]);

  // Manual sync
  const syncNow = useCallback(async () => {
    if (!isOnline()) {
      addToast({
        type: 'warning',
        title: 'Cannot sync',
        description: 'You are currently offline.',
      });
      return;
    }

    await syncOfflineActions();
  }, [syncOfflineActions, addToast]);

  // Clear queue
  const clearQueue = useCallback(async () => {
    await indexedDBManager.clearOfflineActions();
    await updatePendingCount();
    addToast({
      type: 'info',
      title: 'Queue cleared',
      description: 'All pending offline actions have been removed.',
    });
  }, [updatePendingCount, addToast]);

  // Initial load of pending count
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  return {
    isOnline: isOnlineStatus,
    pendingActionsCount,
    addOfflineAction,
    syncNow,
    clearQueue,
  };
};