// localStorage fallback storage for when Oracle database is not available
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type {
  User,
  InsertUser,
  Class,
  InsertClass,
  Assignment,
  InsertAssignment,
  Flashcard,
  InsertFlashcard,
  FlashcardDeck,
  InsertFlashcardDeck,
  FlashcardReview,
  InsertFlashcardReview,
  MoodEntry,
  InsertMoodEntry,
  JournalEntry,
  InsertJournalEntry,
  PomodoroSession,
  InsertPomodoroSession,
  AiSummary,
  InsertAiSummary,
  Note,
  InsertNote
} from "@shared/schema";

export class LocalStorageFallback {
  private initialized = false;

  async initialize() {
    this.initialized = true;
    console.log(' LocalStorage fallback storage initialized');
  }

  private getStorageDir(): string {
    const storageDir = path.resolve(process.cwd(), 'localStorage_data');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    return storageDir;
  }

  private getStoragePath(userId: string, type: string): string {
    const storageDir = this.getStorageDir();
    return path.join(storageDir, `${type}_${userId}.json`);
  }

  private getFromStorage<T>(userId: string, type: string): T[] {
    try {
      const filePath = this.getStoragePath(userId, type);
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error loading ${type} from file storage:`, error);
      return [];
    }
  }

  private saveToStorage<T>(userId: string, type: string, data: T[]): void {
    try {
      const filePath = this.getStoragePath(userId, type);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving ${type} to file storage:`, error);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const users = this.getFromStorage<User>('system', 'users');
    return users.find(user => user.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = this.getFromStorage<User>('system', 'users');
    return users.find(user => user.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: randomUUID(),
      name: user.name,
      email: user.email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      avatar: user.avatar || null,
      googleId: user.googleId || null,
      googleAccessToken: user.googleAccessToken || null,
      googleRefreshToken: user.googleRefreshToken || null,
      preferences: user.preferences || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const users = this.getFromStorage<User>('system', 'users');
    users.push(newUser);
    this.saveToStorage('system', 'users', users);
    
    return newUser;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const users = this.getFromStorage<User>('system', 'users');
    const userIndex = users.findIndex(user => user.id === id);
    
    if (userIndex === -1) return undefined;
    
    users[userIndex] = {
      ...users[userIndex],
      ...userData,
      updatedAt: new Date()
    };
    
    this.saveToStorage('system', 'users', users);
    return users[userIndex];
  }

  // Notes methods
  async getNotesByUserId(userId: string): Promise<Note[]> {
    return this.getFromStorage<Note>(userId, 'notes');
  }

  async getNote(id: string): Promise<Note | undefined> {
    // This is inefficient but works for fallback
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const notes = this.getFromStorage<Note>(user.id, 'notes');
      const note = notes.find(n => n.id === id);
      if (note) return note;
    }
    return undefined;
  }

  async createNote(note: InsertNote): Promise<Note> {
    const newNote: Note = {
      id: randomUUID(),
      userId: note.userId,
      classId: note.classId || null,
      title: note.title,
      content: note.content,
      category: note.category || null,
      tags: note.tags || null,
      isPinned: note.isPinned || false,
      color: note.color || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const notes = this.getFromStorage<Note>(note.userId, 'notes');
    notes.push(newNote);
    this.saveToStorage(note.userId, 'notes', notes);
    
    return newNote;
  }

  async updateNote(id: string, noteData: Partial<InsertNote>): Promise<Note | undefined> {
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const notes = this.getFromStorage<Note>(user.id, 'notes');
      const noteIndex = notes.findIndex(n => n.id === id);
      
      if (noteIndex !== -1) {
        notes[noteIndex] = {
          ...notes[noteIndex],
          ...noteData,
          updatedAt: new Date()
        };
        this.saveToStorage(user.id, 'notes', notes);
        return notes[noteIndex];
      }
    }
    return undefined;
  }

  async deleteNote(id: string): Promise<boolean> {
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const notes = this.getFromStorage<Note>(user.id, 'notes');
      const noteIndex = notes.findIndex(n => n.id === id);
      
      if (noteIndex !== -1) {
        notes.splice(noteIndex, 1);
        this.saveToStorage(user.id, 'notes', notes);
        return true;
      }
    }
    return false;
  }

  // Flashcard methods
  async getFlashcardsByUserId(userId: string): Promise<Flashcard[]> {
    return this.getFromStorage<Flashcard>(userId, 'flashcards');
  }

  async getFlashcard(id: string): Promise<Flashcard | undefined> {
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const flashcards = this.getFromStorage<Flashcard>(user.id, 'flashcards');
      const flashcard = flashcards.find(f => f.id === id);
      if (flashcard) return flashcard;
    }
    return undefined;
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const now = new Date();
    const newFlashcard: Flashcard = {
      id: randomUUID(),
      userId: flashcard.userId,
      classId: flashcard.classId || null,
      deckId: flashcard.deckId || null,
      cardType: flashcard.cardType || 'basic',
      front: flashcard.front,
      back: flashcard.back,
      clozeText: flashcard.clozeText || null,
      clozeIndex: flashcard.clozeIndex || null,
      difficulty: flashcard.difficulty || 'medium',
      lastReviewed: flashcard.lastReviewed || null,
      reviewCount: flashcard.reviewCount || 0,
      correctCount: flashcard.correctCount || 0,
      incorrectCount: flashcard.incorrectCount || 0,
      easeFactor: flashcard.easeFactor || 250,
      interval: flashcard.interval || 0,
      maturityLevel: flashcard.maturityLevel || 'new',
      createdAt: now,
      updatedAt: now
    };
    
    const flashcards = this.getFromStorage<Flashcard>(flashcard.userId, 'flashcards');
    flashcards.push(newFlashcard);
    this.saveToStorage(flashcard.userId, 'flashcards', flashcards);
    
    return newFlashcard;
  }

  async updateFlashcard(id: string, flashcardData: Partial<InsertFlashcard>): Promise<Flashcard | undefined> {
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const flashcards = this.getFromStorage<Flashcard>(user.id, 'flashcards');
      const flashcardIndex = flashcards.findIndex(f => f.id === id);
      
      if (flashcardIndex !== -1) {
        flashcards[flashcardIndex] = {
          ...flashcards[flashcardIndex],
          ...flashcardData
        };
        this.saveToStorage(user.id, 'flashcards', flashcards);
        return flashcards[flashcardIndex];
      }
    }
    return undefined;
  }

  async deleteFlashcard(id: string): Promise<boolean> {
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const flashcards = this.getFromStorage<Flashcard>(user.id, 'flashcards');
      const flashcardIndex = flashcards.findIndex(f => f.id === id);
      
      if (flashcardIndex !== -1) {
        flashcards.splice(flashcardIndex, 1);
        this.saveToStorage(user.id, 'flashcards', flashcards);
        return true;
      }
    }
    return false;
  }

  // Flashcard Deck methods (stub implementations for fallback)
  async getDecksByUserId(userId: string): Promise<FlashcardDeck[]> {
    console.warn(' Deck management requires Oracle database');
    return [];
  }

  async createDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck> {
    console.warn(' Deck management requires Oracle database');
    throw new Error('Deck management requires Oracle database');
  }

  async updateDeck(id: string, deck: Partial<InsertFlashcardDeck>): Promise<FlashcardDeck | undefined> {
    console.warn(' Deck management requires Oracle database');
    return undefined;
  }

  async deleteDeck(id: string): Promise<boolean> {
    console.warn(' Deck management requires Oracle database');
    return false;
  }

  async getFlashcardsByDeck(deckId: string): Promise<Flashcard[]> {
    console.warn(' Deck management requires Oracle database');
    return [];
  }

  // Flashcard Review methods (stub implementations for fallback)
  async recordReview(review: InsertFlashcardReview): Promise<FlashcardReview> {
    console.warn(' Review tracking requires Oracle database');
    throw new Error('Review tracking requires Oracle database');
  }

  async getDailyStats(userId: string, days: number = 30): Promise<any[]> {
    console.warn(' Statistics require Oracle database');
    return [];
  }

  async getDeckStats(userId: string): Promise<any[]> {
    console.warn(' Statistics require Oracle database');
    return [];
  }

  async getRetentionCurve(userId: string, deckId?: string): Promise<any[]> {
    console.warn(' Statistics require Oracle database');
    return [];
  }

  // AI Summary methods
  async getAiSummariesByUserId(userId: string): Promise<AiSummary[]> {
    return this.getFromStorage<AiSummary>(userId, 'ai_summaries');
  }

  async getAiSummary(id: string): Promise<AiSummary | undefined> {
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const summaries = this.getFromStorage<AiSummary>(user.id, 'ai_summaries');
      const summary = summaries.find(s => s.id === id);
      if (summary) return summary;
    }
    return undefined;
  }

  async createAiSummary(summary: InsertAiSummary): Promise<AiSummary> {
    const newSummary: AiSummary = {
      id: randomUUID(),
      userId: summary.userId,
      title: summary.title,
      summary: summary.summary,
      summaryType: summary.summaryType || null,
      originalContent: summary.originalContent || null,
      fileType: summary.fileType || null,
      createdAt: new Date()
    };
    
    const summaries = this.getFromStorage<AiSummary>(summary.userId, 'ai_summaries');
    summaries.push(newSummary);
    this.saveToStorage(summary.userId, 'ai_summaries', summaries);
    
    return newSummary;
  }

  // Mood Entry methods
  async getMoodEntriesByUserId(userId: string): Promise<MoodEntry[]> {
    return this.getFromStorage<MoodEntry>(userId, 'mood_entries');
  }

  async createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry> {
    const newEntry: MoodEntry = {
      id: randomUUID(),
      userId: entry.userId,
      mood: entry.mood,
      notes: entry.notes || null,
      date: entry.date || null,
      createdAt: new Date()
    };
    
    const entries = this.getFromStorage<MoodEntry>(entry.userId, 'mood_entries');
    entries.push(newEntry);
    this.saveToStorage(entry.userId, 'mood_entries', entries);
    
    return newEntry;
  }

  // Journal Entry methods
  async getJournalEntriesByUserId(userId: string): Promise<JournalEntry[]> {
    return this.getFromStorage<JournalEntry>(userId, 'journal_entries');
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const newEntry: JournalEntry = {
      id: randomUUID(),
      userId: entry.userId,
      content: entry.content,
      date: entry.date || null,
      createdAt: new Date()
    };
    
    const entries = this.getFromStorage<JournalEntry>(entry.userId, 'journal_entries');
    entries.push(newEntry);
    this.saveToStorage(entry.userId, 'journal_entries', entries);
    
    return newEntry;
  }

  // Pomodoro Session methods
  async getPomodoroSessionsByUserId(userId: string): Promise<PomodoroSession[]> {
    return this.getFromStorage<PomodoroSession>(userId, 'pomodoro_sessions');
  }

  async createPomodoroSession(session: InsertPomodoroSession): Promise<PomodoroSession> {
    const newSession: PomodoroSession = {
      id: randomUUID(),
      userId: session.userId,
      type: session.type || null,
      duration: session.duration,
      completedAt: session.completedAt || null
    };
    
    const sessions = this.getFromStorage<PomodoroSession>(session.userId, 'pomodoro_sessions');
    sessions.push(newSession);
    this.saveToStorage(session.userId, 'pomodoro_sessions', sessions);
    
    return newSession;
  }

  // Class methods
  async getClassesByUserId(userId: string): Promise<Class[]> {
    return this.getFromStorage<Class>(userId, 'classes');
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const newClass: Class = {
      id: randomUUID(),
      userId: classData.userId,
      googleClassroomId: classData.googleClassroomId || null,
      name: classData.name,
      section: classData.section || null,
      description: classData.description || null,
      teacherName: classData.teacherName || null,
      teacherEmail: classData.teacherEmail || null,
      color: classData.color || null,
      source: classData.source || null,
      syncStatus: classData.syncStatus || null,
      createdAt: new Date()
    };
    
    const classes = this.getFromStorage<Class>(classData.userId, 'classes');
    classes.push(newClass);
    this.saveToStorage(classData.userId, 'classes', classes);
    
    return newClass;
  }

  async updateClass(id: string, classData: Partial<InsertClass>): Promise<Class | undefined> {
    // Find the class by ID across all users
    for (const key of Object.keys(localStorage)) {
      if (key.endsWith('_classes')) {
        const userId = key.replace('_classes', '');
        const classes = this.getFromStorage<Class>(userId, 'classes');
        const classIndex = classes.findIndex(c => c.id === id);
        
        if (classIndex !== -1) {
          // Update the class
          classes[classIndex] = {
            ...classes[classIndex],
            ...classData
          };
          this.saveToStorage(userId, 'classes', classes);
          return classes[classIndex];
        }
      }
    }
    return undefined;
  }

  // Assignment methods
  async getAssignmentsByUserId(userId: string): Promise<Assignment[]> {
    return this.getFromStorage<Assignment>(userId, 'assignments');
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const newAssignment: Assignment = {
      id: randomUUID(),
      userId: assignment.userId,
      classId: assignment.classId || null,
      googleClassroomId: assignment.googleClassroomId || null,
      googleCalendarId: assignment.googleCalendarId || null,
      title: assignment.title,
      description: assignment.description || null,
      dueDate: assignment.dueDate || null,
      status: assignment.status || null,
      priority: assignment.priority || null,
      isCustom: assignment.isCustom || null,
      source: assignment.source || null,
      syncStatus: assignment.syncStatus || null,
      completedAt: assignment.completedAt || null,
      createdAt: new Date()
    };
    
    const assignments = this.getFromStorage<Assignment>(assignment.userId, 'assignments');
    assignments.push(newAssignment);
    this.saveToStorage(assignment.userId, 'assignments', assignments);
    
    return newAssignment;
  }


  // Analytics method
  async getUserAnalytics(userId: string): Promise<any> {
    const notes = this.getFromStorage<Note>(userId, 'notes');
    const flashcards = this.getFromStorage<Flashcard>(userId, 'flashcards');
    const summaries = this.getFromStorage<AiSummary>(userId, 'ai_summaries');
    const moodEntries = this.getFromStorage<MoodEntry>(userId, 'mood_entries');
    const journalEntries = this.getFromStorage<JournalEntry>(userId, 'journal_entries');
    const pomodoroSessions = this.getFromStorage<PomodoroSession>(userId, 'pomodoro_sessions');

    return {
      totalNotes: notes.length,
      totalFlashcards: flashcards.length,
      totalAiSummaries: summaries.length,
      totalMoodEntries: moodEntries.length,
      totalJournalEntries: journalEntries.length,
      totalPomodoroSessions: pomodoroSessions.length,
      averageMood: moodEntries.length > 0 ? moodEntries.reduce((sum, entry) => sum + entry.mood, 0) / moodEntries.length : 0,
      totalStudyMinutes: pomodoroSessions.reduce((sum, session) => sum + session.duration, 0)
    };
  }

  // Missing methods for compatibility with routes
  async createUserWithId(uid: string, userData: InsertUser): Promise<User> {
    return this.createUser(userData);
  }

  async deleteClass(id: string): Promise<boolean> {
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const classes = this.getFromStorage<Class>(user.id, 'classes');
      const classIndex = classes.findIndex(c => c.id === id);
      if (classIndex !== -1) {
        classes.splice(classIndex, 1);
        this.saveToStorage(user.id, 'classes', classes);
        return true;
      }
    }
    return false;
  }

  async updateAssignment(id: string, assignmentData: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const assignments = this.getFromStorage<Assignment>(user.id, 'assignments');
      const assignmentIndex = assignments.findIndex(a => a.id === id);
      if (assignmentIndex !== -1) {
        assignments[assignmentIndex] = { ...assignments[assignmentIndex], ...assignmentData };
        this.saveToStorage(user.id, 'assignments', assignments);
        return assignments[assignmentIndex];
      }
    }
    return undefined;
  }

  async deleteAssignment(id: string): Promise<boolean> {
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const assignments = this.getFromStorage<Assignment>(user.id, 'assignments');
      const assignmentIndex = assignments.findIndex(a => a.id === id);
      if (assignmentIndex !== -1) {
        assignments.splice(assignmentIndex, 1);
        this.saveToStorage(user.id, 'assignments', assignments);
        return true;
      }
    }
    return false;
  }

  async updateJournalEntry(id: string, entryData: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const entries = this.getFromStorage<JournalEntry>(user.id, 'journal_entries');
      const entryIndex = entries.findIndex(e => e.id === id);
      if (entryIndex !== -1) {
        entries[entryIndex] = { ...entries[entryIndex], ...entryData };
        this.saveToStorage(user.id, 'journal_entries', entries);
        return entries[entryIndex];
      }
    }
    return undefined;
  }

  async deleteJournalEntry(id: string): Promise<boolean> {
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const entries = this.getFromStorage<JournalEntry>(user.id, 'journal_entries');
      const entryIndex = entries.findIndex(e => e.id === id);
      if (entryIndex !== -1) {
        entries.splice(entryIndex, 1);
        this.saveToStorage(user.id, 'journal_entries', entries);
        return true;
      }
    }
    return false;
  }

  async deleteAiSummary(id: string): Promise<boolean> {
    const users = this.getFromStorage<User>('system', 'users');
    for (const user of users) {
      const summaries = this.getFromStorage<AiSummary>(user.id, 'ai_summaries');
      const summaryIndex = summaries.findIndex(s => s.id === id);
      if (summaryIndex !== -1) {
        summaries.splice(summaryIndex, 1);
        this.saveToStorage(user.id, 'ai_summaries', summaries);
        return true;
      }
    }
    return false;
  }

  // ========== TODO BOARD STUB METHODS (Not implemented in localStorage fallback) ==========
  async getBoardsByUserId(userId: string): Promise<any[]> { return []; }
  async getBoard(id: string): Promise<any | undefined> { return undefined; }
  async createBoard(board: any): Promise<any> { throw new Error('Todo boards require Oracle database'); }
  async updateBoard(id: string, board: any): Promise<any | undefined> { return undefined; }
  async deleteBoard(id: string): Promise<boolean> { return false; }
  
  async getListsByBoardId(boardId: string): Promise<any[]> { return []; }
  async createList(list: any): Promise<any> { throw new Error('Todo boards require Oracle database'); }
  async updateList(id: string, list: any): Promise<any | undefined> { return undefined; }
  async deleteList(id: string): Promise<boolean> { return false; }
  
  async getCardsByUserId(userId: string): Promise<any[]> { return []; }
  async getCardsByListId(listId: string): Promise<any[]> { return []; }
  async getInboxCards(userId: string): Promise<any[]> { return []; }
  async getCard(id: string): Promise<any | undefined> { return undefined; }
  async createCard(card: any): Promise<any> { throw new Error('Todo boards require Oracle database'); }
  async updateCard(id: string, card: any): Promise<any | undefined> { return undefined; }
  async deleteCard(id: string): Promise<boolean> { return false; }
  
  async getChecklistsByCardId(cardId: string): Promise<any[]> { return []; }
  async createChecklist(checklist: any): Promise<any> { throw new Error('Todo boards require Oracle database'); }
  async updateChecklist(id: string, checklist: any): Promise<any | undefined> { return undefined; }
  async deleteChecklist(id: string): Promise<boolean> { return false; }
  
  async getLabelsByUserId(userId: string): Promise<any[]> { return []; }
  async createLabel(label: any): Promise<any> { throw new Error('Todo boards require Oracle database'); }
  async updateLabel(id: string, label: any): Promise<any | undefined> { return undefined; }
  async deleteLabel(id: string): Promise<boolean> { return false; }
  async addLabelToCard(cardId: string, labelId: string): Promise<void> {}
  async removeLabelFromCard(cardId: string, labelId: string): Promise<void> {}
  async getCardLabels(cardId: string): Promise<any[]> { return []; }

}
