// Custom hook for handling async operations with error handling
import { useState, useCallback } from 'react';

interface UseAsyncOperationOptions<T = unknown> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

export const useAsyncOperation = <T = unknown>() => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (
    asyncFn: () => Promise<T>,
    options: UseAsyncOperationOptions<T> = {}
  ) => {
    const { onSuccess, onError } = options;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn();
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    execute,
    isLoading,
    error,
  };
};