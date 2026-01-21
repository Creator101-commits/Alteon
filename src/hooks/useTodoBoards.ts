import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabaseStorage } from '@/lib/supabase-storage';

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
  userId: string;
  title: string;
  description?: string | null;
  position: number;
  dueDate?: Date | null;
  isCompleted: boolean;
  isArchived: boolean;
  labels?: Label[];
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

  // Type mappers to handle nullable fields from Supabase
  const mapList = (l: any): TodoList => ({
    ...l,
    position: l.position ?? 0,
    isArchived: l.isArchived ?? false,
    createdAt: l.createdAt || new Date()
  });

  const mapCard = (c: any): Card => ({
    ...c,
    position: c.position ?? 0,
    isArchived: c.isArchived ?? false,
    isCompleted: c.isCompleted ?? false,
    createdAt: c.createdAt || new Date(),
    updatedAt: c.updatedAt || new Date()
  });

  const mapLabel = (l: any): Label => ({
    ...l,
    createdAt: l.createdAt || new Date()
  });

  const mapBoard = (b: any): Board => ({
    ...b,
    createdAt: b.createdAt || new Date(),
    updatedAt: b.updatedAt || new Date(),
    position: b.position ?? 0,
    isArchived: b.isArchived ?? false,
    isFavorited: b.isFavorited ?? false
  });

  // Fetch all boards
  const fetchBoards = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const data = await supabaseStorage.getBoardsByUserId(user.uid);
      // Map to match Board type (handle nullables)
      const boards = data.map(b => ({
        ...b,
        position: b.position ?? 0,
        isArchived: b.isArchived ?? false,
        isFavorited: b.isFavorited ?? false,
      })) as Board[];
      setBoards(boards);
      
      // Auto-select first board if none selected
      if (!currentBoard && boards.length > 0) {
        setCurrentBoard(boards[0]);
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
      const data = await supabaseStorage.getListsByBoardId(boardId);
      setLists(data.map(mapList));
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  }, [user?.uid]);

  // Fetch cards for a list
  const fetchCards = useCallback(async (listId: string) => {
    try {
      return await supabaseStorage.getCardsByListId(listId);
    } catch (error) {
      console.error('Error fetching cards:', error);
      return [];
    }
  }, [user?.uid]);

  // Fetch inbox cards
  const fetchInboxCards = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const data = await supabaseStorage.getInboxCards(user.uid);
      setInboxCards(data.map(mapCard));
    } catch (error) {
      console.error('Error fetching inbox:', error);
    }
  }, [user?.uid]);

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const data = await supabaseStorage.getLabelsByUserId(user.uid);
      setLabels(data.map(mapLabel));
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  }, [user?.uid]);

  // Create board
  const createBoard = useCallback(async (title: string, background?: string) => {
    if (!user?.uid) return;
    
    try {
      const newBoard = await supabaseStorage.createBoard({
        userId: user.uid,
        title,
        background: background || null,
        position: boards.length,
      });
      
      const mappedBoard = {
        ...newBoard,
        createdAt: newBoard.createdAt || new Date(),
        updatedAt: newBoard.updatedAt || new Date(),
        background: newBoard.background || null,
        position: newBoard.position ?? boards.length,
        isArchived: newBoard.isArchived ?? false,
        isFavorited: newBoard.isFavorited ?? false
      };
      
      setBoards(prev => [...prev, mappedBoard]);
      setCurrentBoard(mappedBoard);
      
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
      const updated = await supabaseStorage.updateBoard(id, updates);
      
      if (updated) {
        const mappedBoard = {
          ...updated,
          createdAt: updated.createdAt || new Date(),
          updatedAt: updated.updatedAt || new Date(),
          position: updated.position ?? 0,
          isArchived: updated.isArchived ?? false,
          isFavorited: updated.isFavorited ?? false
        };
        
        setBoards(prev => prev.map(b => b.id === id ? mappedBoard : b));
        
        if (currentBoard?.id === id) {
          setCurrentBoard(mappedBoard);
        }
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
  }, [currentBoard, toast]);

  // Delete board
  const deleteBoard = useCallback(async (id: string) => {
    try {
      const success = await supabaseStorage.deleteBoard(id);
      
      if (success) {
        setBoards(prev => prev.filter(b => b.id !== id));
        
        if (currentBoard?.id === id) {
          setCurrentBoard(boards.find(b => b.id !== id) || null);
        }
        
        toast({
          title: 'Board Deleted',
          description: 'Board has been removed',
        });
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete board',
        variant: 'destructive',
      });
    }
  }, [boards, currentBoard, toast]);

  // Create list
  const createList = useCallback(async (boardId: string, title: string) => {
    try {
      const newList = await supabaseStorage.createList({
        boardId,
        title,
        position: lists.length,
      });
      
      setLists(prev => [...prev, mapList(newList)]);
      
      toast({
        title: 'List Created',
        description: `"${title}" has been created`,
      });
      
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
  }, [lists.length, toast]);

  // Update list
  const updateList = useCallback(async (id: string, updates: Partial<TodoList>) => {
    try {
      const updated = await supabaseStorage.updateList(id, updates);
      
      if (updated) {
        setLists(prev => prev.map(l => l.id === id ? mapList(updated) : l));
      }
      
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
  }, [toast]);

  // Delete list
  const deleteList = useCallback(async (id: string) => {
    try {
      const success = await supabaseStorage.deleteList(id);
      
      if (success) {
        setLists(prev => prev.filter(l => l.id !== id));
        
        toast({
          title: 'List Deleted',
          description: 'List and its cards have been removed',
        });
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete list',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Create card
  const createCard = useCallback(async (data: { title: string; listId?: string; boardId?: string; description?: string }) => {
    if (!user?.uid) return;
    
    try {
      const newCard = await supabaseStorage.createCard({
        userId: user.uid,
        title: data.title,
        listId: data.listId || null,
        description: data.description || null,
      });
      
      const mappedCard = mapCard(newCard);
      if (data.listId) {
        setCards(prev => [...prev, mappedCard]);
      } else {
        setInboxCards(prev => [...prev, mappedCard]);
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
      const updated = await supabaseStorage.updateCard(id, updates);
      
      if (updated) {
        const mappedCard = mapCard(updated);
        // Update in appropriate state
        setCards(prev => prev.map(c => c.id === id ? mappedCard : c));
        setInboxCards(prev => prev.map(c => c.id === id ? mappedCard : c));
      }
      
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
  }, [toast]);

  // Move card (drag and drop)
  const moveCard = useCallback(async (cardId: string, listId: string | null, boardId: string | null, position: number) => {
    try {
      const updated = await supabaseStorage.updateCard(cardId, {
        listId,
        position,
      });
      
      if (updated) {
        const mappedCard = mapCard(updated);
        // Remove from inbox if moved to list
        if (listId) {
          setInboxCards(prev => prev.filter(c => c.id !== cardId));
          setCards(prev => [...prev.filter(c => c.id !== cardId), mappedCard]);
        } else {
          setCards(prev => prev.filter(c => c.id !== cardId));
          setInboxCards(prev => [...prev.filter(c => c.id !== cardId), mappedCard]);
        }
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
  }, [toast]);

  // Delete card
  const deleteCard = useCallback(async (id: string) => {
    try {
      const success = await supabaseStorage.deleteCard(id);
      
      if (success) {
        setCards(prev => prev.filter(c => c.id !== id));
        setInboxCards(prev => prev.filter(c => c.id !== id));
        
        toast({
          title: 'Card Deleted',
          description: 'Card has been removed',
        });
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete card',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Create label
  const createLabel = useCallback(async (name: string, color: string) => {
    if (!user?.uid) return;
    
    try {
      const newLabel = await supabaseStorage.createLabel({
        userId: user.uid,
        name,
        color,
      });
      
      setLabels(prev => [...prev, mapLabel(newLabel)]);
      
      toast({
        title: 'Label Created',
        description: `"${name}" has been created`,
      });
      
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
