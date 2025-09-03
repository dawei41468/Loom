import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queries';

export const usePolling = (intervalMs: number = 30000) => {
  const queryClient = useQueryClient();
  const intervalRef = useRef<number>();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      // Invalidate and refetch queries using centralized query keys
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.partner });
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryClient, intervalMs]);

  // Return a function to manually trigger refresh
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.events });
    queryClient.invalidateQueries({ queryKey: queryKeys.proposals });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    queryClient.invalidateQueries({ queryKey: queryKeys.partner });
  };

  return { refresh };
};