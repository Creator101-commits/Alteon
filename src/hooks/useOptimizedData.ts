/**
 * Optimized data fetching hooks with caching and performance improvements
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { cachedRequest } from '@/lib/cache';
import { makeAuthenticatedRequest } from '@/lib/api';

// Generic optimized query hook
export function useOptimizedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: {
    staleTime?: number;
    gcTime?: number;
    enabled?: boolean;
    refetchOnMount?: boolean;
  } = {}
) {
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes
    gcTime = 30 * 60 * 1000, // 30 minutes
    enabled = true,
    refetchOnMount = false,
  } = options;

  return useQuery({
    queryKey,
    queryFn: () => cachedRequest(queryKey.join(':'), queryFn, { ttl: staleTime }),
    staleTime,
    gcTime,
    enabled,
    refetchOnMount,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error instanceof Error && error.message.includes('4')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Optimized mutation hook with optimistic updates
export function useOptimizedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    invalidateQueries?: string[][];
    optimisticUpdate?: (variables: TVariables) => any;
  } = {}
) {
  const queryClient = useQueryClient();
  const {
    onSuccess,
    onError,
    invalidateQueries = [],
    optimisticUpdate,
  } = options;

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      if (invalidateQueries.length > 0) {
        await Promise.all(
          invalidateQueries.map(queryKey =>
            queryClient.cancelQueries({ queryKey })
          )
        );
      }

      // Optimistic update
      if (optimisticUpdate) {
        const previousData = optimisticUpdate(variables);
        return { previousData };
      }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        invalidateQueries.forEach(queryKey => {
          queryClient.setQueryData(queryKey, context.previousData);
        });
      }
      onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      onSuccess?.(data, variables);
    },
    onSettled: () => {
      // Always refetch after error or success
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
  });
}

// Batch data fetching hook
export function useBatchQueries<T>(
  queries: Array<{
    queryKey: string[];
    queryFn: () => Promise<T>;
    enabled?: boolean;
  }>
) {
  const results = queries.map(({ queryKey, queryFn, enabled = true }) =>
    useOptimizedQuery(queryKey, queryFn, { enabled })
  );

  const isLoading = results.some(result => result.isLoading);
  const isError = results.some(result => result.isError);
  const errors = results.filter(result => result.isError).map(result => result.error);

  return {
    results,
    isLoading,
    isError,
    errors,
    data: results.map(result => result.data),
  };
}

// Debounced search hook
export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  query: string,
  delay: number = 300
) {
  const debouncedQuery = useMemo(() => {
    const timeoutId = setTimeout(() => query, delay);
    return () => clearTimeout(timeoutId);
  }, [query, delay]);

  return useOptimizedQuery(
    ['search', query],
    () => searchFn(query),
    {
      enabled: query.length > 2,
      staleTime: 2 * 60 * 1000, // 2 minutes for search results
    }
  );
}

// Paginated data hook
export function usePaginatedQuery<T>(
  queryKey: string[],
  queryFn: (page: number, limit: number) => Promise<{ data: T[]; total: number; hasMore: boolean }>,
  page: number = 1,
  limit: number = 20
) {
  return useOptimizedQuery(
    [...queryKey, 'page', page.toString(), 'limit', limit.toString()],
    () => queryFn(page, limit),
    {
      staleTime: 3 * 60 * 1000, // 3 minutes for paginated data
    }
  );
}

// Real-time data hook with polling
export function useRealtimeQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  interval: number = 30000 // 30 seconds
) {
  return useOptimizedQuery(queryKey, queryFn, {
    staleTime: interval / 2, // Half the interval
  });
}

// Cache management utilities
export function useCacheManagement() {
  const queryClient = useQueryClient();

  const clearCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  const invalidateQueries = useCallback((queryKey: string[]) => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient]);

  const prefetchQuery = useCallback(
    async (queryKey: string[], queryFn: () => Promise<any>) => {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: () => cachedRequest(queryKey.join(':'), queryFn),
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  const getCachedData = useCallback(
    (queryKey: string[]) => {
      return queryClient.getQueryData(queryKey);
    },
    [queryClient]
  );

  return {
    clearCache,
    invalidateQueries,
    prefetchQuery,
    getCachedData,
  };
}
