import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days (conserve cache offline)
      refetchOnWindowFocus: false,
    },
  },
});
