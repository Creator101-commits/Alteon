import React, { useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { MoreVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBoardContext } from '@/contexts/BoardContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card as TodoCard } from './Card.tsx';
import type { TodoList, Card as CardType } from '@shared/schema';

interface ListProps {
  list: TodoList;
  cards: CardType[];
}

export const List: React.FC<ListProps> = ({ list, cards }) => {
  const { createCard, updateList, deleteList, moveCard } = useBoardContext();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState(list.title);
  const [isAddingCard, setIsAddingCard] = React.useState(false);
  const [newCardTitle, setNewCardTitle] = React.useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const { setNodeRef } = useDroppable({
    id: list.id,
  });

  // Handle native drag/drop from inbox
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      
      const item = JSON.parse(data);
      
      if (item.source === 'dashboard') {
        // Create a new card from the dashboard todo
        await createCard(list.id, item.title);
        
        // Remove from quick tasks API
        if (user) {
          try {
            await fetch(`/api/quick-tasks/${item.id}`, {
              method: 'DELETE',
              headers: {
                'x-user-id': user.uid
              }
            });
          } catch (error) {
            console.error('Error deleting quick task:', error);
          }
        }
        
        toast({
          title: 'Task Added',
          description: `"${item.title}" added to ${list.title}`,
        });
      } else if (item.source === 'board') {
        // Move existing inbox card to this list
        await moveCard(item.id, list.id, cards.length);
        
        toast({
          title: 'Card Moved',
          description: `"${item.title}" moved to ${list.title}`,
        });
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  }, [createCard, moveCard, list.id, list.title, cards.length, toast]);

  const handleTitleBlur = async () => {
    setIsEditing(false);
    if (title.trim() && title !== list.title) {
      await updateList(list.id, { title: title.trim() });
    } else {
      setTitle(list.title);
    }
  };

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    
    await createCard(list.id, newCardTitle.trim());
    setNewCardTitle('');
    setIsAddingCard(false);
  };

  const handleDeleteList = async () => {
    if (window.confirm(`Delete "${list.title}"? All cards will be moved to inbox.`)) {
      await deleteList(list.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`w-80 flex-shrink-0 bg-card rounded-lg shadow-sm flex flex-col max-h-full transition-all ${
        isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* List Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between group">
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleBlur();
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setTitle(list.title);
                }
              }}
              className="flex-1 px-2 py-1 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          ) : (
            <h3
              className="font-semibold flex-1 cursor-pointer px-2 py-1 rounded hover:bg-accent"
              onDoubleClick={() => setIsEditing(true)}
            >
              {list.title}
            </h3>
          )}
          
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              {cards.length}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  Rename list
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleDeleteList}
                >
                  Delete list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext
          items={cards.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {cards.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No cards yet
              </div>
            ) : (
              cards
                .sort((a, b) => (a.position || 0) - (b.position || 0))
                .map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <TodoCard card={card} />
                  </motion.div>
                ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>

      {/* Add Card */}
      <div className="p-2 border-t border-border">
        {isAddingCard ? (
          <div className="space-y-2">
            <textarea
              placeholder="Enter a title for this card..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCard();
                }
                if (e.key === 'Escape') {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddCard}>
                Add Card
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => setIsAddingCard(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add a card
          </Button>
        )}
      </div>
    </div>
  );
};
