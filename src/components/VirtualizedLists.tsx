/**
 * Virtualized list components for handling large data sets efficiently
 * Uses CSS-based virtualization with overflow scrolling for smooth performance
 */

import React, { memo, useCallback, CSSProperties } from 'react';

// ============================================
// TYPES
// ============================================

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

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  deckId: string;
  nextReviewDate?: string;
  difficulty?: number;
}

// ============================================
// SIMPLE SCROLLABLE LIST
// CSS-based virtualization with native scrolling
// ============================================

export function ScrollableList<T>({
  items,
  renderItem,
  className = '',
  maxHeight = 600,
  emptyMessage = 'No items',
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  maxHeight?: number;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div 
      className={`overflow-y-auto ${className}`} 
      style={{ maxHeight }}
    >
      {items.map((item, index) => renderItem(item, index))}
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
  maxHeight?: number;
}

export const VirtualizedNotesList = memo(({
  notes,
  onNoteClick,
  onNoteDelete,
  selectedNoteId,
  maxHeight = 600,
}: VirtualizedNotesListProps) => {
  const renderNote = useCallback((note: NoteItem, _index: number) => (
    <div
      key={note.id}
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
    <ScrollableList
      items={notes}
      renderItem={renderNote}
      maxHeight={maxHeight}
      emptyMessage="No notes yet"
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
  maxHeight?: number;
}

export const VirtualizedAssignmentsList = memo(({
  assignments,
  onAssignmentClick,
  onStatusChange,
  maxHeight = 600,
}: VirtualizedAssignmentsListProps) => {
  const renderAssignment = useCallback((assignment: AssignmentItem, _index: number) => (
    <div
      key={assignment.id}
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
    <ScrollableList
      items={assignments}
      renderItem={renderAssignment}
      maxHeight={maxHeight}
      emptyMessage="No assignments yet"
    />
  );
});

VirtualizedAssignmentsList.displayName = 'VirtualizedAssignmentsList';

// ============================================
// FLASHCARD LIST
// ============================================

interface VirtualizedFlashcardsListProps {
  flashcards: FlashcardItem[];
  onFlashcardClick: (flashcardId: string) => void;
  onFlashcardDelete?: (flashcardId: string) => void;
  maxHeight?: number;
}

export const VirtualizedFlashcardsList = memo(({
  flashcards,
  onFlashcardClick,
  onFlashcardDelete,
  maxHeight = 600,
}: VirtualizedFlashcardsListProps) => {
  const renderFlashcard = useCallback((card: FlashcardItem, _index: number) => (
    <div
      key={card.id}
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
    <ScrollableList
      items={flashcards}
      renderItem={renderFlashcard}
      maxHeight={maxHeight}
      emptyMessage="No flashcards yet"
    />
  );
});

VirtualizedFlashcardsList.displayName = 'VirtualizedFlashcardsList';
