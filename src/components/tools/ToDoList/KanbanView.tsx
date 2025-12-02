import React, { useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBoardContext } from '@/contexts/BoardContext';
import { useUIContext } from '@/contexts/UIContext';
import { List } from './List.tsx';
import { Card as TodoCard } from './Card.tsx';
import type { Card } from '@shared/schema';

export const KanbanView: React.FC = () => {
  const {
    activeBoard,
    lists,
    cards,
    createList,
    moveCard,
    error
  } = useBoardContext();

  const { searchQuery, filters } = useUIContext();
  const [activeCard, setActiveCard] = React.useState<Card | null>(null);
  const [isAddingList, setIsAddingList] = React.useState(false);
  const [newListTitle, setNewListTitle] = React.useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filter and search cards
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          card.title.toLowerCase().includes(query) ||
          (card.description && card.description.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // TODO: Add label, due date, and status filters when implemented

      return true;
    });
  }, [cards, searchQuery, filters]);

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find(c => c.id === event.active.id);
    if (card) setActiveCard(card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || active.id === over.id) return;

    const cardId = active.id as string;
    const overId = over.id as string;

    // Determine if dropping on a list or another card
    const targetList = lists.find(l => l.id === overId);
    const targetCard = cards.find(c => c.id === overId);

    if (targetList) {
      // Dropping on a list - put at end
      const cardsInList = filteredCards.filter(c => c.listId === targetList.id);
      await moveCard(cardId, targetList.id, cardsInList.length);
    } else if (targetCard) {
      // Dropping on another card - insert before it
      await moveCard(cardId, targetCard.listId, targetCard.position || 0);
    }
  };

  const handleAddList = async () => {
    if (!activeBoard || !newListTitle.trim()) return;
    
    await createList(activeBoard.id, newListTitle.trim());
    setNewListTitle('');
    setIsAddingList(false);
  };

  if (!activeBoard) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          {error && error.includes('migration') ? (
            <>
              <h2 className="text-2xl font-semibold mb-2 text-orange-600">Database Setup Required</h2>
              <p className="text-muted-foreground mb-4">
                The to-do board tables haven't been created yet. Please run the database migration script.
              </p>
              <div className="bg-muted p-4 rounded-lg text-left text-sm">
                <p className="font-mono mb-2">server/migrations/todo_boards_schema.sql</p>
                <p className="text-xs text-muted-foreground">
                  Execute this SQL file in your Oracle console to create the required tables.
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-2">No board selected</h2>
              <p className="text-muted-foreground">
                Select a board from the sidebar or create a new one
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden p-6"
        style={{
          background: activeBoard.background
            ? `linear-gradient(135deg, ${activeBoard.background}22 0%, ${activeBoard.background}11 100%)`
            : undefined
        }}
      >
        <div className="flex gap-4 h-full min-w-max">
          <SortableContext
            items={lists.map(l => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            {lists.map((list, index) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <List
                  list={list}
                  cards={filteredCards.filter(c => c.listId === list.id)}
                />
              </motion.div>
            ))}
          </SortableContext>

          {/* Add List Button */}
          <div className="w-80 flex-shrink-0">
            {isAddingList ? (
              <div className="bg-card rounded-lg p-3 shadow-sm">
                <input
                  type="text"
                  placeholder="Enter list title..."
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddList();
                    if (e.key === 'Escape') {
                      setIsAddingList(false);
                      setNewListTitle('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddList}>
                    Add List
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingList(false);
                      setNewListTitle('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start bg-card/50 hover:bg-card"
                onClick={() => setIsAddingList(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add another list
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCard ? (
          <div className="rotate-3 opacity-80">
            <TodoCard card={activeCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
