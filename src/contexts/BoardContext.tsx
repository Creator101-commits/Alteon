import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
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

  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-user-id': user?.uid || ''
  }), [user?.uid]);

  // Fetch all boards
  const fetchBoards = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch('/api/boards', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const error = await response.json();
        // If tables don't exist yet, show friendly message
        if (error.message?.includes('ORA-00942') || error.message?.includes('table or view does not exist')) {
          console.warn('Todo board tables not found. Please run the SQL migration.');
          setError('Todo board tables not found. Please ask your administrator to run the database migration.');
          return;
        }
        throw new Error('Failed to fetch boards');
      }
      
      const data = await response.json();
      setBoards(data);
      
      // Set first board as active if none selected
      if (!activeBoard && data.length > 0) {
        setActiveBoard(data[0]);
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      
      // Only show toast for non-table-missing errors
      if (!errorMessage.includes('table') && !errorMessage.includes('migration')) {
        toast({
          title: 'Error',
          description: 'Failed to load boards',
          variant: 'destructive'
        });
      }
    }
  }, [user?.uid, activeBoard, getAuthHeaders, toast]);

  // Fetch lists for active board
  const fetchLists = useCallback(async (boardId: string) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/lists`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch lists');
      
      const data = await response.json();
      setLists(data);
    } catch (err) {
      console.error('Failed to fetch lists:', err);
    }
  }, [getAuthHeaders]);

  // Fetch cards for active board
  const fetchCards = useCallback(async (boardId: string) => {
    try {
      const response = await fetch(`/api/cards?boardId=${boardId}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch cards');
      
      const data = await response.json();
      setCards(data);
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    }
  }, [getAuthHeaders]);

  // Fetch inbox cards
  const fetchInboxCards = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch('/api/cards/inbox', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch inbox');
      
      const data = await response.json();
      setInboxCards(data);
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
    }
  }, [user?.uid, getAuthHeaders]);

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch('/api/labels', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch labels');
      
      const data = await response.json();
      setLabels(data);
    } catch (err) {
      console.error('Failed to fetch labels:', err);
    }
  }, [user?.uid, getAuthHeaders]);

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
    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, background, userId: user?.uid })
      });
      
      if (!response.ok) throw new Error('Failed to create board');
      
      const newBoard = await response.json();
      setBoards(prev => [...prev, newBoard]);
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
  }, [user?.uid, getAuthHeaders, toast]);

  // Update board
  const updateBoard = useCallback(async (id: string, updates: Partial<Board>) => {
    try {
      const response = await fetch(`/api/boards/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update board');
      
      const updated = await response.json();
      setBoards(prev => prev.map(b => b.id === id ? updated : b));
      if (activeBoard?.id === id) setActiveBoard(updated);
      
      toast({
        title: 'Success',
        description: 'Board updated'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update board',
        variant: 'destructive'
      });
    }
  }, [activeBoard, getAuthHeaders, toast]);

  // Delete board
  const deleteBoard = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/boards/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to delete board');
      
      setBoards(prev => prev.filter(b => b.id !== id));
      if (activeBoard?.id === id) {
        setActiveBoard(boards.length > 1 ? boards[0] : null);
      }
      
      toast({
        title: 'Success',
        description: 'Board deleted'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete board',
        variant: 'destructive'
      });
    }
  }, [activeBoard, boards, getAuthHeaders, toast]);

  // Create list
  const createList = useCallback(async (boardId: string, title: string) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/lists`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ boardId, title, position: lists.length })
      });
      
      if (!response.ok) throw new Error('Failed to create list');
      
      const newList = await response.json();
      setLists(prev => [...prev, newList]);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create list',
        variant: 'destructive'
      });
    }
  }, [lists.length, getAuthHeaders, toast]);

  // Update list
  const updateList = useCallback(async (id: string, updates: Partial<TodoList>) => {
    try {
      const response = await fetch(`/api/lists/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update list');
      
      const updated = await response.json();
      setLists(prev => prev.map(l => l.id === id ? updated : l));
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update list',
        variant: 'destructive'
      });
    }
  }, [getAuthHeaders, toast]);

  // Delete list
  const deleteList = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/lists/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to delete list');
      
      setLists(prev => prev.filter(l => l.id !== id));
      setCards(prev => prev.filter(c => c.listId !== id));
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete list',
        variant: 'destructive'
      });
    }
  }, [getAuthHeaders, toast]);

  // Create card
  const createCard = useCallback(async (listId: string, title: string) => {
    try {
      const position = cards.filter(c => c.listId === listId).length;
      
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          userId: user?.uid,
          listId, 
          title, 
          position 
        })
      });
      
      if (!response.ok) throw new Error('Failed to create card');
      
      const newCard = await response.json();
      setCards(prev => [...prev, newCard]);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create card',
        variant: 'destructive'
      });
    }
  }, [user?.uid, cards, getAuthHeaders, toast]);

  // Create inbox card (no listId)
  const createInboxCard = useCallback(async (title: string) => {
    try {
      const position = inboxCards.length;
      
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          userId: user?.uid,
          listId: null, 
          title, 
          position 
        })
      });
      
      if (!response.ok) throw new Error('Failed to create inbox card');
      
      const newCard = await response.json();
      setInboxCards(prev => [...prev, newCard]);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create inbox card',
        variant: 'destructive'
      });
    }
  }, [user?.uid, inboxCards.length, getAuthHeaders, toast]);

  // Update card
  const updateCard = useCallback(async (id: string, updates: Partial<Card>) => {
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update card');
      
      const updated = await response.json();
      setCards(prev => prev.map(c => c.id === id ? updated : c));
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update card',
        variant: 'destructive'
      });
    }
  }, [getAuthHeaders, toast]);

  // Delete card
  const deleteCard = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to delete card');
      
      setCards(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete card',
        variant: 'destructive'
      });
    }
  }, [getAuthHeaders, toast]);

  // Move card
  const moveCard = useCallback(async (cardId: string, newListId: string | null, newPosition: number) => {
    try {
      const response = await fetch(`/api/cards/${cardId}/move`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ listId: newListId, position: newPosition })
      });
      
      if (!response.ok) throw new Error('Failed to move card');
      
      const updated = await response.json();
      
      // If moving from inbox to a list, remove from inboxCards and add to cards
      const wasInInbox = inboxCards.some(c => c.id === cardId);
      if (wasInInbox && newListId) {
        setInboxCards(prev => prev.filter(c => c.id !== cardId));
        setCards(prev => [...prev, updated]);
      } else if (!wasInInbox) {
        // Card was already in cards, just update it
        setCards(prev => prev.map(c => c.id === cardId ? updated : c));
      }
      
      // If moving to inbox (newListId is null)
      if (newListId === null) {
        setCards(prev => prev.filter(c => c.id !== cardId));
        setInboxCards(prev => [...prev, updated]);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to move card',
        variant: 'destructive'
      });
      throw err;
    }
  }, [inboxCards, getAuthHeaders, toast]);

  // Create label
  const createLabel = useCallback(async (name: string, color: string) => {
    try {
      const response = await fetch('/api/labels', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: user?.uid, name, color })
      });
      
      if (!response.ok) throw new Error('Failed to create label');
      
      const newLabel = await response.json();
      setLabels(prev => [...prev, newLabel]);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create label',
        variant: 'destructive'
      });
    }
  }, [user?.uid, getAuthHeaders, toast]);

  // Update label
  const updateLabel = useCallback(async (id: string, updates: { name?: string; color?: string }) => {
    try {
      const response = await fetch(`/api/labels/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update label');
      
      const updated = await response.json();
      setLabels(prev => prev.map(l => l.id === id ? updated : l));
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update label',
        variant: 'destructive'
      });
    }
  }, [getAuthHeaders, toast]);

  // Delete label
  const deleteLabel = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/labels/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to delete label');
      
      setLabels(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete label',
        variant: 'destructive'
      });
    }
  }, [getAuthHeaders, toast]);

  // Add label to card
  const addLabelToCard = useCallback(async (cardId: string, labelId: string) => {
    try {
      const response = await fetch(`/api/cards/${cardId}/labels`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ labelId })
      });
      
      if (!response.ok) throw new Error('Failed to add label');
      
      // Refresh card to get updated labels
      await refreshData();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add label',
        variant: 'destructive'
      });
    }
  }, [getAuthHeaders, refreshData, toast]);

  // Remove label from card
  const removeLabelFromCard = useCallback(async (cardId: string, labelId: string) => {
    try {
      const response = await fetch(`/api/cards/${cardId}/labels/${labelId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to remove label');
      
      // Refresh card to get updated labels
      await refreshData();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to remove label',
        variant: 'destructive'
      });
    }
  }, [getAuthHeaders, refreshData, toast]);

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
