/**
 * useInfiniteScroll Hook
 * 
 * A reusable hook for implementing infinite scroll with pagination.
 * Uses react-intersection-observer for detecting when user scrolls to the bottom.
 * 
 * Issue #12: Frontend pagination with infinite scroll
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

interface UseInfiniteScrollOptions<T> {
  /** Function to fetch data. Receives page number, returns items array */
  fetchFn: (page: number) => Promise<T[]>;
  /** Number of items per page */
  pageSize?: number;
  /** Initial data to start with */
  initialData?: T[];
  /** Whether to enable the infinite scroll */
  enabled?: boolean;
  /** Threshold for intersection observer (0-1) */
  threshold?: number;
}

interface UseInfiniteScrollResult<T> {
  /** All loaded items */
  items: T[];
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Whether more items are being fetched */
  isFetchingMore: boolean;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Ref to attach to the sentinel element */
  ref: (node?: Element | null) => void;
  /** Function to reset and refetch from page 1 */
  reset: () => void;
  /** Function to manually trigger fetch of next page */
  fetchMore: () => void;
}

export function useInfiniteScroll<T>({
  fetchFn,
  pageSize = 20,
  initialData = [],
  enabled = true,
  threshold = 0.1,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [items, setItems] = useState<T[]>(initialData);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchingRef = useRef(false);

  // Intersection observer for detecting scroll to bottom
  const { ref, inView } = useInView({
    threshold,
    rootMargin: '100px',
  });

  // Initial data fetch
  useEffect(() => {
    if (!enabled) return;
    
    const loadInitial = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchFn(1);
        setItems(data);
        setHasMore(data.length >= pageSize);
        setPage(1);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch'));
      } finally {
        setIsLoading(false);
      }
    };

    loadInitial();
  }, [enabled, fetchFn, pageSize]);

  // Fetch more when scrolling to bottom
  const fetchMore = useCallback(async () => {
    if (fetchingRef.current || !hasMore || isLoading) return;
    
    fetchingRef.current = true;
    setIsFetchingMore(true);
    setError(null);
    
    try {
      const nextPage = page + 1;
      const data = await fetchFn(nextPage);
      
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => [...prev, ...data]);
        setPage(nextPage);
        setHasMore(data.length >= pageSize);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch more'));
    } finally {
      setIsFetchingMore(false);
      fetchingRef.current = false;
    }
  }, [fetchFn, hasMore, isLoading, page, pageSize]);

  // Auto-fetch when sentinel comes into view
  useEffect(() => {
    if (inView && hasMore && !isFetchingMore && !isLoading && enabled) {
      fetchMore();
    }
  }, [inView, hasMore, isFetchingMore, isLoading, enabled, fetchMore]);

  // Reset function
  const reset = useCallback(async () => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setIsLoading(true);
    
    try {
      const data = await fetchFn(1);
      setItems(data);
      setHasMore(data.length >= pageSize);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, pageSize]);

  return {
    items,
    isLoading,
    isFetchingMore,
    hasMore,
    error,
    ref,
    reset,
    fetchMore,
  };
}

/**
 * Simple pagination helper for client-side pagination of already-loaded data
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = 20
) {
  const [displayCount, setDisplayCount] = useState(pageSize);
  
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (inView && displayCount < items.length) {
      setDisplayCount(prev => Math.min(prev + pageSize, items.length));
    }
  }, [inView, displayCount, items.length, pageSize]);

  const reset = useCallback(() => {
    setDisplayCount(pageSize);
  }, [pageSize]);

  return {
    displayedItems: items.slice(0, displayCount),
    hasMore: displayCount < items.length,
    ref,
    reset,
    total: items.length,
    displayed: Math.min(displayCount, items.length),
  };
}

export default useInfiniteScroll;
