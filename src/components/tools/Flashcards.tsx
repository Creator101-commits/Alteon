import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Flashcard, InsertFlashcard, Note } from "@shared/schema";
import { GroqAPI } from "@/lib/groq";
import DeckManager from "./DeckManager";
import { ErrorBoundary } from "../ErrorBoundary";
import {
  Brain,
  Plus,
  RotateCcw,
  Eye,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2,
  Download,
  Upload,
  Link,
  Bot,
  FileText,
  StickyNote,
  Wand2,
  Loader2,
  Maximize,
  Minimize,
} from "lucide-react";

export const Flashcards = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCard, setNewCard] = useState({ 
    front: "", 
    back: "", 
    difficulty: "medium" as "easy" | "medium" | "hard",
    deckId: "",
    subdeckId: ""
  });

  // AI Flashcards state
  const [notes, setNotes] = useState<Note[]>([]);
  const [aiInputType, setAiInputType] = useState<"text" | "note" | "file" | "document">("text");
  const [aiInputText, setAiInputText] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<{ front: string; back: string; difficulty: string }[]>([]);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<{ jobId: string; fileName: string; status: string } | null>(null);
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [documentContent, setDocumentContent] = useState<string>("");

  // Deck management state
  const [decks, setDecks] = useState<Array<{id: string; name: string; parentDeckId?: string}>>([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [studyDeckId, setStudyDeckId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("manage");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get filtered flashcards based on study deck
  const filteredFlashcards = studyDeckId 
    ? flashcards.filter(card => card.deckId === studyDeckId)
    : flashcards;
  
  const currentCard = filteredFlashcards[currentCardIndex];

  // Load decks from database
  const loadDecks = async () => {
    if (!user?.uid) return;
    
    try {
      const response = await apiGet(`/api/users/${user.uid}/flashcard-decks`);
      if (response.ok) {
        const data = await response.json();
        console.log(' Raw decks data:', data);
        setDecks(data);
        console.log(' Loaded decks:', data.length);
      } else {
        console.error('Failed to load decks:', response.status);
      }
    } catch (error) {
      console.error('Error loading decks:', error);
    }
  };

  // Load flashcards from database
  const loadFlashcards = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const response = await apiGet(`/api/users/${user.uid}/flashcards`);
      if (response.ok) {
        const data = await response.json();
        setFlashcards(data);
        console.log(' Loaded flashcards:', data.length);
      } else {
        console.error('Failed to load flashcards:', response.status);
        toast({
          title: "Error",
          description: "Failed to load flashcards",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading flashcards:', error);
      setHasError(true);
      toast({
        title: "Error",
        description: "Failed to load flashcards",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create new flashcard
  const createFlashcard = async () => {
    if (!user?.uid || !newCard.front.trim() || !newCard.back.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both front and back of the flashcard",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(' Creating flashcard with data:', {
        front: newCard.front,
        back: newCard.back,
        difficulty: newCard.difficulty,
        deckId: newCard.deckId,
        subdeckId: newCard.subdeckId,
        finalDeckId: newCard.subdeckId || newCard.deckId || null,
        willUseSubdeck: !!newCard.subdeckId,
        willUseParentDeck: !newCard.subdeckId && !!newCard.deckId
      });
      
      const response = await apiPost(`/api/users/${user.uid}/flashcards`, {
        front: newCard.front,
        back: newCard.back,
        difficulty: newCard.difficulty,
        deckId: newCard.subdeckId ? newCard.subdeckId : (newCard.deckId || null),
      });

      if (response.ok) {
        const createdFlashcard = await response.json();
        setFlashcards(prev => [...prev, createdFlashcard]);
        setNewCard({ front: "", back: "", difficulty: "medium", deckId: "", subdeckId: "" });
        setIsCreateDialogOpen(false);
        toast({
          title: "Success",
          description: "Flashcard created successfully",
        });
      } else {
        throw new Error('Failed to create flashcard');
      }
    } catch (error) {
      console.error('Error creating flashcard:', error);
      toast({
        title: "Error",
        description: "Failed to create flashcard",
        variant: "destructive",
      });
    }
  };

  // Update flashcard review stats
  const updateFlashcardStats = async (flashcardId: string, correct: boolean) => {
    try {
      const flashcard = flashcards.find(f => f.id === flashcardId);
      if (!flashcard) return;

      const updatedReviewCount = (flashcard.reviewCount || 0) + 1;
      const updatedLastReviewed = new Date().toISOString();

      const response = await apiPut(`/api/flashcards/${flashcardId}`, {
        reviewCount: updatedReviewCount,
        lastReviewed: updatedLastReviewed,
      });

      if (response.ok) {
        setFlashcards(prev => prev.map(f => 
          f.id === flashcardId 
            ? { ...f, reviewCount: updatedReviewCount, lastReviewed: new Date(updatedLastReviewed) }
            : f
        ));
      }
    } catch (error) {
      console.error('Error updating flashcard stats:', error);
    }
  };

  // Delete flashcard
  const deleteFlashcard = async (flashcardId: string) => {
    try {
      const response = await apiDelete(`/api/flashcards/${flashcardId}`);
      if (response.ok) {
        setFlashcards(prev => prev.filter(f => f.id !== flashcardId));
        toast({
          title: "Success",
          description: "Flashcard deleted successfully",
        });
      } else {
        throw new Error('Failed to delete flashcard');
      }
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      toast({
        title: "Error",
        description: "Failed to delete flashcard",
        variant: "destructive",
      });
    }
  };

  // Helper function to strip HTML tags
  const stripHtmlTags = (html: string) => {
    return html.replace(/<[^>]+>/g, "");
  };

  // Load notes for AI flashcards
  const loadNotes = async () => {
    if (!user?.uid) return;
    
    try {
      const response = await apiGet("/api/notes");
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
        console.log(' Loaded notes for AI flashcards:', data.length);
      } else {
        console.error('Failed to load notes:', response.status);
        toast({
          title: "Error",
          description: "Failed to load notes for AI flashcards",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes for AI flashcards",
        variant: "destructive",
      });
    }
  };

  // Handle document upload for AI flashcards
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please upload a PDF, PPTX, or XLSX file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingDocument(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/document-intel/sessions", {
        method: "POST",
        headers: {
          "x-user-id": user?.uid || "",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload document");
      }

      const data = await response.json();
      
      setUploadedDocument({
        jobId: data.jobId,
        fileName: file.name,
        status: "processing",
      });

      toast({
        title: "Document Uploaded",
        description: "Processing your document...",
      });

      // Poll for document content
      pollDocumentContent(data.jobId);
    } catch (error) {
      console.error("Document upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
      setIsProcessingDocument(false);
    }
  };

  // Poll for document content
  const pollDocumentContent = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/document-intel/sessions/${jobId}/content`, {
          headers: {
            "x-user-id": user?.uid || "",
          }
        });

        if (response.ok) {
          const data = await response.json();
          clearInterval(pollInterval);
          
          setDocumentContent(data.content);
          setUploadedDocument(prev => prev ? { ...prev, status: "ready" } : null);
          setIsProcessingDocument(false);
          
          toast({
            title: "Document Ready",
            description: "Your document has been processed and is ready for flashcard generation!",
          });
        } else if (response.status === 404) {
          // Still processing
          console.log("Document still processing...");
        } else {
          // Error occurred
          console.error("Error fetching document:", response.statusText);
          clearInterval(pollInterval);
          setIsProcessingDocument(false);
          setUploadedDocument(prev => prev ? { ...prev, status: "error" } : null);
          toast({
            title: "Processing Failed",
            description: "Failed to process document",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error polling document status:", error);
      }
    }, 2000);
  };

  // Generate flashcards using AI
  const generateFlashcards = async () => {
    if (!user?.uid) return;

    let content = "";
    
    // Get content based on input type
    if (aiInputType === "text") {
      content = aiInputText.trim();
    } else if (aiInputType === "note") {
      const selectedNote = notes.find(note => note.id === selectedNoteId);
      if (selectedNote) {
        content = stripHtmlTags(selectedNote.content);
      }
    } else if (aiInputType === "file" && uploadedFile) {
      const text = await uploadedFile.text();
      content = text;
    } else if (aiInputType === "document" && documentContent) {
      content = documentContent;
    }

    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Please provide content to generate flashcards from",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const groq = new GroqAPI();
      
      const prompt = `Generate flashcards from the following content. Create 5-10 high-quality flashcards that would be useful for studying. Each flashcard should have a clear question on the front and a comprehensive answer on the back. Format your response as a JSON array where each object has "front", "back", and "difficulty" (easy/medium/hard) fields.

Content:
${content}

Return only the JSON array, no other text.`;

      const response = await groq.chat({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: 2000,
        temperature: 0.7,
      });

      // Parse the AI response
      const cardsData = JSON.parse(response.content);
      
      if (Array.isArray(cardsData)) {
        setGeneratedCards(cardsData);
        toast({
          title: "Success",
          description: `Generated ${cardsData.length} flashcards!`,
        });
      } else {
        throw new Error("Invalid response format from AI");
      }
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast({
        title: "Error",
        description: "Failed to generate flashcards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Save generated flashcards to database
  const saveGeneratedFlashcards = async () => {
    if (!user?.uid || generatedCards.length === 0) return;

    try {
      const promises = generatedCards.map(card => 
        apiPost(`/api/users/${user.uid}/flashcards`, {
          front: card.front,
          back: card.back,
          difficulty: card.difficulty,
        })
      );

      await Promise.all(promises);
      
      // Reload flashcards
      await loadFlashcards();
      
      // Reset AI state
      setGeneratedCards([]);
      setAiInputText("");
      setSelectedNoteId("");
      setUploadedFile(null);
      setIsAiDialogOpen(false);
      
      toast({
        title: "Success",
        description: `Saved ${generatedCards.length} flashcards!`,
      });
    } catch (error) {
      console.error('Error saving flashcards:', error);
      toast({
        title: "Error",
        description: "Failed to save some flashcards. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/plain") {
      setUploadedFile(file);
    } else {
      toast({
        title: "Error",
        description: "Please upload a .txt file",
        variant: "destructive",
      });
    }
  };

  // Load flashcards on component mount
  useEffect(() => {
    try {
      loadFlashcards();
      loadNotes();
      loadDecks();
    } catch (error) {
      console.error('Flashcards component initialization error:', error);
      setHasError(true);
    }
  }, [user?.uid]);


  const startStudyingDeck = (deckId: string) => {
    setStudyDeckId(deckId);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setActiveTab("study");
  };

  const clearStudyFilter = () => {
    setStudyDeckId(null);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const nextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % filteredFlashcards.length);
    setIsFlipped(false);
  };

  const previousCard = () => {
    setCurrentCardIndex((prev) => (prev - 1 + filteredFlashcards.length) % filteredFlashcards.length);
    setIsFlipped(false);
  };

  const markAnswer = async (correct: boolean) => {
    if (!currentCard) return;

    // Update in database
    await updateFlashcardStats(currentCard.id, correct);

    // Move to next card
    nextCard();
  };

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200";
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getDeckInfo = (deckId: string | null) => {
    if (!deckId) return null;
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return { name: "Unknown Deck", isSubdeck: false };
    
    const isSubdeck = !!deck.parentDeckId;
    const parentDeck = isSubdeck ? decks.find(d => d.id === deck.parentDeckId) : null;
    
    return {
      name: deck.name,
      isSubdeck,
      parentName: parentDeck?.name
    };
  };

  if (hasError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-primary" />
            Flashcards
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Something went wrong loading flashcards</p>
          <Button onClick={() => {
            setHasError(false);
            loadFlashcards();
          }}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (flashcards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-primary" />
            Flashcards
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No flashcards yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first flashcard to start studying
          </p>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg">
                <Plus className="h-4 w-4 mr-2" />
                Create Flashcard
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Flashcard</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="front">Front (Question/Term)</Label>
                  <Textarea
                    id="front"
                    placeholder="Enter the question or term..."
                    value={newCard.front}
                    onChange={(e) => setNewCard(prev => ({ ...prev, front: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="back">Back (Answer/Definition)</Label>
                  <Textarea
                    id="back"
                    placeholder="Enter the answer or definition..."
                    value={newCard.back}
                    onChange={(e) => setNewCard(prev => ({ ...prev, back: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="deck">Deck (Class)</Label>
                  <select 
                    value={newCard.deckId} 
                    onChange={(e) => {
                      console.log(' Deck selected:', e.target.value);
                      setNewCard(prev => ({ ...prev, deckId: e.target.value, subdeckId: "" }));
                    }}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select a deck (class)</option>
                    {decks.filter(deck => !deck.parentDeckId).map(deck => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </div>
                {newCard.deckId && (
                  <div>
                    <Label htmlFor="subdeck">Subdeck (Topic/Assignment)</Label>
                    <select 
                      value={newCard.subdeckId} 
                      onChange={(e) => {
                        console.log(' Subdeck selected:', e.target.value);
                        setNewCard(prev => ({ ...prev, subdeckId: e.target.value }));
                      }}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">No subdeck</option>
                      {decks.filter(deck => deck.parentDeckId === newCard.deckId).map(deck => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createFlashcard} className="gradient-bg">
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="study">Study</TabsTrigger>
            <TabsTrigger value="manage">Manage Cards</TabsTrigger>
            <TabsTrigger value="ai">AI Flashcards</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={loadFlashcards}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-bg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Flashcard</DialogTitle>
                </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="front">Front (Question/Term)</Label>
                  <Textarea
                    id="front"
                    placeholder="Enter the question or term..."
                    value={newCard.front}
                    onChange={(e) => setNewCard(prev => ({ ...prev, front: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="back">Back (Answer/Definition)</Label>
                  <Textarea
                    id="back"
                    placeholder="Enter the answer or definition..."
                    value={newCard.back}
                    onChange={(e) => setNewCard(prev => ({ ...prev, back: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="deck">Deck (Class)</Label>
                  <select 
                    value={newCard.deckId} 
                    onChange={(e) => {
                      console.log(' Deck selected:', e.target.value);
                      setNewCard(prev => ({ ...prev, deckId: e.target.value, subdeckId: "" }));
                    }}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select a deck (class)</option>
                    {decks.filter(deck => !deck.parentDeckId).map(deck => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </div>
                {newCard.deckId && (
                  <div>
                    <Label htmlFor="subdeck">Subdeck (Topic/Assignment)</Label>
                    <select 
                      value={newCard.subdeckId} 
                      onChange={(e) => {
                        console.log(' Subdeck selected:', e.target.value);
                        setNewCard(prev => ({ ...prev, subdeckId: e.target.value }));
                      }}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">No subdeck</option>
                      {decks.filter(deck => deck.parentDeckId === newCard.deckId).map(deck => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createFlashcard} className="gradient-bg">
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <TabsContent value="study">
          <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'max-w-4xl mx-auto'}`}>
            {isFullscreen && (
              <div className="absolute top-4 right-4 z-10">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFullscreen(false)}
                >
                  <Minimize className="h-4 w-4" />
                </Button>
              </div>
            )}
            {filteredFlashcards.length === 0 ? (
              <Card className="min-h-96">
                <CardContent className="p-8 h-full flex flex-col items-center justify-center text-center">
                  <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {studyDeckId ? "No cards in this deck" : "No flashcards available"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {studyDeckId 
                      ? "This deck doesn't have any flashcards yet. Create some cards to start studying."
                      : "Create your first flashcard to start studying"
                    }
                  </p>
                  {studyDeckId && (
                    <Button 
                      variant="outline" 
                      onClick={clearStudyFilter}
                      className="mb-4"
                    >
                      Study All Cards
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {studyDeckId && (
                  <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          Studying: {getDeckInfo(studyDeckId)?.name || "Unknown Deck"}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearStudyFilter}
                      >
                        Study All Cards
                      </Button>
                    </div>
                  </div>
                )}
                <Card className={`${isFullscreen ? 'h-screen' : 'min-h-96'}`}>
                  <CardContent className="p-8 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(currentCard?.difficulty || "medium")}>
                        {currentCard?.difficulty || "medium"}
                      </Badge>
                        {currentCard?.deckId && (() => {
                          const deckInfo = getDeckInfo(currentCard.deckId);
                          if (!deckInfo) return null;
                          return (
                            <Badge variant="outline" className="text-xs">
                              {deckInfo.isSubdeck 
                                ? `${deckInfo.parentName} → ${deckInfo.name}`
                                : deckInfo.name
                              }
                            </Badge>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground">
                          Card {currentCardIndex + 1} of {filteredFlashcards.length}
                        </div>
                        {!isFullscreen && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsFullscreen(true)}
                          >
                            <Maximize className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-lg">
                      <div className="min-h-32 flex items-center justify-center">
                        <p className="text-lg leading-relaxed">
                          {isFlipped ? currentCard.back : currentCard.front}
                        </p>
                      </div>
                      
                      <Button
                        onClick={() => setIsFlipped(!isFlipped)}
                        variant="outline"
                        className="w-full"
                      >
                        {isFlipped ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Show Question
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Show Answer
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Answer Feedback (only show when flipped) */}
                    {isFlipped && (
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => markAnswer(false)}
                          variant="outline"
                          className="flex-1 text-red-600 border-red-200"
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          Incorrect
                        </Button>
                        <Button
                          onClick={() => markAnswer(true)}
                          variant="outline"
                          className="flex-1 text-green-600 border-green-200"
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Correct
                        </Button>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="flex space-x-2">
                      <Button
                        onClick={previousCard}
                        variant="outline"
                        className="flex-1"
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={nextCard}
                        variant="outline"
                        className="flex-1"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <div className="space-y-6">
            {/* Deck Manager with Error Boundary */}
            <ErrorBoundary>
              <DeckManager onStudyDeck={startStudyingDeck} />
            </ErrorBoundary>
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="space-y-6">
            {/* AI Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="h-5 w-5 mr-2 text-primary" />
                  Generate Flashcards with AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Input Source</Label>
                  <Select value={aiInputType} onValueChange={(value: "text" | "note" | "file" | "document") => setAiInputType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Text Input
                        </div>
                      </SelectItem>
                      <SelectItem value="note">
                        <div className="flex items-center">
                          <StickyNote className="h-4 w-4 mr-2" />
                          From Notes
                        </div>
                      </SelectItem>
                      <SelectItem value="document">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Upload Document (PDF/PPTX/XLSX)
                        </div>
                      </SelectItem>
                      <SelectItem value="file">
                        <div className="flex items-center">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload .txt File
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Text Input */}
                {aiInputType === "text" && (
                  <div>
                    <Label htmlFor="ai-text">Content to Generate Flashcards From</Label>
                    <Textarea
                      id="ai-text"
                      placeholder="Paste your study material, lecture notes, or any text content here..."
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      className="min-h-32"
                    />
                  </div>
                )}

                {/* Note Selection */}
                {aiInputType === "note" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Select a Note</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadNotes}
                        className="text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Refresh
                      </Button>
                    </div>
                    {notes.length === 0 ? (
                      <div className="p-4 border border-dashed rounded-lg text-center">
                        <StickyNote className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">No notes found</p>
                        <p className="text-xs text-muted-foreground">Create some notes first to generate flashcards from them</p>
                      </div>
                    ) : (
                      <>
                        <Select value={selectedNoteId} onValueChange={setSelectedNoteId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a note to generate flashcards from" />
                          </SelectTrigger>
                          <SelectContent>
                            {notes.map((note) => (
                              <SelectItem key={note.id} value={note.id}>
                                <div className="flex items-center">
                                  <StickyNote className="h-4 w-4 mr-2" />
                                  {note.title || "Untitled Note"}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedNoteId && (
                          <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              {stripHtmlTags(notes.find(n => n.id === selectedNoteId)?.content || "").substring(0, 200)}...
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Document Upload */}
                {aiInputType === "document" && (
                  <div>
                    <Label htmlFor="document-upload">Upload Document</Label>
                    <div className="mt-2 space-y-3">
                      <Input
                        id="document-upload"
                        type="file"
                        accept=".pdf,.pptx,.xlsx"
                        onChange={handleDocumentUpload}
                        disabled={isProcessingDocument}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground"
                      />
                      {uploadedDocument && (
                        <div className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">{uploadedDocument.fileName}</span>
                            </div>
                            {uploadedDocument.status === "processing" && (
                              <Badge variant="outline" className="animate-pulse">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Processing
                              </Badge>
                            )}
                            {uploadedDocument.status === "ready" && (
                              <Badge className="bg-green-500">
                                Ready
                              </Badge>
                            )}
                            {uploadedDocument.status === "error" && (
                              <Badge variant="destructive">
                                Error
                              </Badge>
                            )}
                          </div>
                          {uploadedDocument.status === "processing" && (
                            <p className="text-xs text-muted-foreground">
                              Please wait while we extract content from your document...
                            </p>
                          )}
                          {uploadedDocument.status === "ready" && (
                            <p className="text-xs text-muted-foreground">
                              ✓ Document processed! Ready to generate flashcards.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* File Upload */}
                {aiInputType === "file" && (
                  <div>
                    <Label htmlFor="file-upload">Upload .txt File</Label>
                    <div className="mt-2">
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".txt"
                        onChange={handleFileUpload}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground"
                      />
                      {uploadedFile && (
                        <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Selected: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={generateFlashcards}
                  disabled={
                    isGenerating || 
                    isProcessingDocument ||
                    (!aiInputText.trim() && !selectedNoteId && !uploadedFile && !documentContent)
                  }
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : isProcessingDocument ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing Document...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Flashcards
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Cards Preview */}
            {generatedCards.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Generated Flashcards ({generatedCards.length})</span>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setGeneratedCards([])}
                      >
                        Clear
                      </Button>
                      <Button
                        onClick={saveGeneratedFlashcards}
                        className="gradient-bg"
                      >
                        Save All
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {generatedCards.map((card, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge className={getDifficultyColor(card.difficulty)}>
                            {card.difficulty}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Card {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm text-muted-foreground">Question:</p>
                          <p className="text-sm">{card.front}</p>
                        </div>
                        <div>
                          <p className="font-medium text-sm text-muted-foreground">Answer:</p>
                          <p className="text-sm">{card.back}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Flashcards;
