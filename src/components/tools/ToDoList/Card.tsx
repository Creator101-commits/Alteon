import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Calendar, CheckSquare, Copy, Edit, Trash2, MoreHorizontal } from 'lucide-react';
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
  const { deleteCard } = useBoardContext();
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

      {/* Title */}
      <h4 className="font-medium mb-2 pr-6 line-clamp-2">
        {card.title}
      </h4>

      {/* Metadata */}
      <div className="flex flex-wrap gap-1.5 mb-2">
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

      {/* Completion indicator */}
      {card.isCompleted && (
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <CheckSquare className="h-3 w-3" />
          <span>Completed</span>
        </div>
      )}

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
