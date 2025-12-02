import React from 'react';
import { Search, Filter, Star, MoreVertical, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBoardContext } from '@/contexts/BoardContext';
import { useUIContext } from '@/contexts/UIContext';

export const Header: React.FC = () => {
  const {
    activeBoard,
    updateBoard,
    deleteBoard
  } = useBoardContext();

  const {
    searchQuery,
    setSearchQuery,
    openBoardDialog,
    filters
  } = useUIContext();

  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  const handleToggleFavorite = async () => {
    if (!activeBoard) return;
    await updateBoard(activeBoard.id, {
      isFavorited: !activeBoard.isFavorited
    });
  };

  const handleDeleteBoard = async () => {
    if (!activeBoard) return;
    if (window.confirm(`Delete "${activeBoard.title}"? This cannot be undone.`)) {
      await deleteBoard(activeBoard.id);
    }
  };

  const activeFiltersCount = [
    filters.labels.length > 0,
    filters.dueDate !== null,
    filters.status !== null
  ].filter(Boolean).length;

  if (!activeBoard) {
    return (
      <div className="h-16 border-b border-border flex items-center justify-center px-6">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Select a board to get started
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm">
      {/* Left: Board name */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => openBoardDialog()}
          className="text-xl font-semibold hover:text-primary transition-colors flex items-center gap-2"
        >
          {activeBoard.title}
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        {isSearchOpen ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
              autoFocus
              onBlur={() => !searchQuery && setIsSearchOpen(false)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}

        {/* Filter */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Filter className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {/* Favorite */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleFavorite}
        >
          <Star
            className={`h-4 w-4 ${
              activeBoard.isFavorited
                ? 'fill-yellow-400 text-yellow-400'
                : ''
            }`}
          />
        </Button>

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => activeBoard && openBoardDialog(activeBoard)}>
              Rename Board
            </DropdownMenuItem>
            <DropdownMenuItem>Change background</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleDeleteBoard}
            >
              Delete board
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
