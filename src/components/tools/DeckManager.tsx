import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { 
  Plus, 
  Folder, 
  FolderOpen, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  Move, 
  ChevronRight,
  ChevronDown,
  Palette,
  Hash,
  Brain
} from 'lucide-react';

interface FlashcardDeck {
  id: string;
  userId: string;
  name: string;
  description?: string;
  parentDeckId?: string | null;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface DeckManagerProps {
  onDeckSelect?: (deckId: string) => void;
  selectedDeckId?: string;
  onStudyDeck?: (deckId: string) => void;
}

export default function DeckManager({ onDeckSelect, selectedDeckId, onStudyDeck }: DeckManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
  const [expandedDecks, setExpandedDecks] = useState<Set<string>>(new Set());
  const [newDeck, setNewDeck] = useState({
    name: '',
    description: '',
    parentDeckId: '',
    color: '#3b82f6'
  });
  const [hasError, setHasError] = useState(false);

  const predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
  ];

  useEffect(() => {
    try {
      loadDecks();
    } catch (error) {
      console.error('DeckManager initialization error:', error);
      setHasError(true);
      setLoading(false);
    }
  }, []);

  const loadDecks = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const response = await apiGet(`/api/users/${user.uid}/flashcard-decks`);
      console.log(' Raw API response:', response);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const decks = await response.json() as FlashcardDeck[];
      console.log(' Parsed decks:', decks);
      
      // Validate and sanitize deck data
      const validDecks = decks.filter(deck => 
        deck && 
        typeof deck.id === 'string' && 
        typeof deck.name === 'string' &&
        typeof deck.userId === 'string'
      ).map(deck => ({
        id: deck.id,
        userId: deck.userId,
        name: deck.name || 'Untitled Deck',
        description: deck.description || '',
        parentDeckId: deck.parentDeckId || null,
        color: deck.color || '#3b82f6',
        sortOrder: deck.sortOrder || 0,
        createdAt: deck.createdAt || new Date().toISOString(),
        updatedAt: deck.updatedAt || new Date().toISOString()
      }));
      
      console.log(' Valid decks:', validDecks);
      setDecks(validDecks);
    } catch (error) {
      console.error('Failed to load decks:', error);
      // Don't show error toast for missing endpoints - just log and continue
      console.log('Deck management API not available - using empty state');
      setDecks([]);
    } finally {
      setLoading(false);
    }
  };

  const createDeck = async () => {
    if (!user?.uid || !newDeck.name.trim()) return;

    try {
      const deckData = {
        name: newDeck.name.trim(),
        description: newDeck.description.trim() || null,
        parentDeckId: newDeck.parentDeckId || null,
        color: newDeck.color,
        sortOrder: 0
      };

      const response = await apiPost(`/api/users/${user.uid}/flashcard-decks`, deckData);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const createdDeck = await response.json() as FlashcardDeck;
      setDecks(prev => [...prev, createdDeck]);
      
      toast({
        title: "Success",
        description: "Deck created successfully",
      });

      setNewDeck({ name: '', description: '', parentDeckId: '', color: '#3b82f6' });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create deck:', error);
      toast({
        title: "Feature Not Available",
        description: "Deck management requires the Oracle database. Please ensure the database is properly configured.",
        variant: "destructive",
      });
    }
  };

  const updateDeck = async (deckId: string, updates: Partial<FlashcardDeck>) => {
    try {
      const response = await apiPut(`/api/flashcard-decks/${deckId}`, updates);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedDeck = await response.json() as FlashcardDeck;
      setDecks(prev => prev.map(deck => deck.id === deckId ? updatedDeck : deck));
      
      toast({
        title: "Success",
        description: "Deck updated successfully",
      });
    } catch (error) {
      console.error('Failed to update deck:', error);
      toast({
        title: "Feature Not Available",
        description: "Deck management requires the Oracle database. Please ensure the database is properly configured.",
        variant: "destructive",
      });
    }
  };

  const deleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure you want to delete this deck? This action cannot be undone.')) {
      return;
    }

    try {
      await apiDelete(`/api/flashcard-decks/${deckId}`);
      setDecks(prev => prev.filter(deck => deck.id !== deckId));
      
      toast({
        title: "Success",
        description: "Deck deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete deck:', error);
      toast({
        title: "Feature Not Available",
        description: "Deck management requires the Oracle database. Please ensure the database is properly configured.",
        variant: "destructive",
      });
    }
  };

  const toggleExpanded = (deckId: string) => {
    setExpandedDecks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deckId)) {
        newSet.delete(deckId);
      } else {
        newSet.add(deckId);
      }
      return newSet;
    });
  };

  const getRootDecks = () => decks.filter(deck => !deck.parentDeckId);
  const getSubDecks = (parentId: string) => decks.filter(deck => deck.parentDeckId === parentId);

  const renderDeckItem = (deck: FlashcardDeck, level: number = 0) => {
    try {
      // Validate deck data
      if (!deck || !deck.id || !deck.name) {
        console.error('Invalid deck data:', deck);
        return null;
      }

      const subDecks = getSubDecks(deck.id);
      const hasSubDecks = subDecks.length > 0;
      const isExpanded = expandedDecks.has(deck.id);
      const isSelected = selectedDeckId === deck.id;

    return (
      <div key={deck.id} className="space-y-1">
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
            isSelected ? 'bg-primary/10 border-primary/40' : 'border-border/40'
          }`}
          style={{ marginLeft: `${level * 20}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasSubDecks ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleExpanded(deck.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}

          {/* Deck Icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
            style={{ backgroundColor: deck.color }}
          >
            {hasSubDecks ? (
              isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />
            ) : (
              <Hash className="h-4 w-4" />
            )}
          </div>

          {/* Deck Info */}
          <div className="flex-1 min-w-0" onClick={() => onDeckSelect?.(deck.id)}>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{deck.name}</h3>
              {deck.description && (
                <Badge variant="secondary" className="text-xs">
                  {deck.description}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {subDecks.length} subdeck{subDecks.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onStudyDeck && (
                <DropdownMenuItem
                  onClick={() => onStudyDeck(deck.id)}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Study these
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  setNewDeck(prev => ({ ...prev, parentDeckId: deck.id }));
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Subdeck
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditingDeck(deck);
                  setIsEditDialogOpen(true);
                }}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Deck
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => deleteDeck(deck.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Deck
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sub-decks */}
        {hasSubDecks && isExpanded && (
          <div className="space-y-1">
            {subDecks.map(subDeck => renderDeckItem(subDeck, level + 1))}
          </div>
        )}
      </div>
    );
    } catch (error) {
      console.error(' Error rendering deck item:', error, deck);
      return (
        <div key={deck.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
          <p className="text-red-600 text-sm">Error rendering deck: {deck.name}</p>
        </div>
      );
    }
  };

  if (hasError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Deck Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Deck Manager Unavailable</p>
            <p className="text-sm">This feature requires the Oracle database to be properly configured.</p>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs">
              <p className="font-medium text-amber-600 dark:text-amber-400">Note:</p>
              <p>Deck management will be available once the database migration is complete.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Deck Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Deck Manager
          </CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Deck
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {newDeck.parentDeckId ? 'Create New Subdeck' : 'Create New Deck'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {newDeck.parentDeckId && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Creating subdeck for:</p>
                    <p className="font-medium">{decks.find(d => d.id === newDeck.parentDeckId)?.name || 'Unknown Deck'}</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="deck-name">Deck Name</Label>
                  <Input
                    id="deck-name"
                    value={newDeck.name}
                    onChange={(e) => setNewDeck(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter deck name"
                  />
                </div>
                <div>
                  <Label htmlFor="deck-description">Description (Optional)</Label>
                  <Textarea
                    id="deck-description"
                    value={newDeck.description}
                    onChange={(e) => setNewDeck(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter deck description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Parent Deck (Optional)</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newDeck.parentDeckId}
                    onChange={(e) => setNewDeck(prev => ({ ...prev, parentDeckId: e.target.value }))}
                  >
                    <option value="">No parent (Root deck)</option>
                    {getRootDecks().map(deck => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {predefinedColors.map(color => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newDeck.color === color ? 'border-foreground' : 'border-border'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewDeck(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createDeck} disabled={!newDeck.name.trim()}>
                    Create Deck
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {decks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No decks created yet</p>
            <p className="text-sm">Create your first deck to organize your flashcards</p>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs">
              <p className="font-medium text-amber-600 dark:text-amber-400">Note:</p>
              <p>Deck management requires the Oracle database to be properly configured.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {getRootDecks().map(deck => {
              const rendered = renderDeckItem(deck);
              return rendered || null;
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Deck</DialogTitle>
            </DialogHeader>
            {editingDeck && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-deck-name">Deck Name</Label>
                  <Input
                    id="edit-deck-name"
                    value={editingDeck.name}
                    onChange={(e) => setEditingDeck(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="Enter deck name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-deck-description">Description</Label>
                  <Textarea
                    id="edit-deck-description"
                    value={editingDeck.description || ''}
                    onChange={(e) => setEditingDeck(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Enter deck description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {predefinedColors.map(color => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          editingDeck.color === color ? 'border-foreground' : 'border-border'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditingDeck(prev => prev ? { ...prev, color } : null)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      if (editingDeck) {
                        updateDeck(editingDeck.id, {
                          name: editingDeck.name,
                          description: editingDeck.description,
                          color: editingDeck.color
                        });
                        setIsEditDialogOpen(false);
                      }
                    }}
                    disabled={!editingDeck?.name.trim()}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
