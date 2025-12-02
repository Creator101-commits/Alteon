import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { JournalEntry, InsertJournalEntry } from "@shared/schema";
import {
  BookOpen,
  Save,
  Calendar as CalendarIcon,
  Edit,
  Trash2,
  Search,
} from "lucide-react";
import { format, isToday, startOfMonth, endOfMonth } from "date-fns";
import { Input } from "@/components/ui/input";


export const DailyJournal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const maxCharacters = 500;

  // Load journal entries from database
  const loadJournalEntries = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const response = await apiGet(`/api/users/${user.uid}/journal-entries`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
        console.log(' Loaded journal entries:', data.length);
      } else {
        console.error('Failed to load journal entries:', response.status);
        toast({
          title: "Error",
          description: "Failed to load journal entries",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
      toast({
        title: "Error",
        description: "Failed to load journal entries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load journal entries on component mount
  useEffect(() => {
    loadJournalEntries();
  }, [user?.uid]);

  const getTodayEntry = () => {
    return entries.find(entry => entry.date && isToday(entry.date));
  };

  const getEntryForDate = (date: Date) => {
    return entries.find(entry => 
      entry.date && format(entry.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const saveEntry = async () => {
    if (!user?.uid || !currentEntry.trim()) {
      toast({
        title: "Error",
        description: "Please write something before saving",
        variant: "destructive",
      });
      return;
    }

    if (currentEntry.length > maxCharacters) {
      toast({
        title: "Error",
        description: `Entry must be ${maxCharacters} characters or less`,
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingEntry) {
        // Update existing entry
        const response = await apiPut(`/api/journal-entries/${editingEntry.id}`, {
          content: currentEntry.trim(),
        });
        
        if (response.ok) {
          const updatedEntry = await response.json();
          setEntries(prev => prev.map(e => e.id === editingEntry.id ? updatedEntry : e));
        } else {
          throw new Error('Failed to update journal entry');
        }
      } else {
        // Create new entry
        const journalData = {
          content: currentEntry.trim(),
        };

        const response = await apiPost(`/api/users/${user.uid}/journal-entries`, journalData);
        
        if (response.ok) {
          const createdEntry = await response.json();
          setEntries(prev => [...prev, createdEntry]);
        } else {
          throw new Error('Failed to create journal entry');
        }
      }

      setCurrentEntry("");
      setEditingEntry(null);
      
      toast({
        title: "Entry saved! ",
        description: editingEntry ? "Your journal entry has been updated" : "Your journal entry has been saved",
      });
    } catch (error) {
      console.error('Error saving journal entry:', error);
      toast({
        title: "Error",
        description: "Failed to save journal entry",
        variant: "destructive",
      });
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const response = await apiDelete(`/api/journal-entries/${id}`);
      
      if (response.ok) {
        setEntries(prev => prev.filter(e => e.id !== id));
        
        if (editingEntry?.id === id) {
          setEditingEntry(null);
          setCurrentEntry("");
        }
        
        toast({
          title: "Entry deleted",
          description: "Journal entry has been removed",
        });
      } else {
        throw new Error('Failed to delete journal entry');
      }
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete journal entry",
        variant: "destructive",
      });
    }
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setCurrentEntry(entry.content);
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setCurrentEntry("");
  };

  const filteredEntries = entries
    .filter(entry => 
      entry.date && (
        searchTerm === "" || 
        entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        format(entry.date, "MMM d, yyyy").toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    .sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return b.date.getTime() - a.date.getTime();
    });

  const getMonthlyStats = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const monthEntries = entries.filter(entry => 
      entry.date && entry.date >= monthStart && entry.date <= monthEnd
    );

    const totalWords = monthEntries.reduce((sum, entry) => sum + entry.content.split(' ').length, 0);
    const avgWordsPerEntry = monthEntries.length > 0 ? Math.round(totalWords / monthEntries.length) : 0;

    return {
      entriesThisMonth: monthEntries.length,
      totalWords,
      avgWordsPerEntry,
      streak: getConsecutiveDays(),
    };
  };

  const getConsecutiveDays = () => {
  const sortedEntries = [...entries]
    .filter(entry => entry.date)
    .sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return b.date.getTime() - a.date.getTime();
    });
    
    let streak = 0;
    let currentDate = new Date();
    
    for (const entry of sortedEntries) {
      const entryDateStr = entry.date ? format(entry.date, "yyyy-MM-dd") : "";
      const currentDateStr = format(currentDate, "yyyy-MM-dd");
      
      if (entryDateStr === currentDateStr) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const todayEntry = getTodayEntry();
  const selectedEntry = selectedCalendarDate ? getEntryForDate(selectedCalendarDate) : null;
  const monthlyStats = getMonthlyStats();

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Writing Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-foreground" />
                  {editingEntry ? "Edit Entry" : "Today's Journal"}
                </CardTitle>
                {editingEntry && (
                  <Button variant="outline" onClick={cancelEdit}>
                    Cancel Edit
                  </Button>
                )}
              </div>
              {editingEntry && (
                <p className="text-sm text-muted-foreground">
                  Editing entry from {editingEntry.date ? format(editingEntry.date, "MMM d, yyyy") : "Unknown date"}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {todayEntry && !editingEntry && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Today's entry saved</span>
                    <Badge variant="outline">{todayEntry.content.split(' ').length} words</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {todayEntry.content}
                  </p>
                  <Button
                    variant="link"
                    className="p-0 h-auto mt-2"
                    onClick={() => startEdit(todayEntry)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit entry
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Textarea
                  placeholder={editingEntry ? "Edit your journal entry..." : "What's on your mind today? Write about your thoughts, experiences, or reflections..."}
                  value={currentEntry}
                  onChange={(e) => setCurrentEntry(e.target.value)}
                  rows={8}
                  maxLength={maxCharacters}
                />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {currentEntry.length}/{maxCharacters} characters
                  </span>
                  <span className="text-muted-foreground">
                    {currentEntry.trim() ? currentEntry.trim().split(/\s+/).length : 0} words
                  </span>
                </div>
              </div>

              <Button
                onClick={saveEntry}
                disabled={!currentEntry.trim() || currentEntry.length > maxCharacters}
                className="w-full gradient-bg"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingEntry ? "Update Entry" : (todayEntry ? "Update Today's Entry" : "Save Entry")}
              </Button>
            </CardContent>
          </Card>

          {/* Search & Entries */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Journal History</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search entries..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {filteredEntries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? (
                        <>
                          <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No entries found matching "{searchTerm}"</p>
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No journal entries yet</p>
                          <p className="text-sm">Start writing to see your entries here</p>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredEntries.map((entry) => (
                      <div key={entry.id} className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">
                              {entry.date ? format(entry.date, "MMM d, yyyy") : "Unknown date"}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {entry.content.split(' ').length} words
                            </Badge>
                            {entry.date && isToday(entry.date) && (
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 text-xs">
                                Today
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => startEdit(entry)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => deleteEntry(entry.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {entry.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entries</span>
                <span className="font-semibold">{monthlyStats.entriesThisMonth}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Words</span>
                <span className="font-semibold">{monthlyStats.totalWords}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg per Entry</span>
                <span className="font-semibold">{monthlyStats.avgWordsPerEntry}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Writing Streak</span>
                <span className="font-semibold text-primary">{monthlyStats.streak} days</span>
              </div>
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Journal Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedCalendarDate}
                onSelect={setSelectedCalendarDate}
                className="rounded-md border"
                components={{
                  Day: ({ date, displayMonth, ...props }) => {
                    const entry = getEntryForDate(date);
                    return (
                      <div className="relative">
                        <button {...props} />
                        {entry && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          </div>
                        )}
                      </div>
                    );
                  },
                }}
              />
              
              {selectedEntry && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {selectedEntry.date ? format(selectedEntry.date, "MMM d, yyyy") : "Unknown date"}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {selectedEntry.content.split(' ').length} words
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {selectedEntry.content}
                  </p>
                  <Button
                    variant="link"
                    className="p-0 h-auto mt-2 text-xs"
                    onClick={() => startEdit(selectedEntry)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Writing Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Writing Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Write regularly to build a habit</p>
                <p>• Don't worry about perfect grammar</p>
                <p>• Reflect on your day and emotions</p>
                <p>• Set goals and track your progress</p>
                <p>• Use prompts when you're stuck</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};