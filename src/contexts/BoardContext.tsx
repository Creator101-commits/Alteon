import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabaseStorage } from '@/lib/supabase-storage';
import type { Board, TodoList, Card, Label } from '@shared/schema';

interface BoardContextType {
  // Board state
  boards: Board[];
  activeBoard: Board | null;
  lists: TodoList[];
  cards: Card[];
  labels: Label[];
  inboxCards: Card[];
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Board actions
  setActiveBoard: (board: Board | null) => void;
  createBoard: (title: string, background?: string) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  
  // List actions
  createList: (boardId: string, title: string) => Promise<void>;
  updateList: (id: string, updates: Partial<TodoList>) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  
  // Card actions
  createCard: (listId: string, title: string) => Promise<void>;
  createInboxCard: (title: string) => Promise<void>;
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (cardId: string, newListId: string | null, newPosition: number) => Promise<void>;
  
  // Label actions
  createLabel: (name: string, color: string) => Promise<void>;
  updateLabel: (id: string, updates: { name?: string; color?: string }) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;
  addLabelToCard: (cardId: string, labelId: string) => Promise<void>;
  removeLabelFromCard: (cardId: string, labelId: string) => Promise<void>;
  
  // Utility
  refreshData: () => Promise<void>;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [inboxCards, setInboxCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all boards
  const fetchBoards = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const data = await supabaseStorage.getBoardsForUser(user.uid);
      setBoards(data);
      
      // Set first board as active if none selected
      if (!activeBoard && data.length > 0) {
        setActiveBoard(data[0]);
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to load boards',
        variant: 'destructive'
      });
    }
  }, [user?.uid, activeBoard, toast]);

  // Fetch lists for active board
  const fetchLists = useCallback(async (boardId: string) => {
    try {
      const data = await supabaseStorage.getListsForBoard(boardId);
      setLists(data);
    } catch (err) {
      console.error('Failed to fetch lists:', err);
    }
  }, []);

  // Fetch cards for active board
  const fetchCards = useCallback(async (boardId: string) => {
    try {
      const data = await supabaseStorage.getCardsForBoard(boardId);
      setCards(data);
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    }
  }, []);

  // Fetch inbox cards
  const fetchInboxCards = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const data = await supabaseStorage.getInboxCards(user.uid);
      setInboxCards(data);
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
    }
  }, [user?.uid]);

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const data = await supabaseStorage.getLabelsForUser(user.uid);
      setLabels(data);
    } catch (err) {
      console.error('Failed to fetch labels:', err);
    }
  }, [user?.uid]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchBoards(),
      fetchLabels(),
      fetchInboxCards()
    ]);
    
    if (activeBoard) {
      await Promise.all([
        fetchLists(activeBoard.id),
        fetchCards(activeBoard.id)
      ]);
    }
    setLoading(false);
  }, [activeBoard, fetchBoards, fetchLists, fetchCards, fetchLabels, fetchInboxCards]);

  // Create board
  const createBoard = useCallback(async (title: string, background?: string) => {
    if (!user?.uid) return;
    
    try {
      const newBoard = await supabaseStorage.createBoard({
        userId: user.uid,
        title,
        background: background || null,
      });
      
      // Create default lists: "To Do" and "Completed"
      const todoList = await supabaseStorage.createList({
        boardId: newBoard.id,
        title: 'To Do',
        position: 0,
      });
      
      const completedList = await supabaseStorage.createList({
        boardId: newBoard.id,
        title: 'Completed',
        position: 1,
      });
      
      setBoards(prev => [...prev, newBoard]);
      setLists([todoList, completedList]);
      setActiveBoard(newBoard);
      
      toast({
        title: 'Success',
        description: 'Board created successfully'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create board',
        variant: 'destructive'
      });
    }
  }, [user?.uid, toast]);

  // Update board
  const updateBoard = useCallback(async (id: string, updates: Partial<Board>) => {
    try {
      const updated = await supabaseStorage.updateBoard(id, updates);
      if (updated) {
        setBoards(prev => prev.map(b => b.id === id ? updated : b));
        if (activeBoard?.id === id) setActiveBoard(updated);
        
        toast({
          title: 'Success',
          description: 'Board updated'
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update board',
        variant: 'destructive'
      });
    }
  }, [activeBoard, toast]);

  // Delete board
  const deleteBoard = useCallback(async (id: string) => {
    try {
      const success = await supabaseStorage.deleteBoard(id);
      
      if (success) {
        setBoards(prev => prev.filter(b => b.id !== id));
        if (activeBoard?.id === id) {
          setActiveBoard(boards.length > 1 ? boards[0] : null);
        }
        
        toast({
          title: 'Success',
          description: 'Board deleted'
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete board',
        variant: 'destructive'
      });
    }
  }, [activeBoard, boards, toast]);

  // Create list
  const createList = useCallback(async (boardId: string, title: string) => {
    try {
      const newList = await supabaseStorage.createList({
        boardId,
        title,
        position: lists.length
      });
      
      if (newList) {
        setLists(prev => [...prev, newList]);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create list',
        variant: 'destructive'
      });
    }
  }, [lists.length, toast]);

  // Update list - with optimistic update
  const updateList = useCallback(async (id: string, updates: Partial<TodoList>) => {
    // Store previous state for rollback
    const previousLists = lists;
    
    // Optimistic update
    setLists(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    
    try {
      const updated = await supabaseStorage.updateList(id, updates);
      if (updated) {
        setLists(prev => prev.map(l => l.id === id ? updated : l));
      }
    } catch (err) {
      // Rollback on error
      setLists(previousLists);
      toast({
        title: 'Error',
        description: 'Failed to update list',
        variant: 'destructive'
      });
    }
  }, [lists, toast]);

  // Delete list - with optimistic update
  const deleteList = useCallback(async (id: string) => {
    // Store previous state for rollback
    const previousLists = lists;
    const previousCards = cards;
    
    // Optimistic update
    setLists(prev => prev.filter(l => l.id !== id));
    setCards(prev => prev.filter(c => c.listId !== id));
    
    try {
      const success = await supabaseStorage.deleteList(id);
      if (!success) throw new Error('Failed to delete list');
    } catch (err) {
      // Rollback on error
      setLists(previousLists);
      setCards(previousCards);
      toast({
        title: 'Error',
        description: 'Failed to delete list',
        variant: 'destructive'
      });
    }
  }, [lists, cards, toast]);

  // Create card
  const createCard = useCallback(async (listId: string, title: string) => {
    if (!user?.uid) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create cards',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const position = cards.filter(c => c.listId === listId).length;
      
      const newCard = await supabaseStorage.createCard({
        userId: user.uid,
        listId,
        title,
        position,
        description: null,
      });
      
      setCards(prev => [...prev, newCard]);
    } catch (err) {
      console.error('Failed to create card:', err);
      toast({
        title: 'Error',
        description: 'Failed to create card',
        variant: 'destructive'
      });
    }
  }, [user?.uid, cards, toast]);

  // Create inbox card (no listId)
  const createInboxCard = useCallback(async (title: string) => {
    if (!user?.uid) return;
    
    try {
      const position = inboxCards.length;
      
      const newCard = await supabaseStorage.createCard({
        userId: user.uid,
        listId: null,
        title,
        position,
        description: null,
      });
      
      setInboxCards(prev => [...prev, newCard]);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create inbox card',
        variant: 'destructive'
      });
    }
  }, [user?.uid, inboxCards.length, toast]);

  // Update card - with optimistic update
  const updateCard = useCallback(async (id: string, updates: Partial<Card>) => {
    // Store previous state for rollback
    const previousCards = cards;
    const previousInboxCards = inboxCards;
    
    // Optimistic update
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    setInboxCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    
    try {
      await supabaseStorage.updateCard(id, updates);
    } catch (err) {
      // Rollback on error
      setCards(previousCards);
      setInboxCards(previousInboxCards);
      toast({
        title: 'Error',
        description: 'Failed to update card',
        variant: 'destructive'
      });
    }
  }, [cards, inboxCards, toast]);

  // Delete card - with optimistic update
  const deleteCard = useCallback(async (id: string) => {
    // Store previous state for rollback
    const previousCards = cards;
    const previousInboxCards = inboxCards;
    
    // Optimistic update
    setCards(prev => prev.filter(c => c.id !== id));
    setInboxCards(prev => prev.filter(c => c.id !== id));
    
    try {
      const success = await supabaseStorage.deleteCard(id);
      if (!success) throw new Error('Failed to delete card');
      // Success - no need to update state, already done optimistically
    } catch (err) {
      // Rollback on error
      setCards(previousCards);
      setInboxCards(previousInboxCards);
      toast({
        title: 'Error',
        description: 'Failed to delete card',
        variant: 'destructive'
      });
    }
  }, [cards, inboxCards, toast]);

  // Move card - with optimistic update
  const moveCard = useCallback(async (cardId: string, newListId: string | null, newPosition: number) => {
    // Store previous state for rollback
    const previousCards = cards;
    const previousInboxCards = inboxCards;
    
    // Find the card being moved
    const movingCard = cards.find(c => c.id === cardId) || inboxCards.find(c => c.id === cardId);
    if (!movingCard) return;
    
    const wasInInbox = inboxCards.some(c => c.id === cardId);
    
    // Optimistic update
    if (newListId === null) {
      // Moving to inbox
      setCards(prev => prev.filter(c => c.id !== cardId));
      setInboxCards(prev => [...prev.filter(c => c.id !== cardId), { ...movingCard, listId: null, position: newPosition }]);
    } else if (wasInInbox) {
      // Moving from inbox to a list
      setInboxCards(prev => prev.filter(c => c.id !== cardId));
      setCards(prev => [...prev.filter(c => c.id !== cardId), { ...movingCard, listId: newListId, position: newPosition }]);
    } else {
      // Moving within/between lists
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, listId: newListId, position: newPosition } : c));
    }
    
    try {
      const updated = await supabaseStorage.updateCard(cardId, {
        listId: newListId,
        position: newPosition
      });
      
      if (!updated) throw new Error('Failed to move card');
      
      // Update with actual server response
      if (newListId === null) {
        setInboxCards(prev => prev.map(c => c.id === cardId ? updated : c));
      } else {
        setCards(prev => prev.map(c => c.id === cardId ? updated : c));
      }
    } catch (err) {
      // Rollback on error
      setCards(previousCards);
      setInboxCards(previousInboxCards);
      toast({
        title: 'Error',
        description: 'Failed to move card',
        variant: 'destructive'
      });
      throw err;
    }
  }, [cards, inboxCards, toast]);

  // Create label
  const createLabel = useCallback(async (name: string, color: string) => {
    if (!user?.uid) return;
    
    try {
      const newLabel = await supabaseStorage.createLabel({
        userId: user.uid,
        name,
        color,
      });
      
      setLabels(prev => [...prev, newLabel]);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create label',
        variant: 'destructive'
      });
    }
  }, [user?.uid, toast]);

  // Update label
  const updateLabel = useCallback(async (id: string, updates: { name?: string; color?: string }) => {
    try {
      const updated = await supabaseStorage.updateLabel(id, updates);
      if (!updated) throw new Error('Failed to update label');
      
      setLabels(prev => prev.map(l => l.id === id ? updated : l));
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update label',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Delete label
  const deleteLabel = useCallback(async (id: string) => {
    try {
      const success = await supabaseStorage.deleteLabel(id);
      if (!success) throw new Error('Failed to delete label');
      
      setLabels(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete label',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Add label to card
  const addLabelToCard = useCallback(async (cardId: string, labelId: string) => {
    try {
      const success = await supabaseStorage.addLabelToCard(cardId, labelId);
      if (!success) throw new Error('Failed to add label');
      
      // Refresh card to get updated labels
      await refreshData();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add label',
        variant: 'destructive'
      });
    }
  }, [refreshData, toast]);

  // Remove label from card
  const removeLabelFromCard = useCallback(async (cardId: string, labelId: string) => {
    try {
      const success = await supabaseStorage.removeLabelFromCard(cardId, labelId);
      if (!success) throw new Error('Failed to remove label');
      
      // Refresh card to get updated labels
      await refreshData();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to remove label',
        variant: 'destructive'
      });
    }
  }, [refreshData, toast]);

  // Effect: Load data when active board changes
  useEffect(() => {
    if (activeBoard) {
      fetchLists(activeBoard.id);
      fetchCards(activeBoard.id);
    }
  }, [activeBoard, fetchLists, fetchCards]);

  // Effect: Initial load
  useEffect(() => {
    if (user?.uid) {
      refreshData();
    }
  }, [user?.uid]); // Only refresh when user changes

  const value: BoardContextType = {
    boards,
    activeBoard,
    lists,
    cards,
    labels,
    inboxCards,
    loading,
    error,
    setActiveBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    createList,
    updateList,
    deleteList,
    createCard,
    createInboxCard,
    updateCard,
    deleteCard,
    moveCard,
    createLabel,
    updateLabel,
    deleteLabel,
    addLabelToCard,
    removeLabelFromCard,
    refreshData
  };

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
};

export const useBoardContext = () => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error('useBoardContext must be used within BoardProvider');
  }
  return context;
};
