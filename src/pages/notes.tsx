import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import NoteEditor from "@/components/NoteEditor";
import { 
  StickyNote,
  Plus, 
  Search, 
  Pin, 
  Edit3, 
  Trash2, 
  BookOpen,
  MoreHorizontal,
  Grid3X3,
  List,
  FileText,
  Clock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Note, InsertNote, Class } from "../../shared/schema";
import { useAuth } from "@/contexts/AuthContext";

const noteCategories = [
  "general",
  "lecture", 
  "homework",
  "study",
  "meeting",
  "ideas",
  "research",
  "project"
];

export default function NotesPage() {
  const { user, loading } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Only load data when user is authenticated and not loading
    if (!loading && user) {
      console.log(' User authenticated, loading notes and classes...');
      loadNotes();
      loadClasses();
    } else if (!loading && !user) {
      console.warn(' User not authenticated, cannot load notes');
    }
  }, [loading, user]);

  const loadNotes = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      console.log(' Loading notes...');
      const response = await apiGet("/api/notes");
      console.log(' Load notes response status:', response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log(' Loaded notes data:', data.length, 'notes');
        setNotes(Array.isArray(data) ? data : []);
        console.log(' Loaded notes:', data.length);
      } else {
        throw new Error(`Failed to fetch notes: ${response.status}`);
      }
    } catch (error) {
      console.error(' Load notes error:', error);
      toast({
        title: "Error",
        description: `Failed to load notes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      setNotes([]);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const loadClasses = async () => {
    try {
      const response = await apiGet("/api/classes");
      if (response.ok) {
        const data = await response.json();
        setClasses(Array.isArray(data) ? data : []);
      } else {
        // ignore error toast for classes
      }
    } catch {
      setClasses([]);
    }
  };

  const handleSaveNote = async (noteData: Partial<InsertNote>) => {
    try {
      console.log(' Saving note:', noteData);
      const response = editingNote?.id 
        ? await apiPut(`/api/notes/${editingNote.id}`, noteData)
        : await apiPost("/api/notes", noteData);
      
      console.log(' Save response status:', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const savedNote = await response.json();
      console.log(' Saved note:', savedNote);
      
      // Force refresh the notes list to ensure we have the latest data
      console.log(' Refreshing notes list...');
      await loadNotes(false);
      console.log(' Notes list refreshed');
      
      toast({
        title: "Success",
        description: `Note ${editingNote?.id ? "updated" : "created"} successfully`,
      });
      return savedNote;
    } catch (error) {
      console.error(' Save error:', error);
      toast({
        title: "Error",
        description: `Failed to save note: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this note? This action cannot be undone."
    );
    if (!confirmed) return;
    try {
      const response = await apiDelete(`/api/notes/${noteId}`);
      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId));
        toast({
          title: "Note Deleted",
          description: "Your note has been permanently deleted.",
        });
      } else {
        throw new Error("Failed to delete note");
      }
    } catch {
      toast({
        title: "Delete Failed",
        description: "Could not delete the note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const response = await apiPut(`/api/notes/${note.id}`, { 
        ...note, 
        isPinned: !note.isPinned,
        classId: note.classId || undefined 
      });
      if (response.ok) {
        const updatedNote = await response.json();
        setNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n));
      }
    } catch {
      // ignore error
    }
  };

  const openEditor = (note?: Note) => {
    setEditingNote(note || null);
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingNote(null);
  };

  const stripHtmlTags = (html: string) => {
    return html.replace(/<[^>]+>/g, "");
  };

  const getClassName = (classId: string | null) => {
    if (!classId) return null;
    return classes.find(c => c.id === classId)?.name;
  };

  const filteredNotes = useMemo(
    () =>
      notes.filter((note) => {
        const matchesSearch =
          note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (note.tags && note.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())));
        const matchesCategory = selectedCategory === "all" || note.category === selectedCategory;
        const matchesClass = selectedClass === "all" || note.classId === selectedClass;
        return matchesSearch && matchesCategory && matchesClass;
      }),
    [notes, searchTerm, selectedCategory, selectedClass]
  );
  const pinnedNotes = useMemo(() => filteredNotes.filter(note => note.isPinned), [filteredNotes]);
  const regularNotes = useMemo(() => filteredNotes.filter(note => !note.isPinned), [filteredNotes]);

  if (showEditor) {
    return (
      <NoteEditor
        note={editingNote || undefined}
        onSave={handleSaveNote}
        onClose={closeEditor}
        classes={classes}
      />
    );
  }

  const NoteCard = ({ note }: { note: Note }) => (
    <Card 
      className="group border border-border/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 cursor-pointer relative bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm hover:from-card/80 hover:to-card/60 hover:scale-[1.02] overflow-hidden"
      onClick={() => openEditor(note)}
    >
      {/* Header with better spacing and visual hierarchy */}
      <CardHeader className="pb-3 px-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            {/* Title with pin indicator */}
            <div className="flex items-start gap-2">
              {note.isPinned && (
                <div className="flex-shrink-0 mt-1">
                  <Pin className="h-4 w-4 text-amber-500 fill-amber-500" />
                </div>
              )}
              <h3 className="font-bold text-foreground text-xl leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-200">
                {note.title || "Untitled Note"}
              </h3>
            </div>
            
            {/* Category and class badges with better styling */}
            <div className="flex items-center flex-wrap gap-2">
              {note.category && (
                <Badge 
                  variant="secondary" 
                  className="text-xs font-semibold px-3 py-1.5 bg-gradient-to-r from-primary/15 to-primary/10 text-primary border border-primary/20 rounded-full shadow-sm"
                >
                  {note.category}
                </Badge>
              )}
              {getClassName(note.classId) && (
                <Badge 
                  variant="outline" 
                  className="text-xs font-medium px-3 py-1.5 border-border/60 bg-muted/30 text-muted-foreground rounded-full hover:bg-muted/50 transition-colors"
                >
                  <BookOpen className="h-3 w-3 mr-1.5 flex-shrink-0" />
                  {getClassName(note.classId)}
                </Badge>
              )}
            </div>
          </div>         
          
          {/* Action menu with better visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-accent/60 text-muted-foreground hover:text-foreground h-9 w-9 p-0 rounded-full"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover/95 backdrop-blur-sm border-border/50 shadow-xl" align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  openEditor(note);
                }}
                className="hover:bg-accent/50 focus:bg-accent/50 cursor-pointer"
              >
                <Edit3 className="h-4 w-4 mr-3" />
                Edit Note
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePin(note);
                }}
                className="hover:bg-accent/50 focus:bg-accent/50 cursor-pointer"
              >
                <Pin className="h-4 w-4 mr-3" />
                {note.isPinned ? "Unpin Note" : "Pin Note"}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNote(note.id);
                }}
                className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-3" />
                Delete Note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      {/* Content with better spacing and typography */}
      <CardContent className="px-6 pb-6 pt-0">
        <div className="space-y-4">
          {/* Content preview with better styling */}
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed font-medium">
            {stripHtmlTags(note.content) || "No content available..."}
          </p>
          
          {/* Metadata section with improved visual design */}
          <div className="pt-4 border-t border-border/40">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {stripHtmlTags(note.content).split(' ').filter(word => word.length > 0).length} words
                  </span>
                </div>
              </div>
              <div className="font-semibold text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
                {new Date(note.updatedAt || note.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication required message if user is not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <StickyNote className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to access your notes.</p>
          <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8 px-6">
        {/* Gentle Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Your Notes
          </h1>
          <p className="text-sm text-muted-foreground">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} saved
          </p>
        </div>

        {/* Simple Actions */}
        <div className="flex gap-3 mb-6">
          <Button 
            onClick={() => openEditor()} 
            size="sm"
            className="text-sm"
          >
            <Plus className="mr-1 h-3 w-3" />
            New Note
          </Button>
        </div>
        {/* Notes Content */}
        <>
          {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 p-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes, content"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 bg-background border-border text-foreground placeholder:text-muted-foreground h-12 text-base rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-muted/50 rounded-xl border border-border/50 p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`h-10 w-10 p-0 rounded-lg transition-all duration-200 ${
                      viewMode === "grid" 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "hover:bg-background/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={`h-10 w-10 p-0 rounded-lg transition-all duration-200 ${
                      viewMode === "list" 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "hover:bg-background/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            {/* Notes Content */}
            {isLoading ? (
              <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="border border-border/40 bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="pb-3 px-6 pt-6">
                      <div className="space-y-4">
                        <div className="h-6 bg-muted/50 rounded-lg animate-pulse"></div>
                        <div className="flex gap-2">
                          <div className="h-6 w-20 bg-muted/50 rounded-full animate-pulse"></div>
                          <div className="h-6 w-24 bg-muted/50 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="h-3 bg-muted/50 rounded animate-pulse"></div>
                          <div className="h-3 bg-muted/50 rounded animate-pulse"></div>
                          <div className="h-3 w-3/4 bg-muted/50 rounded animate-pulse"></div>
                        </div>
                        <div className="pt-4 border-t border-border/40">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-4">
                              <div className="h-6 w-20 bg-muted/50 rounded-md animate-pulse"></div>
                              <div className="h-6 w-16 bg-muted/50 rounded-md animate-pulse"></div>
                            </div>
                            <div className="h-6 w-12 bg-muted/50 rounded-md animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <div className="p-6 rounded-3xl bg-primary/5 mb-6">
                  <StickyNote className="h-16 w-16 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-foreground">
                  {searchTerm || selectedCategory !== "all" || selectedClass !== "all" 
                    ? "No notes found" 
                    : "Ready to capture your first note?"
                  }
                </h3>
                <p className="text-muted-foreground text-lg mb-8 text-center max-w-md">
                  {searchTerm || selectedCategory !== "all" || selectedClass !== "all"
                    ? "Try adjusting your search terms or filters to find what you're looking for."
                    : "Start organizing your thoughts, ideas, and knowledge in one beautiful place."
                  }
                </p>
                <Button 
                  onClick={() => openEditor()} 
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Note
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Pinned Notes */}
                {pinnedNotes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Pin className="h-5 w-5 text-amber-600" />
                      </div>
                      <h2 className="text-xl font-semibold text-foreground">
                        Pinned Notes
                      </h2>
                      <div className="flex-1 h-px bg-border/50"></div>
                    </div>
                    <div className={`grid gap-8 ${
                      viewMode === "grid" 
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3" 
                        : "grid-cols-1 max-w-4xl"
                    }`}>
                      {pinnedNotes.map((note) => (
                        <NoteCard key={note.id} note={note} />
                      ))}
                    </div>
                  </div>
                )}
                {/* Regular Notes */}
                {regularNotes.length > 0 && (
                  <div>
                    {pinnedNotes.length > 0 && (
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground">
                          All Notes
                        </h2>
                        <div className="flex-1 h-px bg-border/50"></div>
                      </div>
                    )}
                    <div className={`grid gap-8 ${
                      viewMode === "grid" 
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3" 
                        : "grid-cols-1 max-w-4xl"
                    }`}>
                      {regularNotes.map((note) => (
                        <NoteCard key={note.id} note={note} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
      </div>
    </div>
  );
}
