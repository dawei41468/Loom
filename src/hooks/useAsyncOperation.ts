// Custom hook for handling async operations with error handling
import { useState, useCallback } from 'react';

interface UseAsyncOperationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  showToast?: boolean;
}

export const useAsyncOperation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (
    asyncFn: () => Promise<any>,
    options: UseAsyncOperationOptions = {}
  ) => {
    const { onSuccess, onError } = options;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn();
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
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