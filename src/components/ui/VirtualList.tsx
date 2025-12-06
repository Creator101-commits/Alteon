/**
 * VirtualList Component
 * 
 * A virtualized list component that only renders items currently visible in the viewport.
 * Uses @tanstack/react-virtual for efficient rendering of large lists.
 * 
 * Issue #13: Virtual scrolling for long lists
 */

import React, { useRef, useCallback, useMemo } from 'react';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Height of each item in pixels (or estimator function) */
  itemHeight: number | ((index: number) => number);
  /** Height of the container */
  containerHeight: number;
  /** Width of the container (optional, defaults to 100%) */
  containerWidth?: string | number;
  /** Render function for each item */
  renderItem: (item: T, index: number, virtualItem: VirtualItem) => React.ReactNode;
  /** Key extractor function */
  getItemKey?: (item: T, index: number) => string | number;
  /** Additional class for the container */
  className?: string;
  /** Overscan - number of items to render outside visible area */
  overscan?: number;
  /** Callback when scroll position changes */
  onScroll?: (scrollTop: number) => void;
  /** Gap between items */
  gap?: number;
  /** Whether the list is horizontal */
  horizontal?: boolean;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  containerWidth = '100%',
  renderItem,
  getItemKey,
  className = '',
  overscan = 5,
  onScroll,
  gap = 0,
  horizontal = false,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const estimateSize = useMemo(() => {
    if (typeof itemHeight === 'function') {
      return itemHeight;
    }
    return () => itemHeight + gap;
  }, [itemHeight, gap]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
    horizontal,
    getItemKey: getItemKey 
      ? (index) => getItemKey(items[index], index) 
      : undefined,
  });

  const handleScroll = useCallback(() => {
    if (onScroll && parentRef.current) {
      onScroll(horizontal ? parentRef.current.scrollLeft : parentRef.current.scrollTop);
    }
  }, [onScroll, horizontal]);

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{
        height: containerHeight,
        width: containerWidth,
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: horizontal ? '100%' : totalSize,
          width: horizontal ? totalSize : '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: horizontal ? 0 : virtualItem.start,
                left: horizontal ? virtualItem.start : 0,
                width: horizontal ? virtualItem.size : '100%',
                height: horizontal ? '100%' : virtualItem.size,
              }}
            >
              {renderItem(item, virtualItem.index, virtualItem)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// VIRTUAL GRID
// ============================================================================

interface VirtualGridProps<T> {
  /** Array of items to render */
  items: T[];
  /** Height of each row */
  rowHeight: number;
  /** Number of columns */
  columns: number;
  /** Height of the container */
  containerHeight: number;
  /** Width of the container */
  containerWidth?: string | number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key extractor function */
  getItemKey?: (item: T, index: number) => string | number;
  /** Additional class for the container */
  className?: string;
  /** Overscan - number of rows to render outside visible area */
  overscan?: number;
  /** Gap between items */
  gap?: number;
}

export function VirtualGrid<T>({
  items,
  rowHeight,
  columns,
  containerHeight,
  containerWidth = '100%',
  renderItem,
  getItemKey,
  className = '',
  overscan = 3,
  gap = 16,
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate number of rows
  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + gap,
    overscan,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{
        height: containerHeight,
        width: containerWidth,
      }}
    >
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowItems = items.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: virtualRow.start,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${gap}px`,
                paddingBottom: gap,
              }}
            >
              {rowItems.map((item, colIndex) => {
                const itemIndex = startIndex + colIndex;
                const key = getItemKey ? getItemKey(item, itemIndex) : itemIndex;
                return (
                  <div key={key} style={{ height: rowHeight }}>
                    {renderItem(item, itemIndex)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// LOAD MORE SENTINEL
// ============================================================================

interface LoadMoreSentinelProps {
  /** Ref from useInfiniteScroll or useInView */
  sentinelRef: (node?: Element | null) => void;
  /** Whether more items are being loaded */
  isLoading?: boolean;
  /** Whether there are more items to load */
  hasMore?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

export function LoadMoreSentinel({
  sentinelRef,
  isLoading = false,
  hasMore = true,
  loadingComponent,
}: LoadMoreSentinelProps) {
  if (!hasMore) {
    return null;
  }

  return (
    <div ref={sentinelRef} className="flex justify-center py-4">
      {isLoading && (
        loadingComponent || (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">Loading more...</span>
          </div>
        )
      )}
    </div>
  );
}

export default VirtualList;
