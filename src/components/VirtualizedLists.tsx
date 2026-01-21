/**
 * Virtualized list components for handling large data sets efficiently
 * Uses react-window for windowed rendering - only renders visible items
 */

import React, { memo, useCallback, CSSProperties } from 'react';
import { FixedSizeList as List, areEqual } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// ============================================
// TYPES
// ============================================

export interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  className?: string;
  overscanCount?: number;
}

export interface NoteItem {
  id: string;
  title: string;
  content?: string;
  updatedAt: string;
  isPinned?: boolean;
  classId?: string;
  category?: string;
}

export interface AssignmentItem {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  classId?: string;
}

// ============================================
// GENERIC VIRTUALIZED LIST
// ============================================

interface RowProps<T> {
  index: number;
  style: CSSProperties;
  data: {
    items: T[];
    renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  };
}

const Row = memo(<T,>({ index, style, data }: RowProps<T>) => {
  const { items, renderItem } = data;
  return <>{renderItem(items[index], index, style)}</>;
}, areEqual);

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  className = '',
  overscanCount = 5,
}: VirtualizedListProps<T>) {
  const itemData = { items, renderItem };

  if (items.length === 0) {
    return null;
  }

  // For small lists, don't virtualize
  if (items.length < 20) {
    return (
      <div className={className}>
        {items.map((item, index) => renderItem(item, index, {}))}
      </div>
    );
  }

  return (
    <div className={className} style={{ height: '100%', minHeight: 400 }}>
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <List
            height={height}
            width={width}
            itemCount={items.length}
            itemSize={itemHeight}
            itemData={itemData}
            overscanCount={overscanCount}
          >
            {Row as any}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

// ============================================
// NOTES LIST
// ============================================

interface VirtualizedNotesListProps {
  notes: NoteItem[];
  onNoteClick: (noteId: string) => void;
  onNoteDelete?: (noteId: string) => void;
  selectedNoteId?: string;
}

export const VirtualizedNotesList = memo(({
  notes,
  onNoteClick,
  onNoteDelete,
  selectedNoteId,
}: VirtualizedNotesListProps) => {
  const renderNote = useCallback((note: NoteItem, _index: number, style: CSSProperties) => (
    <div
      key={note.id}
      style={style}
      className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
        selectedNoteId === note.id ? 'bg-muted' : ''
      }`}
      onClick={() => onNoteClick(note.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {note.isPinned && <span className="text-yellow-500">📌</span>}
            <h3 className="font-medium truncate">{note.title || 'Untitled'}</h3>
          </div>
          {note.content && (
            <p className="text-sm text-muted-foreground truncate mt-1">
              {note.content.slice(0, 100)}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(note.updatedAt).toLocaleDateString()}
          </p>
        </div>
        {onNoteDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNoteDelete(note.id);
            }}
            className="p-1 text-muted-foreground hover:text-destructive"
          >
            ×
          </button>
        )}
      </div>
    </div>
  ), [onNoteClick, onNoteDelete, selectedNoteId]);

  return (
    <VirtualizedList
      items={notes}
      itemHeight={80}
      renderItem={renderNote}
    />
  );
});

VirtualizedNotesList.displayName = 'VirtualizedNotesList';

// ============================================
// ASSIGNMENTS LIST
// ============================================

const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

interface VirtualizedAssignmentsListProps {
  assignments: AssignmentItem[];
  onAssignmentClick: (assignmentId: string) => void;
  onStatusChange?: (assignmentId: string, status: AssignmentItem['status']) => void;
}

export const VirtualizedAssignmentsList = memo(({
  assignments,
  onAssignmentClick,
  onStatusChange,
}: VirtualizedAssignmentsListProps) => {
  const renderAssignment = useCallback((assignment: AssignmentItem, _index: number, style: CSSProperties) => (
    <div
      key={assignment.id}
      style={style}
      className="p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onAssignmentClick(assignment.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{assignment.title}</h3>
          {assignment.description && (
            <p className="text-sm text-muted-foreground truncate mt-1">
              {assignment.description.slice(0, 80)}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[assignment.priority]}`}>
              {assignment.priority}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${statusColors[assignment.status]}`}>
              {assignment.status}
            </span>
            <span className="text-xs text-muted-foreground">
              Due: {new Date(assignment.dueDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        {onStatusChange && assignment.status !== 'completed' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(assignment.id, 'completed');
            }}
            className="p-1 text-muted-foreground hover:text-green-600"
            title="Mark complete"
          >
            ✓
          </button>
        )}
      </div>
    </div>
  ), [onAssignmentClick, onStatusChange]);

  return (
    <VirtualizedList
      items={assignments}
      itemHeight={90}
      renderItem={renderAssignment}
    />
  );
});

VirtualizedAssignmentsList.displayName = 'VirtualizedAssignmentsList';

// ============================================
// FLASHCARD LIST
// ============================================

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  deckId: string;
  nextReviewDate?: string;
  difficulty?: number;
}

interface VirtualizedFlashcardsListProps {
  flashcards: FlashcardItem[];
  onFlashcardClick: (flashcardId: string) => void;
  onFlashcardDelete?: (flashcardId: string) => void;
}

export const VirtualizedFlashcardsList = memo(({
  flashcards,
  onFlashcardClick,
  onFlashcardDelete,
}: VirtualizedFlashcardsListProps) => {
  const renderFlashcard = useCallback((card: FlashcardItem, _index: number, style: CSSProperties) => (
    <div
      key={card.id}
      style={style}
      className="p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onFlashcardClick(card.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{card.front}</p>
          <p className="text-sm text-muted-foreground truncate mt-1">{card.back}</p>
          {card.nextReviewDate && (
            <p className="text-xs text-muted-foreground mt-1">
              Next review: {new Date(card.nextReviewDate).toLocaleDateString()}
            </p>
          )}
        </div>
        {onFlashcardDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFlashcardDelete(card.id);
            }}
            className="p-1 text-muted-foreground hover:text-destructive"
          >
            ×
          </button>
        )}
      </div>
    </div>
  ), [onFlashcardClick, onFlashcardDelete]);

  return (
    <VirtualizedList
      items={flashcards}
      itemHeight={80}
      renderItem={renderFlashcard}
    />
  );
});

VirtualizedFlashcardsList.displayName = 'VirtualizedFlashcardsList';
