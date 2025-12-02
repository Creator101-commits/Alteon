import React, { useMemo, useEffect, useState } from 'react';
import { Search, Star, Plus, Menu, ChevronRight, Inbox, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useBoardContext } from '@/contexts/BoardContext';
import { useUIContext } from '@/contexts/UIContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Board } from '@shared/schema';

interface DashboardTodo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export const Sidebar: React.FC = () => {
  const {
    boards,
    activeBoard,
    setActiveBoard,
    updateBoard,
    inboxCards,
    createCard,
    createInboxCard,
  } = useBoardContext();
  
  const {
    openBoardDialog,
    isSidebarCollapsed,
    toggleSidebar
  } = useUIContext();

  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isInboxExpanded, setIsInboxExpanded] = useState(true);
  const [dashboardTodos, setDashboardTodos] = useState<DashboardTodo[]>([]);
  const [newInboxTask, setNewInboxTask] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Load dashboard quick tasks from API
  useEffect(() => {
    if (!user) return;
    
    const loadDashboardTodos = async () => {
      try {
        const response = await fetch('/api/quick-tasks', {
          headers: {
            'x-user-id': user.uid
          }
        });
        
        if (response.ok) {
          const todos = await response.json();
          // Only get incomplete tasks
          const incompleteTodos = todos.filter((t: DashboardTodo) => !t.completed);
          setDashboardTodos(incompleteTodos);
        }
      } catch (error) {
        console.error('Error loading dashboard todos:', error);
      }
    };

    loadDashboardTodos();
    
    // Poll for changes every 10 seconds
    const interval = setInterval(loadDashboardTodos, 10000);
    
    return () => {
      clearInterval(interval);
    };
  }, [user]);

  // Combined inbox items: actual inbox cards + dashboard todos
  const allInboxItems = useMemo(() => {
    const fromCards = inboxCards.map(card => ({
      id: card.id,
      title: card.title,
      source: 'board' as const,
    }));
    
    const fromDashboard = dashboardTodos.map(todo => ({
      id: todo.id,
      title: todo.title,
      source: 'dashboard' as const,
    }));
    
    return [...fromDashboard, ...fromCards];
  }, [inboxCards, dashboardTodos]);

  // Filter boards by search
  const filteredBoards = useMemo(() => {
    if (!searchQuery) return boards;
    return boards.filter(b => 
      b.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [boards, searchQuery]);

  const handleBoardClick = (board: Board) => {
    setActiveBoard(board);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, board: Board) => {
    e.stopPropagation();
    await updateBoard(board.id, { isFavorited: !board.isFavorited });
  };

  if (isSidebarCollapsed) {
    return (
      <motion.div
        initial={{ width: 280 }}
        animate={{ width: 60 }}
        className="h-full bg-card border-r border-border flex flex-col items-center py-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="mb-4"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex-1" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: 60 }}
      animate={{ width: 280 }}
      className="h-full bg-card border-r border-border flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            To-Do List
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <Input
          placeholder="Search boards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      <ScrollArea className="flex-1">
        {/* Inbox Section */}
        <div className="p-4 border-b border-border">
          <button
            onClick={() => setIsInboxExpanded(!isInboxExpanded)}
            className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground mb-2 hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              <span>Inbox</span>
              {allInboxItems.length > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {allInboxItems.length}
                </Badge>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isInboxExpanded ? '' : '-rotate-90'}`} />
          </button>
          
          <AnimatePresence>
            {isInboxExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {/* Add Task Input */}
                {isAddingTask ? (
                  <div className="flex gap-1">
                    <Input
                      placeholder="New task..."
                      value={newInboxTask}
                      onChange={(e) => setNewInboxTask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newInboxTask.trim()) {
                          createInboxCard(newInboxTask.trim());
                          setNewInboxTask('');
                          setIsAddingTask(false);
                        } else if (e.key === 'Escape') {
                          setNewInboxTask('');
                          setIsAddingTask(false);
                        }
                      }}
                      autoFocus
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => {
                        if (newInboxTask.trim()) {
                          createInboxCard(newInboxTask.trim());
                          setNewInboxTask('');
                        }
                        setIsAddingTask(false);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setIsAddingTask(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add task to inbox
                  </Button>
                )}

                {/* Inbox Items */}
                {allInboxItems.length === 0 && !isAddingTask ? (
                  <p className="text-xs text-muted-foreground py-2 px-2">
                    No items in inbox.
                  </p>
                ) : (
                  allInboxItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-grab text-sm"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          id: item.id,
                          title: item.title,
                          source: item.source,
                        }));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                      <span className="truncate flex-1">{item.title}</span>
                      {item.source === 'dashboard' && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          Quick
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* All Boards */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            All Boards
          </h3>
          <div className="space-y-1">
            <AnimatePresence>
              {filteredBoards.map((board) => (
                <BoardItem
                  key={board.id}
                  board={board}
                  isActive={activeBoard?.id === board.id}
                  onClick={() => handleBoardClick(board)}
                  onToggleFavorite={(e) => handleToggleFavorite(e, board)}
                />
              ))}
            </AnimatePresence>
          </div>
          <Button
            variant="ghost"
            className="w-full mt-2 justify-start"
            onClick={() => openBoardDialog()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Board
          </Button>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Drag inbox items to lists on boards
        </p>
      </div>
    </motion.div>
  );
};

interface BoardItemProps {
  board: Board;
  isActive: boolean;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

const BoardItem: React.FC<BoardItemProps> = ({
  board,
  isActive,
  onClick,
  onToggleFavorite
}) => {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        w-full flex items-center justify-between p-2 rounded-md
        transition-colors group
        ${isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50'
        }
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: board.background || '#6366f1' }}
        />
        <span className="font-medium truncate">{board.title}</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onToggleFavorite}
        >
          <Star
            className={`h-3 w-3 ${
              board.isFavorited ? 'fill-yellow-400 text-yellow-400' : ''
            }`}
          />
        </Button>
        {isActive && <ChevronRight className="h-4 w-4" />}
      </div>
    </motion.button>
  );
};
