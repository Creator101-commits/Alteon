import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Card, Board } from '@shared/schema';

interface FilterState {
  labels: string[];
  dueDate: 'today' | 'week' | 'overdue' | 'none' | null;
  status: 'todo' | 'doing' | 'done' | null;
}

interface UIContextType {
  // Modal state
  isCardModalOpen: boolean;
  selectedCard: Card | null;
  openCardModal: (card: Card) => void;
  closeCardModal: () => void;
  
  isBoardDialogOpen: boolean;
  editingBoard: Board | null;
  openBoardDialog: (board?: Board) => void;
  closeBoardDialog: () => void;
  
  // Filter & search
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  clearFilters: () => void;
  
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // View state
  viewMode: 'board' | 'calendar' | 'table';
  setViewMode: (mode: 'board' | 'calendar' | 'table') => void;
  
  // Sidebar state
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isBoardDialogOpen, setIsBoardDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    labels: [],
    dueDate: null,
    status: null
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'calendar' | 'table'>('board');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const openCardModal = useCallback((card: Card) => {
    setSelectedCard(card);
    setIsCardModalOpen(true);
  }, []);

  const closeCardModal = useCallback(() => {
    setIsCardModalOpen(false);
    setTimeout(() => setSelectedCard(null), 300); // Delay to allow exit animation
  }, []);

  const openBoardDialog = useCallback((board?: Board) => {
    setEditingBoard(board || null);
    setIsBoardDialogOpen(true);
  }, []);

  const closeBoardDialog = useCallback(() => {
    setIsBoardDialogOpen(false);
    setTimeout(() => setEditingBoard(null), 300);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      labels: [],
      dueDate: null,
      status: null
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  const value: UIContextType = {
    isCardModalOpen,
    selectedCard,
    openCardModal,
    closeCardModal,
    isBoardDialogOpen,
    editingBoard,
    openBoardDialog,
    closeBoardDialog,
    filters,
    setFilters,
    clearFilters,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    isSidebarCollapsed,
    toggleSidebar
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUIContext = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIContext must be used within UIProvider');
  }
  return context;
};
