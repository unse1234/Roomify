import { QueryClient } from '@tanstack/react-query';
import { isTransientApiError } from '../utils/apiError.js';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < 2 && isTransientApiError(error),
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2000),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
