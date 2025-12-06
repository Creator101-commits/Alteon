/**
 * VirtualizedList Component
 * 
 * High-performance list rendering using react-window v2.
 * Only renders items that are visible in the viewport, dramatically
 * improving performance for long lists.
 * 
 * Issue #12: Virtual scrolling for long lists
 */

import React, { CSSProperties, ReactElement, useMemo, forwardRef } from 'react';
import { List, RowComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscanCount?: number;
}

// Props that will be passed via rowProps
interface RowData<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

// Generic row component for any type - using function component syntax
function GenericRow<T>({ index, style, items, renderItem }: RowComponentProps<RowData<T>>): ReactElement {
  const item = items[index];
  return (
    <div style={style}>
      {renderItem(item, index)}
    </div>
  ) as ReactElement;
}

// Type assertion to satisfy react-window's strict typing
const RowComponent = GenericRow as unknown as (props: RowComponentProps<RowData<any>>) => ReactElement;

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  className = '',
  overscanCount = 5,
}: VirtualizedListProps<T>) {
  // Memoize rowProps to prevent unnecessary re-renders
  const rowProps = useMemo(() => ({ items, renderItem }), [items, renderItem]);
  
  // If list is small, render normally without virtualization
  if (items.length < 50) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className={`${className} h-full w-full`} style={{ minHeight: 400 }}>
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <List
            style={{ height, width }}
            rowCount={items.length}
            rowHeight={itemHeight}
            rowProps={rowProps}
            overscanCount={overscanCount}
            rowComponent={RowComponent}
          />
        )}
      </AutoSizer>
    </div>
  );
}

// Simple virtualized list without AutoSizer (for fixed height containers)
interface SimpleVirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  width?: number | string;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscanCount?: number;
}

export function SimpleVirtualizedList<T>({
  items,
  itemHeight,
  height,
  width = '100%',
  renderItem,
  className = '',
  overscanCount = 5,
}: SimpleVirtualizedListProps<T>) {
  // Memoize rowProps to prevent unnecessary re-renders
  const rowProps = useMemo(() => ({ items, renderItem }), [items, renderItem]);
  
  // If list is small, render normally without virtualization
  if (items.length < 50) {
    return (
      <div className={className} style={{ height, overflow: 'auto' }}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <List
      className={className}
      style={{ height, width: typeof width === 'number' ? width : undefined }}
      rowCount={items.length}
      rowHeight={itemHeight}
      rowProps={rowProps}
      overscanCount={overscanCount}
      rowComponent={RowComponent}
    />
  );
}

export default VirtualizedList;
