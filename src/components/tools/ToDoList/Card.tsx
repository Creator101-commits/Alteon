import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Calendar, CheckSquare, Copy, Edit, Trash2, MoreHorizontal, Circle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBoardContext } from '@/contexts/BoardContext';
import { useUIContext } from '@/contexts/UIContext';
import type { Card as CardType } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

interface CardProps {
  card: CardType;
}

export const Card: React.FC<CardProps> = ({ card }) => {
  const { deleteCard, updateCard, moveCard, lists } = useBoardContext();
  const { openCardModal } = useUIContext();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this card?')) {
      await deleteCard(card.id);
    }
  };

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCompletedState = !card.isCompleted;
    
    // Find the "Completed" list
    const completedList = lists.find(l => l.title.toLowerCase() === 'completed');
    
    if (newCompletedState && completedList && card.listId !== completedList.id) {
      // Save the original list ID in the database before moving to Completed
      await updateCard(card.id, { 
        isCompleted: true, 
        originalListId: card.listId 
      });
      await moveCard(card.id, completedList.id, 0);
    } else if (!newCompletedState) {
      // Get the original list ID from the card data (stored in database)
      const originalListId = card.originalListId;
      
      // Mark as incomplete and clear originalListId
      await updateCard(card.id, { 
        isCompleted: false,
        originalListId: null 
      });
      
      // Move back to original list if we have it stored
      if (originalListId) {
        // Check if the original list still exists
        const originalList = lists.find(l => l.id === originalListId);
        if (originalList) {
          await moveCard(card.id, originalListId, 0);
        }
      } else {
        // If no original list stored, move to the first non-completed list
        const firstList = lists.find(l => l.title.toLowerCase() !== 'completed');
        if (firstList && card.listId !== firstList.id) {
          await moveCard(card.id, firstList.id, 0);
        }
      }
    } else {
      // Just toggle the state
      await updateCard(card.id, { isCompleted: newCompletedState });
    }
  };

  const handleClick = () => {
    openCardModal(card);
  };

  // Calculate due date status
  const getDueDateStatus = () => {
    if (!card.dueDate) return null;
    
    const now = new Date();
    const due = new Date(card.dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 3) return 'soon';
    return 'future';
  };

  const dueDateStatus = getDueDateStatus();

  const dueDateColors = {
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    today: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    soon: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    future: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      className="bg-background rounded-md border border-border p-3 cursor-pointer group relative"
      onClick={handleClick}
    >
      {/* Colored left border for status */}
      {card.isCompleted && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-l-md" />
      )}

      {/* Title with completion circle */}
      <div className="flex items-start gap-2">
        <button
          onClick={handleToggleComplete}
          className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
        >
          {card.isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
          )}
        </button>
        <h4 className={`font-medium pr-6 line-clamp-2 ${card.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
          {card.title}
        </h4>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-1.5 mt-2 ml-7">
        {/* Due date badge */}
        {card.dueDate && dueDateStatus && (
          <Badge
            variant="secondary"
            className={`text-xs ${dueDateColors[dueDateStatus]}`}
          >
            <Calendar className="h-3 w-3 mr-1" />
            {formatDistanceToNow(new Date(card.dueDate), { addSuffix: true })}
          </Badge>
        )}

        {/* Checklist counter */}
        {/* TODO: Add when checklist is implemented */}

        {/* Labels */}
        {/* TODO: Add when labels are implemented */}
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-background"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => openCardModal(card)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};
