import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Board {
  id: string;
  userId: string;
  title: string;
  background: string | null;
  position: number;
  isArchived: boolean;
  isFavorited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoList {
  id: string;
  boardId: string;
  title: string;
  position: number;
  isArchived: boolean;
  createdAt: Date;
}

export interface Card {
  id: string;
  listId: string | null;
  boardId: string | null;
  userId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  isCompleted: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Checklist {
  id: string;
  cardId: string;
  title: string;
  isChecked: boolean;
  position: number;
  createdAt: Date;
}

export interface Label {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: Date;
}

export function useTodoBoards() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [inboxCards, setInboxCards] = useState<Card[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-user-id': user?.uid || '',
  });

  // Fetch all boards
  const fetchBoards = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch('/api/boards', {
        headers: getHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch boards');
      
      const data = await response.json();
      setBoards(data);
      
      // Auto-select first board if none selected
      if (!currentBoard && data.length > 0) {
        setCurrentBoard(data[0]);
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load boards',
        variant: 'destructive',
      });
    }
  }, [user?.uid, currentBoard, toast]);

  // Fetch lists for current board
  const fetchLists = useCallback(async (boardId: string) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/lists`, {
        headers: getHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch lists');
      
      const data = await response.json();
      setLists(data);
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  }, [user?.uid]);

  // Fetch cards for a list
  const fetchCards = useCallback(async (listId: string) => {
    try {
      const response = await fetch(`/api/lists/${listId}/cards`, {
        headers: getHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch cards');
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching cards:', error);
      return [];
    }
  }, [user?.uid]);

  // Fetch inbox cards
  const fetchInboxCards = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch('/api/cards/inbox', {
        headers: getHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch inbox');
      
      const data = await response.json();
      setInboxCards(data);
    } catch (error) {
      console.error('Error fetching inbox:', error);
    }
  }, [user?.uid]);

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch('/api/labels', {
        headers: getHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch labels');
      
      const data = await response.json();
      setLabels(data);
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  }, [user?.uid]);

  // Create board
  const createBoard = useCallback(async (title: string, background?: string) => {
    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title, background: background || null, position: boards.length }),
      });
      
      if (!response.ok) throw new Error('Failed to create board');
      
      const newBoard = await response.json();
      setBoards(prev => [...prev, newBoard]);
      setCurrentBoard(newBoard);
      
      toast({
        title: 'Board Created',
        description: `"${title}" has been created`,
      });
      
      return newBoard;
    } catch (error) {
      console.error('Error creating board:', error);
      toast({
        title: 'Error',
        description: 'Failed to create board',
        variant: 'destructive',
      });
      throw error;
    }
  }, [boards.length, user?.uid, toast]);

  // Update board
  const updateBoard = useCallback(async (id: string, updates: Partial<Board>) => {
    try {
      const response = await fetch(`/api/boards/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to update board');
      
      const updated = await response.json();
      setBoards(prev => prev.map(b => b.id === id ? updated : b));
      
      if (currentBoard?.id === id) {
        setCurrentBoard(updated);
      }
      
      return updated;
    } catch (error) {
      console.error('Error updating board:', error);
      toast({
        title: 'Error',
        description: 'Failed to update board',
        variant: 'destructive',
      });
      throw error;
    }
  }, [currentBoard, user?.uid, toast]);

  // Delete board
  const deleteBoard = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/boards/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to delete board');
      
      setBoards(prev => prev.filter(b => b.id !== id));
      
      if (currentBoard?.id === id) {
        setCurrentBoard(boards.find(b => b.id !== id) || null);
      }
      
      toast({
        title: 'Board Deleted',
        description: 'Board has been removed',
      });
    } catch (error) {
      console.error('Error deleting board:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete board',
        variant: 'destructive',
      });
    }
  }, [boards, currentBoard, user?.uid, toast]);

  // Create list
  const createList = useCallback(async (boardId: string, title: string) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/lists`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title, position: lists.length }),
      });
      
      if (!response.ok) throw new Error('Failed to create list');
      
      const newList = await response.json();
      setLists(prev => [...prev, newList]);
      
      return newList;
    } catch (error) {
      console.error('Error creating list:', error);
      toast({
        title: 'Error',
        description: 'Failed to create list',
        variant: 'destructive',
      });
      throw error;
    }
  }, [lists.length, user?.uid, toast]);

  // Update list
  const updateList = useCallback(async (id: string, updates: Partial<TodoList>) => {
    try {
      const response = await fetch(`/api/lists/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to update list');
      
      const updated = await response.json();
      setLists(prev => prev.map(l => l.id === id ? updated : l));
      
      return updated;
    } catch (error) {
      console.error('Error updating list:', error);
      toast({
        title: 'Error',
        description: 'Failed to update list',
        variant: 'destructive',
      });
      throw error;
    }
  }, [user?.uid, toast]);

  // Delete list
  const deleteList = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/lists/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to delete list');
      
      setLists(prev => prev.filter(l => l.id !== id));
      
      toast({
        title: 'List Deleted',
        description: 'List and its cards have been removed',
      });
    } catch (error) {
      console.error('Error deleting list:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete list',
        variant: 'destructive',
      });
    }
  }, [user?.uid, toast]);

  // Create card
  const createCard = useCallback(async (data: { title: string; listId?: string; boardId?: string; description?: string }) => {
    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to create card');
      
      const newCard = await response.json();
      
      if (data.listId) {
        setCards(prev => [...prev, newCard]);
      } else {
        setInboxCards(prev => [...prev, newCard]);
      }
      
      return newCard;
    } catch (error) {
      console.error('Error creating card:', error);
      toast({
        title: 'Error',
        description: 'Failed to create card',
        variant: 'destructive',
      });
      throw error;
    }
  }, [user?.uid, toast]);

  // Update card
  const updateCard = useCallback(async (id: string, updates: Partial<Card>) => {
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to update card');
      
      const updated = await response.json();
      
      // Update in appropriate state
      setCards(prev => prev.map(c => c.id === id ? updated : c));
      setInboxCards(prev => prev.map(c => c.id === id ? updated : c));
      
      return updated;
    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        title: 'Error',
        description: 'Failed to update card',
        variant: 'destructive',
      });
      throw error;
    }
  }, [user?.uid, toast]);

  // Move card (drag and drop)
  const moveCard = useCallback(async (cardId: string, listId: string | null, boardId: string | null, position: number) => {
    try {
      const response = await fetch(`/api/cards/${cardId}/move`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ listId, boardId, position }),
      });
      
      if (!response.ok) throw new Error('Failed to move card');
      
      const updated = await response.json();
      
      // Remove from inbox if moved to list
      if (listId) {
        setInboxCards(prev => prev.filter(c => c.id !== cardId));
        setCards(prev => [...prev.filter(c => c.id !== cardId), updated]);
      } else {
        setCards(prev => prev.filter(c => c.id !== cardId));
        setInboxCards(prev => [...prev.filter(c => c.id !== cardId), updated]);
      }
      
      return updated;
    } catch (error) {
      console.error('Error moving card:', error);
      toast({
        title: 'Error',
        description: 'Failed to move card',
        variant: 'destructive',
      });
      throw error;
    }
  }, [user?.uid, toast]);

  // Delete card
  const deleteCard = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to delete card');
      
      setCards(prev => prev.filter(c => c.id !== id));
      setInboxCards(prev => prev.filter(c => c.id !== id));
      
      toast({
        title: 'Card Deleted',
        description: 'Card has been removed',
      });
    } catch (error) {
      console.error('Error deleting card:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete card',
        variant: 'destructive',
      });
    }
  }, [user?.uid, toast]);

  // Create label
  const createLabel = useCallback(async (name: string, color: string) => {
    try {
      const response = await fetch('/api/labels', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, color }),
      });
      
      if (!response.ok) throw new Error('Failed to create label');
      
      const newLabel = await response.json();
      setLabels(prev => [...prev, newLabel]);
      
      return newLabel;
    } catch (error) {
      console.error('Error creating label:', error);
      toast({
        title: 'Error',
        description: 'Failed to create label',
        variant: 'destructive',
      });
      throw error;
    }
  }, [user?.uid, toast]);

  // Initial data load
  useEffect(() => {
    if (user?.uid) {
      const loadData = async () => {
        setLoading(true);
        await Promise.all([
          fetchBoards(),
          fetchInboxCards(),
          fetchLabels(),
        ]);
        setLoading(false);
      };
      
      loadData();
    }
  }, [user?.uid]);

  // Load lists when board changes
  useEffect(() => {
    if (currentBoard) {
      fetchLists(currentBoard.id);
    }
  }, [currentBoard, fetchLists]);

  return {
    // State
    boards,
    currentBoard,
    lists,
    cards,
    inboxCards,
    labels,
    loading,
    
    // Board actions
    setCurrentBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    
    // List actions
    createList,
    updateList,
    deleteList,
    fetchCards,
    
    // Card actions
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    fetchInboxCards,
    
    // Label actions
    createLabel,
  };
}
