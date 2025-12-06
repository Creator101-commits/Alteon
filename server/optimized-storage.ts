/**
 * Optimized storage implementation with connection pooling and query optimization
 */

import {
  type User,
  type InsertUser,
  type Class,
  type InsertClass,
  type Assignment,
  type InsertAssignment,
  type Flashcard,
  type InsertFlashcard,
  type FlashcardDeck,
  type InsertFlashcardDeck,
  type FlashcardReview,
  type InsertFlashcardReview,
  type MoodEntry,
  type InsertMoodEntry,
  type JournalEntry,
  type InsertJournalEntry,
  type PomodoroSession,
  type InsertPomodoroSession,
  type AiSummary,
  type InsertAiSummary,
  type Habit,
  type InsertHabit,
  type Note,
  type InsertNote,
  type Board,
  type InsertBoard,
  type TodoList,
  type InsertTodoList,
  type Card,
  type InsertCard,
  type Checklist,
  type InsertChecklist,
  type Label,
  type InsertLabel,
  type QuickTask,
  type InsertQuickTask,
  users,
  classes,
  assignments,
  flashcards,
  moodEntries,
  journalEntries,
  pomodoroSessions,
  aiSummaries,
  notes,
  boards,
  todoLists,
  cards,
  checklists,
  labels,
  quickTasks
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { OracleStorage } from "./oracle-storage";
import { LocalStorageFallback } from "./localStorage-fallback";

// Connection pool configuration
interface PoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
};

// Query cache for frequently accessed data
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Invalidate all cache entries matching a pattern prefix
  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Batch operation manager
class BatchManager {
  private batches = new Map<string, Array<{ operation: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }>>();
  private timers = new Map<string, NodeJS.Timeout>();

  async batch<T>(
    batchKey: string,
    operation: () => Promise<T>,
    delay: number = 50
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Get or create batch
      let batch = this.batches.get(batchKey);
      if (!batch) {
        batch = [];
        this.batches.set(batchKey, batch);

        // Set timer to execute batch
        const timer = setTimeout(() => {
          this.executeBatch(batchKey);
        }, delay);
        this.timers.set(batchKey, timer);
      }

      // Add operation to batch
      batch.push({ operation, resolve, reject });
    });
  }

  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    // Clear batch and timer
    this.batches.delete(batchKey);
    const timer = this.timers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(batchKey);
    }

    // Execute all operations in parallel
    const promises = batch.map(async ({ operation, resolve, reject }) => {
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    await Promise.allSettled(promises);
  }
}

// Optimized storage implementation
export class OptimizedStorage {
  private baseStorage: OracleStorage | LocalStorageFallback;
  private queryCache: QueryCache;
  private batchManager: BatchManager;

  constructor() {
    try {
      this.baseStorage = new OracleStorage();
      console.log(' Optimized Oracle storage initialized');
    } catch (error) {
      console.error(' Failed to initialize Oracle storage:', error);
      console.log(' Falling back to localStorage storage');
      this.baseStorage = new LocalStorageFallback();
    }

    this.queryCache = new QueryCache();
    this.batchManager = new BatchManager();

    // Clean up cache periodically
    setInterval(() => {
      this.queryCache.cleanup();
    }, 60 * 1000); // Every minute
  }

  // Cache key generators
  private getUserCacheKey(id: string): string {
    return `user:${id}`;
  }

  private getClassesCacheKey(userId: string): string {
    return `classes:${userId}`;
  }

  private getAssignmentsCacheKey(userId: string): string {
    return `assignments:${userId}`;
  }

  private getNotesCacheKey(userId: string): string {
    return `notes:${userId}`;
  }

  private getFlashcardsCacheKey(userId: string): string {
    return `flashcards:${userId}`;
  }

  private getHabitsCacheKey(userId: string): string {
    return `habits:${userId}`;
  }

  // Optimized user methods
  async getUser(id: string): Promise<User | undefined> {
    const cacheKey = this.getUserCacheKey(id);
    const cached = this.queryCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const user = await this.baseStorage.getUser(id);
    if (user) {
      this.queryCache.set(cacheKey, user, 10 * 60 * 1000); // 10 minutes
    }

    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser = await this.baseStorage.createUser(user);

    // Cache the new user
    const cacheKey = this.getUserCacheKey(newUser.id);
    this.queryCache.set(cacheKey, newUser, 10 * 60 * 1000);

    return newUser;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const updatedUser = await this.baseStorage.updateUser(id, userData);

    if (updatedUser) {
      // Update cache
      const cacheKey = this.getUserCacheKey(id);
      this.queryCache.set(cacheKey, updatedUser, 10 * 60 * 1000);
    }

    return updatedUser;
  }

  // Optimized class methods with batching
  async getClassesByUserId(userId: string): Promise<Class[]> {
    const cacheKey = this.getClassesCacheKey(userId);
    const cached = this.queryCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const classes = await this.baseStorage.getClassesByUserId(userId);
    this.queryCache.set(cacheKey, classes, 5 * 60 * 1000); // 5 minutes

    return classes;
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const newClass = await this.baseStorage.createClass(classData);

    // Invalidate cache
    const cacheKey = this.getClassesCacheKey(classData.userId);
    this.queryCache.delete(cacheKey);

    return newClass;
  }

  async updateClass(id: string, classData: Partial<InsertClass>): Promise<Class | undefined> {
    const updatedClass = await this.baseStorage.updateClass(id, classData);

    if (updatedClass) {
      // Invalidate cache
      const cacheKey = this.getClassesCacheKey(updatedClass.userId);
      this.queryCache.delete(cacheKey);
    }

    return updatedClass;
  }

  // Optimized assignment methods
  async getAssignmentsByUserId(userId: string): Promise<Assignment[]> {
    const cacheKey = this.getAssignmentsCacheKey(userId);
    const cached = this.queryCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const assignments = await this.baseStorage.getAssignmentsByUserId(userId);
    this.queryCache.set(cacheKey, assignments, 3 * 60 * 1000); // 3 minutes

    return assignments;
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const newAssignment = await this.baseStorage.createAssignment(assignment);

    // Invalidate cache
    const cacheKey = this.getAssignmentsCacheKey(assignment.userId);
    this.queryCache.delete(cacheKey);

    return newAssignment;
  }

  async updateAssignment(id: string, assignmentData: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const updatedAssignment = await this.baseStorage.updateAssignment(id, assignmentData);

    if (updatedAssignment) {
      // Invalidate cache
      const cacheKey = this.getAssignmentsCacheKey(updatedAssignment.userId);
      this.queryCache.delete(cacheKey);
    }

    return updatedAssignment;
  }

  // Optimized note methods
  async getNotesByUserId(userId: string): Promise<Note[]> {
    const cacheKey = this.getNotesCacheKey(userId);
    const cached = this.queryCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const notes = await this.baseStorage.getNotesByUserId(userId);
    this.queryCache.set(cacheKey, notes, 2 * 60 * 1000); // 2 minutes

    return notes;
  }

  async createNote(note: InsertNote): Promise<Note> {
    const newNote = await this.baseStorage.createNote(note);

    // Invalidate cache
    const cacheKey = this.getNotesCacheKey(note.userId);
    this.queryCache.delete(cacheKey);

    return newNote;
  }

  async updateNote(id: string, noteData: Partial<InsertNote>): Promise<Note | undefined> {
    const updatedNote = await this.baseStorage.updateNote(id, noteData);

    if (updatedNote) {
      // Invalidate cache
      const cacheKey = this.getNotesCacheKey(updatedNote.userId);
      this.queryCache.delete(cacheKey);
    }

    return updatedNote;
  }

  // Optimized flashcard methods
  async getFlashcardsByUserId(userId: string): Promise<Flashcard[]> {
    const cacheKey = this.getFlashcardsCacheKey(userId);
    const cached = this.queryCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const flashcards = await this.baseStorage.getFlashcardsByUserId(userId);
    this.queryCache.set(cacheKey, flashcards, 5 * 60 * 1000); // 5 minutes

    return flashcards;
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const newFlashcard = await this.baseStorage.createFlashcard(flashcard);

    // Invalidate cache
    const cacheKey = this.getFlashcardsCacheKey(flashcard.userId);
    this.queryCache.delete(cacheKey);

    return newFlashcard;
  }

  // Optimized habit methods
  async getHabitsByUserId(userId: string): Promise<Habit[]> {
    const cacheKey = this.getHabitsCacheKey(userId);
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const habits = await (this.baseStorage as any).getHabitsByUserId(userId);
    this.queryCache.set(cacheKey, habits, 2 * 60 * 1000);
    return habits;
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    const created = await (this.baseStorage as any).createHabit(habit);
    const cacheKey = this.getHabitsCacheKey(habit.userId);
    this.queryCache.delete(cacheKey);
    return created;
  }

  async updateHabit(id: string, habit: Partial<InsertHabit>): Promise<Habit | undefined> {
    const updated = await (this.baseStorage as any).updateHabit(id, habit);
    if (updated) {
      const cacheKey = this.getHabitsCacheKey(updated.userId);
      this.queryCache.delete(cacheKey);
    }
    return updated;
  }

  async deleteHabit(id: string): Promise<boolean> {
    const existing = await (this.baseStorage as any).getHabit?.(id);
    const success = await (this.baseStorage as any).deleteHabit(id);
    if (success && existing) {
      const cacheKey = this.getHabitsCacheKey(existing.userId);
      this.queryCache.delete(cacheKey);
    }
    return success;
  }

  // Batch operations for multiple items
  async batchCreateAssignments(assignments: InsertAssignment[]): Promise<Assignment[]> {
    return this.batchManager.batch(
      'create_assignments',
      async () => {
        const results = await Promise.all(
          assignments.map(assignment => this.baseStorage.createAssignment(assignment))
        );

        // Invalidate caches for all affected users
        const userIds = [...new Set(assignments.map(a => a.userId))];
        userIds.forEach(userId => {
          const cacheKey = this.getAssignmentsCacheKey(userId);
          this.queryCache.delete(cacheKey);
        });

        return results;
      },
      100 // 100ms delay for batching
    );
  }

  async batchCreateNotes(notes: InsertNote[]): Promise<Note[]> {
    return this.batchManager.batch(
      'create_notes',
      async () => {
        const results = await Promise.all(
          notes.map(note => this.baseStorage.createNote(note))
        );

        // Invalidate caches for all affected users
        const userIds = [...new Set(notes.map(n => n.userId))];
        userIds.forEach(userId => {
          const cacheKey = this.getNotesCacheKey(userId);
          this.queryCache.delete(cacheKey);
        });

        return results;
      },
      100 // 100ms delay for batching
    );
  }

  // Analytics with caching
  async getUserAnalytics(userId: string): Promise<any> {
    const cacheKey = `analytics:${userId}`;
    const cached = this.queryCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const analytics = await this.baseStorage.getUserAnalytics(userId);
    this.queryCache.set(cacheKey, analytics, 15 * 60 * 1000); // 15 minutes

    return analytics;
  }

  // Cache management
  clearCache(): void {
    this.queryCache.clear();
  }

  invalidateUserCache(userId: string): void {
    this.queryCache.delete(this.getUserCacheKey(userId));
    this.queryCache.delete(this.getClassesCacheKey(userId));
    this.queryCache.delete(this.getAssignmentsCacheKey(userId));
    this.queryCache.delete(this.getNotesCacheKey(userId));
    this.queryCache.delete(this.getFlashcardsCacheKey(userId));
    this.queryCache.delete(`analytics:${userId}`);
  }

  // Delegate other methods to base storage
  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.baseStorage.getUserByEmail(email);
  }

  async deleteClass(id: string): Promise<boolean> {
    return this.baseStorage.deleteClass(id);
  }

  async deleteAssignment(id: string): Promise<boolean> {
    return this.baseStorage.deleteAssignment(id);
  }

  async updateFlashcard(id: string, flashcardData: Partial<InsertFlashcard>): Promise<Flashcard | undefined> {
    const updatedFlashcard = await this.baseStorage.updateFlashcard(id, flashcardData);

    if (updatedFlashcard) {
      // Invalidate cache
      const cacheKey = this.getFlashcardsCacheKey(updatedFlashcard.userId);
      this.queryCache.delete(cacheKey);
    }

    return updatedFlashcard;
  }

  async deleteFlashcard(id: string): Promise<boolean> {
    return this.baseStorage.deleteFlashcard(id);
  }

  async deleteNote(id: string): Promise<boolean> {
    return this.baseStorage.deleteNote(id);
  }

  async getNote(id: string): Promise<Note | undefined> {
    return this.baseStorage.getNote(id);
  }

  // Mood entry methods
  async getMoodEntriesByUserId(userId: string): Promise<MoodEntry[]> {
    return this.baseStorage.getMoodEntriesByUserId(userId);
  }

  async createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry> {
    return this.baseStorage.createMoodEntry(entry);
  }

  // Journal entry methods
  async getJournalEntriesByUserId(userId: string): Promise<JournalEntry[]> {
    return this.baseStorage.getJournalEntriesByUserId(userId);
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    return this.baseStorage.createJournalEntry(entry);
  }

  async updateJournalEntry(id: string, entryData: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    return this.baseStorage.updateJournalEntry(id, entryData);
  }

  async deleteJournalEntry(id: string): Promise<boolean> {
    return this.baseStorage.deleteJournalEntry(id);
  }

  // Pomodoro session methods
  async getPomodoroSessionsByUserId(userId: string): Promise<PomodoroSession[]> {
    return this.baseStorage.getPomodoroSessionsByUserId(userId);
  }

  async createPomodoroSession(session: InsertPomodoroSession): Promise<PomodoroSession> {
    return this.baseStorage.createPomodoroSession(session);
  }

  // AI summary methods
  async getAiSummariesByUserId(userId: string): Promise<AiSummary[]> {
    return this.baseStorage.getAiSummariesByUserId(userId);
  }

  async createAiSummary(summary: InsertAiSummary): Promise<AiSummary> {
    return this.baseStorage.createAiSummary(summary);
  }

  async deleteAiSummary(id: string): Promise<boolean> {
    return this.baseStorage.deleteAiSummary(id);
  }

  // Flashcard deck methods
  async getDecksByUserId(userId: string): Promise<FlashcardDeck[]> {
    return this.baseStorage.getDecksByUserId(userId);
  }

  async createDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck> {
    return this.baseStorage.createDeck(deck);
  }

  async updateDeck(id: string, deck: Partial<InsertFlashcardDeck>): Promise<FlashcardDeck | undefined> {
    return this.baseStorage.updateDeck(id, deck);
  }

  async deleteDeck(id: string): Promise<boolean> {
    return this.baseStorage.deleteDeck(id);
  }

  async getFlashcardsByDeck(deckId: string): Promise<Flashcard[]> {
    return this.baseStorage.getFlashcardsByDeck(deckId);
  }

  async recordReview(review: InsertFlashcardReview): Promise<FlashcardReview> {
    return this.baseStorage.recordReview(review);
  }

  async getDailyStats(userId: string, days: number = 30): Promise<any[]> {
    return this.baseStorage.getDailyStats(userId, days);
  }

  async getDeckStats(userId: string): Promise<any[]> {
    return this.baseStorage.getDeckStats(userId);
  }

  async getRetentionCurve(userId: string, deckId?: string): Promise<any[]> {
    return this.baseStorage.getRetentionCurve(userId, deckId);
  }

  // Initialize method
  async initialize(): Promise<void> {
    if (this.baseStorage.initialize) {
      await this.baseStorage.initialize();
    }
  }

  // Create user with ID method
  async createUserWithId(id: string, userData: InsertUser): Promise<User> {
    if (this.baseStorage.createUserWithId) {
      const newUser = await this.baseStorage.createUserWithId(id, userData);

      // Cache the new user
      const cacheKey = this.getUserCacheKey(id);
      this.queryCache.set(cacheKey, newUser, 10 * 60 * 1000);

      return newUser;
    }

    return this.createUser(userData);
  }

  // ========== TODO BOARD METHODS ==========

  // Board methods
  async getBoardsByUserId(userId: string): Promise<any[]> {
    const cacheKey = `boards:user:${userId}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    const boards = await this.baseStorage.getBoardsByUserId(userId);
    this.queryCache.set(cacheKey, boards);
    return boards;
  }

  async getBoard(id: string): Promise<any | undefined> {
    const cacheKey = `board:${id}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    const board = await this.baseStorage.getBoard(id);
    if (board) this.queryCache.set(cacheKey, board);
    return board;
  }

  async createBoard(board: any): Promise<any> {
    const newBoard = await this.baseStorage.createBoard(board);

    // Invalidate user's boards cache
    this.queryCache.delete(`boards:user:${board.userId}`);

    return newBoard;
  }

  async updateBoard(id: string, board: any): Promise<any | undefined> {
    const updated = await this.baseStorage.updateBoard(id, board);

    if (updated) {
      // Invalidate caches
      this.queryCache.delete(`board:${id}`);
      this.queryCache.delete(`boards:user:${updated.userId}`);
    }

    return updated;
  }

  async deleteBoard(id: string): Promise<boolean> {
    const board = await this.baseStorage.getBoard(id);
    const success = await this.baseStorage.deleteBoard(id);

    if (success && board) {
      this.queryCache.delete(`board:${id}`);
      this.queryCache.delete(`boards:user:${board.userId}`);
    }

    return success;
  }

  // List methods
  async getListsByBoardId(boardId: string): Promise<any[]> {
    const cacheKey = `lists:board:${boardId}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    const lists = await this.baseStorage.getListsByBoardId(boardId);
    this.queryCache.set(cacheKey, lists);
    return lists;
  }

  async createList(list: any): Promise<any> {
    console.log(`  💾 optimizedStorage.createList called for board ${list.boardId}: "${list.title}"`);
    const newList = await this.baseStorage.createList(list);
    console.log(`  💾 optimizedStorage.createList returned ID: ${newList.id}`);

    // Invalidate board's lists cache
    this.queryCache.delete(`lists:board:${list.boardId}`);

    return newList;
  }

  async updateList(id: string, list: any): Promise<any | undefined> {
    const existing = await this.baseStorage.getListsByBoardId(list.boardId || '');
    const updated = await this.baseStorage.updateList(id, list);

    if (updated) {
      this.queryCache.delete(`lists:board:${updated.boardId}`);
    }

    return updated;
  }

  async deleteList(id: string): Promise<boolean> {
    // Note: We'd need to fetch the list first to get boardId for cache invalidation
    const success = await this.baseStorage.deleteList(id);

    if (success) {
      // Clear all list caches (inefficient but safe)
      const keys = Array.from((this.queryCache as any).cache.keys()) as string[];
      keys.forEach(key => {
        if (key.startsWith('lists:board:')) {
          this.queryCache.delete(key);
        }
      });
    }

    return success;
  }

  // Card methods
  async getCardsByUserId(userId: string): Promise<any[]> {
    return this.baseStorage.getCardsByUserId(userId);
  }

  async getCardsByListId(listId: string): Promise<any[]> {
    const cacheKey = `cards:list:${listId}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    const cards = await this.baseStorage.getCardsByListId(listId);
    this.queryCache.set(cacheKey, cards, 2 * 60 * 1000); // 2 min TTL for cards
    return cards;
  }

  async getInboxCards(userId: string): Promise<any[]> {
    const cacheKey = `cards:inbox:${userId}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    const cards = await this.baseStorage.getInboxCards(userId);
    this.queryCache.set(cacheKey, cards, 2 * 60 * 1000);
    return cards;
  }

  async getCard(id: string): Promise<any | undefined> {
    return this.baseStorage.getCard(id);
  }

  async createCard(card: any): Promise<any> {
    const newCard = await this.baseStorage.createCard(card);

    // Invalidate caches
    if (card.listId) {
      this.queryCache.delete(`cards:list:${card.listId}`);
    } else {
      this.queryCache.delete(`cards:inbox:${card.userId}`);
    }

    return newCard;
  }

  async updateCard(id: string, card: any): Promise<any | undefined> {
    const updated = await this.baseStorage.updateCard(id, card);

    if (updated) {
      // Invalidate relevant caches
      if (updated.listId) {
        this.queryCache.delete(`cards:list:${updated.listId}`);
      }
      if (card.listId && card.listId !== updated.listId) {
        this.queryCache.delete(`cards:list:${card.listId}`);
      }
      this.queryCache.delete(`cards:inbox:${updated.userId}`);
    }

    return updated;
  }

  async deleteCard(id: string): Promise<boolean> {
    const success = await this.baseStorage.deleteCard(id);

    if (success) {
      // Clear all card caches
      const keys = Array.from((this.queryCache as any).cache.keys()) as string[];
      keys.forEach(key => {
        if (key.startsWith('cards:')) {
          this.queryCache.delete(key);
        }
      });
    }

    return success;
  }

  // Checklist methods
  async getChecklistsByCardId(cardId: string): Promise<any[]> {
    return this.baseStorage.getChecklistsByCardId(cardId);
  }

  async createChecklist(checklist: any): Promise<any> {
    return this.baseStorage.createChecklist(checklist);
  }

  async updateChecklist(id: string, checklist: any): Promise<any | undefined> {
    return this.baseStorage.updateChecklist(id, checklist);
  }

  async deleteChecklist(id: string): Promise<boolean> {
    return this.baseStorage.deleteChecklist(id);
  }

  // Label methods
  async getLabelsByUserId(userId: string): Promise<any[]> {
    const cacheKey = `labels:user:${userId}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    const labels = await this.baseStorage.getLabelsByUserId(userId);
    this.queryCache.set(cacheKey, labels);
    return labels;
  }

  async createLabel(label: any): Promise<any> {
    const newLabel = await this.baseStorage.createLabel(label);
    this.queryCache.delete(`labels:user:${label.userId}`);
    return newLabel;
  }

  async updateLabel(id: string, label: any): Promise<any | undefined> {
    const updated = await this.baseStorage.updateLabel(id, label);

    if (updated) {
      this.queryCache.delete(`labels:user:${updated.userId}`);
    }

    return updated;
  }

  async deleteLabel(id: string): Promise<boolean> {
    const success = await this.baseStorage.deleteLabel(id);

    if (success) {
      const keys = Array.from((this.queryCache as any).cache.keys()) as string[];
      keys.forEach(key => {
        if (key.startsWith('labels:user:')) {
          this.queryCache.delete(key);
        }
      });
    }

    return success;
  }

  async addLabelToCard(cardId: string, labelId: string): Promise<void> {
    return this.baseStorage.addLabelToCard(cardId, labelId);
  }

  async removeLabelFromCard(cardId: string, labelId: string): Promise<void> {
    return this.baseStorage.removeLabelFromCard(cardId, labelId);
  }

  async getCardLabels(cardId: string): Promise<any[]> {
    return this.baseStorage.getCardLabels(cardId);
  }

  // Quick Task methods with caching
  async getQuickTasksByUserId(userId: string): Promise<QuickTask[]> {
    const cacheKey = `quickTasks:${userId}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    const tasks = await this.baseStorage.getQuickTasksByUserId(userId);
    this.queryCache.set(cacheKey, tasks);
    return tasks;
  }

  async createQuickTask(task: InsertQuickTask): Promise<QuickTask> {
    const result = await this.baseStorage.createQuickTask(task);
    // Invalidate cache after create
    this.queryCache.invalidatePattern(`quickTasks:${task.userId}`);
    return result;
  }

  async updateQuickTask(id: string, task: Partial<InsertQuickTask>): Promise<QuickTask | undefined> {
    const result = await this.baseStorage.updateQuickTask(id, task);
    // Invalidate cache after update - need to invalidate all since we don't know userId
    this.queryCache.invalidatePattern('quickTasks:');
    return result;
  }

  async deleteQuickTask(id: string): Promise<boolean> {
    const result = await this.baseStorage.deleteQuickTask(id);
    // Invalidate cache after delete
    this.queryCache.invalidatePattern('quickTasks:');
    return result;
  }

  // ===== PAGINATED METHODS =====
  
  // Paginated assignments
  async getAssignmentsByUserIdPaginated(
    userId: string,
    options: { limit: number; offset: number; status?: string }
  ): Promise<{ items: Assignment[]; total: number }> {
    const cacheKey = `assignments:paginated:${userId}:${options.offset}:${options.limit}:${options.status || 'all'}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    // Get all assignments for user (could be optimized with SQL LIMIT/OFFSET)
    const allAssignments = await this.baseStorage.getAssignmentsByUserId(userId);
    
    // Filter by status if provided
    let filtered = allAssignments;
    if (options.status && options.status !== 'all') {
      filtered = allAssignments.filter(a => a.status === options.status);
    }
    
    const total = filtered.length;
    const items = filtered.slice(options.offset, options.offset + options.limit);
    
    const result = { items, total };
    this.queryCache.set(cacheKey, result, 2 * 60 * 1000); // 2 min cache
    return result;
  }

  // Paginated notes
  async getNotesByUserIdPaginated(
    userId: string,
    options: { limit: number; offset: number }
  ): Promise<{ items: Note[]; total: number }> {
    const cacheKey = `notes:paginated:${userId}:${options.offset}:${options.limit}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    const allNotes = await this.baseStorage.getNotesByUserId(userId);
    const total = allNotes.length;
    const items = allNotes.slice(options.offset, options.offset + options.limit);
    
    const result = { items, total };
    this.queryCache.set(cacheKey, result, 2 * 60 * 1000);
    return result;
  }

  // Paginated flashcards
  async getFlashcardsByUserIdPaginated(
    userId: string,
    options: { limit: number; offset: number; deckId?: string }
  ): Promise<{ items: Flashcard[]; total: number }> {
    const cacheKey = `flashcards:paginated:${userId}:${options.offset}:${options.limit}:${options.deckId || 'all'}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    const allFlashcards = await this.baseStorage.getFlashcardsByUserId(userId);
    
    let filtered = allFlashcards;
    if (options.deckId) {
      filtered = allFlashcards.filter(f => f.deckId === options.deckId);
    }
    
    const total = filtered.length;
    const items = filtered.slice(options.offset, options.offset + options.limit);
    
    const result = { items, total };
    this.queryCache.set(cacheKey, result, 2 * 60 * 1000);
    return result;
  }

  // Paginated cards (for todo boards)
  async getCardsByUserIdPaginated(
    userId: string,
    options: { limit: number; offset: number; listId?: string }
  ): Promise<{ items: Card[]; total: number }> {
    const cacheKey = `cards:paginated:${userId}:${options.offset}:${options.limit}:${options.listId || 'all'}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    let allCards: Card[];
    if (options.listId) {
      allCards = await this.baseStorage.getCardsByListId(options.listId);
    } else {
      allCards = await this.baseStorage.getInboxCards(userId);
    }
    
    const total = allCards.length;
    const items = allCards.slice(options.offset, options.offset + options.limit);
    
    const result = { items, total };
    this.queryCache.set(cacheKey, result, 2 * 60 * 1000);
    return result;
  }
}

// Export optimized storage instance
export const optimizedStorage = new OptimizedStorage();
