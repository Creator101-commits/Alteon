import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FlashcardDeck {
  id: string;
  title: string;
  description?: string;
  cards: FlashcardItem[];
  source: 'anki' | 'notion' | 'local';
  lastSynced?: Date;
  tags?: string[];
}

interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  lastReviewed?: Date;
  reviewCount: number;
  successRate: number;
  tags?: string[];
}

interface AnkiCard {
  noteId: number;
  fields: {
    Front: string;
    Back: string;
    [key: string]: string;
  };
  tags: string[];
  deckName: string;
}

interface NotionPage {
  id: string;
  title: string;
  properties: Record<string, any>;
  children?: NotionBlock[];
}

interface NotionBlock {
  id: string;
  type: string;
  content: any;
}

export const useFlashcardIntegration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [connectedServices, setConnectedServices] = useState<string[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Anki Integration
  const connectAnki = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if AnkiConnect is running
      const response = await fetch('http://localhost:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'version',
          version: 6,
        }),
      });

      if (!response.ok) {
        throw new Error('AnkiConnect not available');
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setConnectedServices(prev => [...prev.filter(s => s !== 'anki'), 'anki']);
      
      toast({
        title: 'Anki Connected',
        description: 'Successfully connected to Anki via AnkiConnect.',
      });

      return result.result;
    } catch (error) {
      toast({
        title: 'Anki Connection Failed',
        description: 'Please ensure Anki is running with AnkiConnect add-on installed.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const importAnkiDecks = useCallback(async (): Promise<FlashcardDeck[]> => {
    try {
      // Get deck names
      const deckResponse = await fetch('http://localhost:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deckNames',
          version: 6,
        }),
      });

      const deckResult = await deckResponse.json();
      if (deckResult.error) throw new Error(deckResult.error);

      const convertedDecks: FlashcardDeck[] = [];

      for (const deckName of deckResult.result) {
        // Get cards for each deck
        const cardsResponse = await fetch('http://localhost:8765', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'findCards',
            version: 6,
            params: {
              query: `deck:"${deckName}"`,
            },
          }),
        });

        const cardsResult = await cardsResponse.json();
        if (cardsResult.error) continue;

        // Get card info
        const cardInfoResponse = await fetch('http://localhost:8765', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cardsInfo',
            version: 6,
            params: {
              cards: cardsResult.result.slice(0, 50), // Limit to first 50 cards
            },
          }),
        });

        const cardInfoResult = await cardInfoResponse.json();
        if (cardInfoResult.error) continue;

        const cards: FlashcardItem[] = cardInfoResult.result.map((card: any) => ({
          id: `anki-${card.cardId}`,
          front: card.fields.Front?.value || '',
          back: card.fields.Back?.value || '',
          reviewCount: card.reps || 0,
          successRate: card.lapses > 0 ? (card.reps - card.lapses) / card.reps : 1,
          tags: card.tags,
        }));

        convertedDecks.push({
          id: `anki-${deckName}`,
          title: deckName,
          source: 'anki' as const,
          lastSynced: new Date(),
          cards,
        });
      }

      setDecks(prev => [...prev.filter(d => !d.id.startsWith('anki-')), ...convertedDecks]);
      return convertedDecks;
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: 'Could not import Anki decks. Ensure AnkiConnect is running.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  // Notion Integration
  const connectNotion = useCallback(async () => {
    setIsLoading(true);
    try {
      const clientId = process.env.VITE_NOTION_CLIENT_ID;
      const redirectUri = `${window.location.origin}/auth/notion/callback`;
      
      const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      const authWindow = window.open(authUrl, 'notion-auth', 'width=500,height=600');
      
      return new Promise((resolve, reject) => {
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed);
            const token = localStorage.getItem('notion_access_token');
            if (token) {
              setConnectedServices(prev => [...prev.filter(s => s !== 'notion'), 'notion']);
              resolve(token);
            } else {
              reject(new Error('Authentication cancelled'));
            }
          }
        }, 1000);
      });
    } catch (error) {
      toast({
        title: 'Notion Connection Failed',
        description: 'Could not connect to Notion. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const importNotionFlashcards = useCallback(async (): Promise<FlashcardDeck[]> => {
    const token = localStorage.getItem('notion_access_token');
    if (!token) throw new Error('Not connected to Notion');

    try {
      // Search for databases that could contain flashcards
      const searchResponse = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          filter: {
            property: 'object',
            value: 'database',
          },
        }),
      });

      const searchResult = await searchResponse.json();
      if (searchResult.status !== 200 && searchResult.results) {
        throw new Error('Failed to search Notion databases');
      }

      const convertedDecks: FlashcardDeck[] = [];

      for (const database of searchResult.results) {
        // Query database for pages (potential flashcards)
        const queryResponse = await fetch(`https://api.notion.com/v1/databases/${database.id}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
          },
        });

        const queryResult = await queryResponse.json();
        if (queryResult.status !== 200 && queryResult.results) continue;

        const cards: FlashcardItem[] = queryResult.results.map((page: any, index: number) => {
          // Extract front/back from page properties
          const properties = page.properties;
          let front = '';
          let back = '';

          // Try to find question/answer or front/back properties
          Object.entries(properties).forEach(([key, value]: [string, any]) => {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('question') || lowerKey.includes('front')) {
              front = value.title?.[0]?.text?.content || value.rich_text?.[0]?.text?.content || '';
            }
            if (lowerKey.includes('answer') || lowerKey.includes('back')) {
              back = value.title?.[0]?.text?.content || value.rich_text?.[0]?.text?.content || '';
            }
          });

          return {
            id: `notion-${database.id}-${page.id}`,
            front: front || `Card ${index + 1}`,
            back: back || 'No answer found',
            reviewCount: 0,
            successRate: 0,
          };
        }).filter((card: FlashcardItem) => card.front && card.back);

        if (cards.length > 0) {
          convertedDecks.push({
            id: `notion-${database.id}`,
            title: database.title?.[0]?.text?.content || 'Untitled Deck',
            source: 'notion' as const,
            lastSynced: new Date(),
            cards,
          });
        }
      }

      setDecks(prev => [...prev.filter(d => !d.id.startsWith('notion-')), ...convertedDecks]);
      return convertedDecks;
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: 'Could not import Notion flashcards.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const exportToAnki = useCallback(async (deck: FlashcardDeck) => {
    try {
      // Create deck in Anki
      await fetch('http://localhost:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createDeck',
          version: 6,
          params: {
            deck: deck.title,
          },
        }),
      });

      // Add notes to deck
      const notes = deck.cards.map(card => ({
        deckName: deck.title,
        modelName: 'Basic',
        fields: {
          Front: card.front,
          Back: card.back,
        },
        tags: card.tags || [],
      }));

      const addNotesResponse = await fetch('http://localhost:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addNotes',
          version: 6,
          params: {
            notes,
          },
        }),
      });

      const result = await addNotesResponse.json();
      if (result.error) throw new Error(result.error);

      toast({
        title: 'Export Successful',
        description: `Deck "${deck.title}" exported to Anki!`,
      });

      return result.result;
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Could not export deck to Anki. Ensure Anki is running.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const exportToNotion = useCallback(async (deck: FlashcardDeck) => {
    const token = localStorage.getItem('notion_access_token');
    if (!token) throw new Error('Not connected to Notion');

    try {
      // Create a new database for the flashcards
      const parentPageId = process.env.VITE_NOTION_PARENT_PAGE_ID || 'root';
      
      const createDbResponse = await fetch('https://api.notion.com/v1/databases', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          parent: { page_id: parentPageId },
          title: [{ text: { content: deck.title } }],
          properties: {
            Question: { title: {} },
            Answer: { rich_text: {} },
            Difficulty: {
              select: {
                options: [
                  { name: 'Easy', color: 'green' },
                  { name: 'Medium', color: 'yellow' },
                  { name: 'Hard', color: 'red' },
                ],
              },
            },
          },
        }),
      });

      const database = await createDbResponse.json();
      if (database.status !== 200 && database.id) {
        throw new Error('Failed to create Notion database');
      }

      // Add pages for each flashcard
      for (const card of deck.cards) {
        await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
          },
          body: JSON.stringify({
            parent: { database_id: database.id },
            properties: {
              Question: {
                title: [{ text: { content: card.front } }],
              },
              Answer: {
                rich_text: [{ text: { content: card.back } }],
              },
              Difficulty: {
                select: { name: card.difficulty || 'Medium' },
              },
            },
          }),
        });
      }

      toast({
        title: 'Export Successful',
        description: `Deck "${deck.title}" exported to Notion!`,
      });

      return database.id;
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Could not export deck to Notion.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  // Local deck management
  const createLocalDeck = useCallback((title: string, description?: string): FlashcardDeck => {
    const newDeck: FlashcardDeck = {
      id: `local-${Date.now()}`,
      title,
      description,
      source: 'local',
      cards: [],
    };

    setDecks(prev => [...prev, newDeck]);
    
    // Save to localStorage
    const savedDecks = JSON.parse(localStorage.getItem(`flashcard_decks_${user?.uid}`) || '[]');
    savedDecks.push(newDeck);
    localStorage.setItem(`flashcard_decks_${user?.uid}`, JSON.stringify(savedDecks));

    return newDeck;
  }, [user?.uid]);

  const addCardToDeck = useCallback((deckId: string, card: Omit<FlashcardItem, 'id'>) => {
    const newCard: FlashcardItem = {
      ...card,
      id: `${deckId}-card-${Date.now()}`,
    };

    setDecks(prev => prev.map(deck => 
      deck.id === deckId 
        ? { ...deck, cards: [...deck.cards, newCard] }
        : deck
    ));

    // Update localStorage
    const savedDecks = JSON.parse(localStorage.getItem(`flashcard_decks_${user?.uid}`) || '[]');
    const updatedDecks = savedDecks.map((deck: FlashcardDeck) =>
      deck.id === deckId
        ? { ...deck, cards: [...deck.cards, newCard] }
        : deck
    );
    localStorage.setItem(`flashcard_decks_${user?.uid}`, JSON.stringify(updatedDecks));

    return newCard;
  }, [user?.uid]);

  const updateCardStats = useCallback((deckId: string, cardId: string, correct: boolean) => {
    setDecks(prev => prev.map(deck =>
      deck.id === deckId
        ? {
            ...deck,
            cards: deck.cards.map(card =>
              card.id === cardId
                ? {
                    ...card,
                    reviewCount: card.reviewCount + 1,
                    successRate: ((card.successRate * card.reviewCount) + (correct ? 1 : 0)) / (card.reviewCount + 1),
                    lastReviewed: new Date(),
                  }
                : card
            ),
          }
        : deck
    ));
  }, []);

  // Load saved decks on mount
  const loadSavedDecks = useCallback(() => {
    if (!user?.uid) return;
    
    const savedDecks = JSON.parse(localStorage.getItem(`flashcard_decks_${user.uid}`) || '[]');
    setDecks(prev => [...prev.filter(d => d.source !== 'local'), ...savedDecks]);
  }, [user?.uid]);

  return {
    // State
    isLoading,
    connectedServices,
    decks,
    
    // Anki
    connectAnki,
    importAnkiDecks,
    exportToAnki,
    
    // Notion
    connectNotion,
    importNotionFlashcards,
    exportToNotion,
    
    // Local management
    createLocalDeck,
    addCardToDeck,
    updateCardStats,
    loadSavedDecks,
  };
};
