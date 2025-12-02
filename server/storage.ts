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
  type CardLabel,
  type InsertCardLabel,
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
  habits,
  notes,
  boards,
  todoLists,
  cards,
  checklists,
  labels,
  cardLabels,
  quickTasks
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { OracleStorage } from "./oracle-storage";
import { LocalStorageFallback } from "./localStorage-fallback";

// Keep db import for DatabaseStorage class (not actively used)
let db: any;
try {
  db = require("./database").db;
} catch (err) {
  // PostgreSQL database not configured - using Oracle instead
  console.log("PostgreSQL database not configured - using Oracle Cloud database");
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  // Class methods
  getClassesByUserId(userId: string): Promise<Class[]>;
  createClass(classData: InsertClass): Promise<Class>;
  deleteClass(id: string): Promise<boolean>;

  // Assignment methods
  getAssignmentsByUserId(userId: string): Promise<Assignment[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  deleteAssignment(id: string): Promise<boolean>;

  // Flashcard methods
  getFlashcardsByUserId(userId: string): Promise<Flashcard[]>;
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  updateFlashcard(id: string, flashcard: Partial<InsertFlashcard>): Promise<Flashcard | undefined>;
  deleteFlashcard(id: string): Promise<boolean>;

  // Flashcard Deck methods
  getDecksByUserId(userId: string): Promise<FlashcardDeck[]>;
  createDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck>;
  updateDeck(id: string, deck: Partial<InsertFlashcardDeck>): Promise<FlashcardDeck | undefined>;
  deleteDeck(id: string): Promise<boolean>;
  getFlashcardsByDeck(deckId: string): Promise<Flashcard[]>;

  // Flashcard Review methods
  recordReview(review: InsertFlashcardReview): Promise<FlashcardReview>;
  getDailyStats(userId: string, days?: number): Promise<any[]>;
  getDeckStats(userId: string): Promise<any[]>;
  getRetentionCurve(userId: string, deckId?: string): Promise<any[]>;

  // Mood entry methods
  getMoodEntriesByUserId(userId: string): Promise<MoodEntry[]>;
  createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry>;

  // Journal entry methods
  getJournalEntriesByUserId(userId: string): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: string, entry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: string): Promise<boolean>;

  // Pomodoro session methods
  getPomodoroSessionsByUserId(userId: string): Promise<PomodoroSession[]>;
  createPomodoroSession(session: InsertPomodoroSession): Promise<PomodoroSession>;

  // Habit methods
  getHabitsByUserId(userId: string): Promise<Habit[]>;
  createHabit(habit: InsertHabit): Promise<Habit>;
  updateHabit(id: string, habit: Partial<InsertHabit>): Promise<Habit | undefined>;
  deleteHabit(id: string): Promise<boolean>;

  // AI summary methods
  getAiSummariesByUserId(userId: string): Promise<AiSummary[]>;
  createAiSummary(summary: InsertAiSummary): Promise<AiSummary>;
  deleteAiSummary(id: string): Promise<boolean>;


  // Notes methods
  getNotesByUserId(userId: string): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: string): Promise<boolean>;

  // Todo Board methods
  getBoardsByUserId(userId: string): Promise<Board[]>;
  getBoard(id: string): Promise<Board | undefined>;
  createBoard(board: InsertBoard): Promise<Board>;
  updateBoard(id: string, board: Partial<InsertBoard>): Promise<Board | undefined>;
  deleteBoard(id: string): Promise<boolean>;

  // Todo List methods
  getListsByBoardId(boardId: string): Promise<TodoList[]>;
  createList(list: InsertTodoList): Promise<TodoList>;
  updateList(id: string, list: Partial<InsertTodoList>): Promise<TodoList | undefined>;
  deleteList(id: string): Promise<boolean>;

  // Card methods
  getCardsByUserId(userId: string): Promise<Card[]>;
  getCardsByListId(listId: string): Promise<Card[]>;
  getInboxCards(userId: string): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: string, card: Partial<InsertCard>): Promise<Card | undefined>;
  deleteCard(id: string): Promise<boolean>;

  // Checklist methods
  getChecklistsByCardId(cardId: string): Promise<Checklist[]>;
  createChecklist(checklist: InsertChecklist): Promise<Checklist>;
  updateChecklist(id: string, checklist: Partial<InsertChecklist>): Promise<Checklist | undefined>;
  deleteChecklist(id: string): Promise<boolean>;

  // Label methods
  getLabelsByUserId(userId: string): Promise<Label[]>;
  createLabel(label: InsertLabel): Promise<Label>;
  updateLabel(id: string, label: Partial<InsertLabel>): Promise<Label | undefined>;
  deleteLabel(id: string): Promise<boolean>;
  addLabelToCard(cardId: string, labelId: string): Promise<void>;
  removeLabelFromCard(cardId: string, labelId: string): Promise<void>;
  getCardLabels(cardId: string): Promise<Label[]>;

  // Quick Task methods
  getQuickTasksByUserId(userId: string): Promise<QuickTask[]>;
  createQuickTask(task: InsertQuickTask): Promise<QuickTask>;
  updateQuickTask(id: string, task: Partial<InsertQuickTask>): Promise<QuickTask | undefined>;
  deleteQuickTask(id: string): Promise<boolean>;

  // Analytics methods
  getUserAnalytics(userId: string): Promise<any>;
}

// Database Storage Implementation

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private classes: Map<string, Class>;
  private assignments: Map<string, Assignment>;
  private flashcards: Map<string, Flashcard>;
  private moodEntries: Map<string, MoodEntry>;
  private journalEntries: Map<string, JournalEntry>;
  private pomodoroSessions: Map<string, PomodoroSession>;
  private aiSummaries: Map<string, AiSummary>;
  private notes: Map<string, Note>;
  private habits: Map<string, Habit>;

  constructor() {
    this.users = new Map();
    this.classes = new Map();
    this.assignments = new Map();
    this.flashcards = new Map();
    this.moodEntries = new Map();
    this.journalEntries = new Map();
    this.pomodoroSessions = new Map();
    this.aiSummaries = new Map();
    this.notes = new Map();
    this.habits = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      avatar: insertUser.avatar ?? null,
      googleId: insertUser.googleId ?? null,
      googleAccessToken: insertUser.googleAccessToken ?? null,
      googleRefreshToken: insertUser.googleRefreshToken ?? null,
      preferences: insertUser.preferences ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = {
      ...user,
      ...userData,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Class methods
  async getClassesByUserId(userId: string): Promise<Class[]> {
    return Array.from(this.classes.values()).filter(cls => cls.userId === userId);
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const id = randomUUID();
    const newClass: Class = {
      ...classData,
      id,
      section: classData.section ?? null,
      color: classData.color ?? null,
      googleClassroomId: classData.googleClassroomId ?? null,
      description: classData.description ?? null,
      teacherName: classData.teacherName ?? null,
      teacherEmail: classData.teacherEmail ?? null,
      source: classData.source ?? null,
      syncStatus: classData.syncStatus ?? null,
      createdAt: new Date()
    };
    this.classes.set(id, newClass);
    return newClass;
  }

  async deleteClass(id: string): Promise<boolean> {
    return this.classes.delete(id);
  }

  // Assignment methods
  async getAssignmentsByUserId(userId: string): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter(assignment => assignment.userId === userId);
  }

  async createAssignment(assignmentData: InsertAssignment): Promise<Assignment> {
    const id = randomUUID();
    const assignment: Assignment = {
      ...assignmentData,
      id,
      googleClassroomId: assignmentData.googleClassroomId ?? null,
      googleCalendarId: assignmentData.googleCalendarId ?? null,
      description: assignmentData.description ?? null,
      classId: assignmentData.classId ?? null,
      status: assignmentData.status ?? null,
      dueDate: assignmentData.dueDate ?? null,
      priority: assignmentData.priority ?? null,
      isCustom: assignmentData.isCustom ?? null,
      completedAt: assignmentData.completedAt ?? null,
      source: assignmentData.source ?? null,
      syncStatus: assignmentData.syncStatus ?? null,
      createdAt: new Date()
    };
    this.assignments.set(id, assignment);
    return assignment;
  }

  async updateAssignment(id: string, assignmentData: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const assignment = this.assignments.get(id);
    if (!assignment) return undefined;

    const updatedAssignment: Assignment = {
      ...assignment,
      ...assignmentData
    };
    this.assignments.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async deleteAssignment(id: string): Promise<boolean> {
    return this.assignments.delete(id);
  }

  // Flashcard methods
  async getFlashcardsByUserId(userId: string): Promise<Flashcard[]> {
    return Array.from(this.flashcards.values()).filter(flashcard => flashcard.userId === userId);
  }

  async createFlashcard(flashcardData: InsertFlashcard): Promise<Flashcard> {
    const id = randomUUID();
    const now = new Date();
    const flashcard: Flashcard = {
      ...flashcardData,
      id,
      classId: flashcardData.classId ?? null,
      deckId: flashcardData.deckId ?? null,
      cardType: flashcardData.cardType ?? 'basic',
      clozeText: flashcardData.clozeText ?? null,
      clozeIndex: flashcardData.clozeIndex ?? null,
      difficulty: flashcardData.difficulty ?? 'medium',
      lastReviewed: flashcardData.lastReviewed ?? null,
      reviewCount: flashcardData.reviewCount ?? 0,
      correctCount: flashcardData.correctCount ?? 0,
      incorrectCount: flashcardData.incorrectCount ?? 0,
      easeFactor: flashcardData.easeFactor ?? 250,
      interval: flashcardData.interval ?? 0,
      maturityLevel: flashcardData.maturityLevel ?? 'new',
      createdAt: now,
      updatedAt: now
    };
    this.flashcards.set(id, flashcard);
    return flashcard;
  }

  async updateFlashcard(id: string, flashcardData: Partial<InsertFlashcard>): Promise<Flashcard | undefined> {
    const flashcard = this.flashcards.get(id);
    if (!flashcard) return undefined;

    const updatedFlashcard: Flashcard = {
      ...flashcard,
      ...flashcardData,
      updatedAt: new Date()
    };
    this.flashcards.set(id, updatedFlashcard);
    return updatedFlashcard;
  }

  async deleteFlashcard(id: string): Promise<boolean> {
    return this.flashcards.delete(id);
  }

  // Mood entry methods
  async getMoodEntriesByUserId(userId: string): Promise<MoodEntry[]> {
    return Array.from(this.moodEntries.values()).filter(entry => entry.userId === userId);
  }

  async createMoodEntry(entryData: InsertMoodEntry): Promise<MoodEntry> {
    const id = randomUUID();
    const entry: MoodEntry = {
      ...entryData,
      id,
      notes: entryData.notes ?? null,
      date: entryData.date ?? null,
      createdAt: new Date()
    };
    this.moodEntries.set(id, entry);
    return entry;
  }

  // Journal entry methods
  async getJournalEntriesByUserId(userId: string): Promise<JournalEntry[]> {
    return Array.from(this.journalEntries.values()).filter(entry => entry.userId === userId);
  }

  async createJournalEntry(entryData: InsertJournalEntry): Promise<JournalEntry> {
    const id = randomUUID();
    const entry: JournalEntry = {
      ...entryData,
      id,
      date: entryData.date ?? null,
      createdAt: new Date()
    };
    this.journalEntries.set(id, entry);
    return entry;
  }

  async updateJournalEntry(id: string, entryData: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const entry = this.journalEntries.get(id);
    if (!entry) return undefined;

    const updatedEntry: JournalEntry = {
      ...entry,
      ...entryData
    };
    this.journalEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteJournalEntry(id: string): Promise<boolean> {
    return this.journalEntries.delete(id);
  }

  // Pomodoro session methods
  async getPomodoroSessionsByUserId(userId: string): Promise<PomodoroSession[]> {
    return Array.from(this.pomodoroSessions.values()).filter(session => session.userId === userId);
  }

  async createPomodoroSession(sessionData: InsertPomodoroSession): Promise<PomodoroSession> {
    const id = randomUUID();
    const session: PomodoroSession = {
      ...sessionData,
      id,
      type: sessionData.type ?? null,
      completedAt: sessionData.completedAt ?? null
    };
    this.pomodoroSessions.set(id, session);
    return session;
  }

  // AI summary methods
  async getAiSummariesByUserId(userId: string): Promise<AiSummary[]> {
    return Array.from(this.aiSummaries.values()).filter(summary => summary.userId === userId);
  }

  async createAiSummary(summaryData: InsertAiSummary): Promise<AiSummary> {
    const id = randomUUID();
    const summary: AiSummary = {
      ...summaryData,
      id,
      summaryType: summaryData.summaryType ?? null,
      originalContent: summaryData.originalContent ?? null,
      fileType: summaryData.fileType ?? null,
      createdAt: new Date()
    };
    this.aiSummaries.set(id, summary);
    return summary;
  }

  async deleteAiSummary(id: string): Promise<boolean> {
    return this.aiSummaries.delete(id);
  }

  // Habit methods
  async getHabitsByUserId(userId: string): Promise<Habit[]> {
    return Array.from(this.habits.values()).filter(habit => habit.userId === userId);
  }

  async createHabit(habitData: InsertHabit): Promise<Habit> {
    const id = randomUUID();
    const habit: Habit = {
      id,
      userId: habitData.userId,
      name: habitData.name,
      description: habitData.description ?? null,
      category: habitData.category ?? null,
      frequency: habitData.frequency ?? 'daily',
      targetCount: habitData.targetCount ?? 1,
      color: habitData.color ?? null,
      icon: habitData.icon ?? null,
      streak: habitData.streak ?? 0,
      completions: habitData.completions ?? {},
      createdAt: new Date(),
      isActive: habitData.isActive ?? true
    };
    this.habits.set(id, habit);
    return habit;
  }

  async updateHabit(id: string, habitData: Partial<InsertHabit>): Promise<Habit | undefined> {
    const habit = this.habits.get(id);
    if (!habit) return undefined;

    const updatedHabit: Habit = {
      ...habit,
      ...habitData
    };
    this.habits.set(id, updatedHabit);
    return updatedHabit;
  }

  async deleteHabit(id: string): Promise<boolean> {
    return this.habits.delete(id);
  }

  // Notes methods
  async getNotesByUserId(userId: string): Promise<Note[]> {
    return Array.from(this.notes.values()).filter(note => note.userId === userId);
  }

  async getNote(id: string): Promise<Note | undefined> {
    return this.notes.get(id);
  }

  async createNote(noteData: InsertNote): Promise<Note> {
    const id = randomUUID();
    const note: Note = {
      id,
      userId: noteData.userId,
      classId: noteData.classId || null,
      title: noteData.title,
      content: noteData.content,
      category: noteData.category || null,
      tags: noteData.tags || null,
      isPinned: noteData.isPinned || false,
      color: noteData.color || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.notes.set(id, note);
    return note;
  }

  async updateNote(id: string, noteData: Partial<InsertNote>): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note) return undefined;

    const updatedNote: Note = {
      ...note,
      ...noteData,
      classId: noteData.classId !== undefined ? (noteData.classId || null) : note.classId,
      category: noteData.category !== undefined ? (noteData.category || null) : note.category,
      tags: noteData.tags !== undefined ? (noteData.tags || null) : note.tags,
      color: noteData.color !== undefined ? (noteData.color || null) : note.color,
      isPinned: noteData.isPinned !== undefined ? noteData.isPinned : note.isPinned,
      updatedAt: new Date()
    };
    this.notes.set(id, updatedNote);
    return updatedNote;
  }

  async deleteNote(id: string): Promise<boolean> {
    return this.notes.delete(id);
  }

  // Analytics methods
  async getUserAnalytics(userId: string): Promise<any> {
    const assignments = await this.getAssignmentsByUserId(userId);
    const moodEntries = await this.getMoodEntriesByUserId(userId);
    const pomodoroSessions = await this.getPomodoroSessionsByUserId(userId);
    const journalEntries = await this.getJournalEntriesByUserId(userId);

    const completedAssignments = assignments.filter(a => a.status === "completed");
    const totalPomodoroMinutes = pomodoroSessions.reduce((sum, session) => sum + session.duration, 0);
    const avgMood = moodEntries.length > 0
      ? moodEntries.reduce((sum, entry) => sum + entry.mood, 0) / moodEntries.length
      : 0;

    return {
      totalAssignments: assignments.length,
      completedAssignments: completedAssignments.length,
      completionRate: assignments.length > 0 ? (completedAssignments.length / assignments.length) * 100 : 0,
      totalStudyMinutes: totalPomodoroMinutes,
      totalMoodEntries: moodEntries.length,
      averageMood: avgMood,
      totalJournalEntries: journalEntries.length,
      totalPomodoroSessions: pomodoroSessions.length,
    };
  }

  // Deck management methods (stub implementations)
  async getDecksByUserId(userId: string): Promise<FlashcardDeck[]> {
    console.warn('Deck management not available in MemStorage - requires Oracle database');
    return [];
  }

  async createDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck> {
    throw new Error('Deck management not available in MemStorage - requires Oracle database');
  }

  async updateDeck(id: string, deck: Partial<InsertFlashcardDeck>): Promise<FlashcardDeck | undefined> {
    throw new Error('Deck management not available in MemStorage - requires Oracle database');
  }

  async deleteDeck(id: string): Promise<boolean> {
    throw new Error('Deck management not available in MemStorage - requires Oracle database');
  }

  async getFlashcardsByDeck(deckId: string): Promise<Flashcard[]> {
    throw new Error('Deck management not available in MemStorage - requires Oracle database');
  }

  async recordReview(review: InsertFlashcardReview): Promise<FlashcardReview> {
    throw new Error('Review tracking not available in MemStorage - requires Oracle database');
  }

  async getDailyStats(userId: string, days: number = 30): Promise<any[]> {
    throw new Error('Statistics not available in MemStorage - requires Oracle database');
  }

  async getDeckStats(userId: string): Promise<any[]> {
    throw new Error('Statistics not available in MemStorage - requires Oracle database');
  }

  async getRetentionCurve(userId: string, deckId?: string): Promise<any[]> {
    throw new Error('Statistics not available in MemStorage - requires Oracle database');
  }

  // Todo Board stub methods (not implemented in MemStorage)
  async getBoardsByUserId(userId: string): Promise<any[]> { return []; }
  async getBoard(id: string): Promise<any | undefined> { return undefined; }
  async createBoard(board: any): Promise<any> { throw new Error('Todo boards not available in MemStorage'); }
  async updateBoard(id: string, board: any): Promise<any | undefined> { return undefined; }
  async deleteBoard(id: string): Promise<boolean> { return false; }
  async getListsByBoardId(boardId: string): Promise<any[]> { return []; }
  async createList(list: any): Promise<any> { throw new Error('Todo boards not available in MemStorage'); }
  async updateList(id: string, list: any): Promise<any | undefined> { return undefined; }
  async deleteList(id: string): Promise<boolean> { return false; }
  async getCardsByUserId(userId: string): Promise<any[]> { return []; }
  async getCardsByListId(listId: string): Promise<any[]> { return []; }
  async getInboxCards(userId: string): Promise<any[]> { return []; }
  async getCard(id: string): Promise<any | undefined> { return undefined; }
  async createCard(card: any): Promise<any> { throw new Error('Todo boards not available in MemStorage'); }
  async updateCard(id: string, card: any): Promise<any | undefined> { return undefined; }
  async deleteCard(id: string): Promise<boolean> { return false; }
  async getChecklistsByCardId(cardId: string): Promise<any[]> { return []; }
  async createChecklist(checklist: any): Promise<any> { throw new Error('Todo boards not available in MemStorage'); }
  async updateChecklist(id: string, checklist: any): Promise<any | undefined> { return undefined; }
  async deleteChecklist(id: string): Promise<boolean> { return false; }
  async getLabelsByUserId(userId: string): Promise<any[]> { return []; }
  async createLabel(label: any): Promise<any> { throw new Error('Todo boards not available in MemStorage'); }
  async updateLabel(id: string, label: any): Promise<any | undefined> { return undefined; }
  async deleteLabel(id: string): Promise<boolean> { return false; }
  async addLabelToCard(cardId: string, labelId: string): Promise<void> { }
  async removeLabelFromCard(cardId: string, labelId: string): Promise<void> { }
  async getCardLabels(cardId: string): Promise<any[]> { return []; }
  async getQuickTasksByUserId(userId: string): Promise<any[]> { return []; }
  async createQuickTask(task: any): Promise<any> { throw new Error('Quick tasks not available in MemStorage'); }
  async updateQuickTask(id: string, task: any): Promise<any | undefined> { return undefined; }
  async deleteQuickTask(id: string): Promise<boolean> { return false; }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set({
      ...userData,
      updatedAt: new Date()
    }).where(eq(users.id, id)).returning();
    return result[0];
  }

  // Class methods
  async getClassesByUserId(userId: string): Promise<Class[]> {
    return await db.select().from(classes).where(eq(classes.userId, userId));
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const result = await db.insert(classes).values(classData).returning();
    return result[0];
  }

  async deleteClass(id: string): Promise<boolean> {
    const result = await db.delete(classes).where(eq(classes.id, id));
    return result.length > 0;
  }

  // Assignment methods
  async getAssignmentsByUserId(userId: string): Promise<Assignment[]> {
    return await db.select().from(assignments).where(eq(assignments.userId, userId));
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const result = await db.insert(assignments).values(assignment).returning();
    return result[0];
  }

  async updateAssignment(id: string, assignmentData: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const result = await db.update(assignments).set(assignmentData).where(eq(assignments.id, id)).returning();
    return result[0];
  }

  async deleteAssignment(id: string): Promise<boolean> {
    const result = await db.delete(assignments).where(eq(assignments.id, id));
    return result.length > 0;
  }

  // Flashcard methods
  async getFlashcardsByUserId(userId: string): Promise<Flashcard[]> {
    return await db.select().from(flashcards).where(eq(flashcards.userId, userId));
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const result = await db.insert(flashcards).values(flashcard).returning();
    return result[0];
  }

  async updateFlashcard(id: string, flashcardData: Partial<InsertFlashcard>): Promise<Flashcard | undefined> {
    const result = await db.update(flashcards).set(flashcardData).where(eq(flashcards.id, id)).returning();
    return result[0];
  }

  async deleteFlashcard(id: string): Promise<boolean> {
    const result = await db.delete(flashcards).where(eq(flashcards.id, id));
    return result.length > 0;
  }

  // Mood Entry methods
  async getMoodEntriesByUserId(userId: string): Promise<MoodEntry[]> {
    return await db.select().from(moodEntries).where(eq(moodEntries.userId, userId));
  }

  async createMoodEntry(moodEntry: InsertMoodEntry): Promise<MoodEntry> {
    const result = await db.insert(moodEntries).values(moodEntry).returning();
    return result[0];
  }

  async deleteMoodEntry(id: string): Promise<boolean> {
    const result = await db.delete(moodEntries).where(eq(moodEntries.id, id));
    return result.length > 0;
  }

  // Journal Entry methods
  async getJournalEntriesByUserId(userId: string): Promise<JournalEntry[]> {
    return await db.select().from(journalEntries).where(eq(journalEntries.userId, userId));
  }

  async createJournalEntry(journalEntry: InsertJournalEntry): Promise<JournalEntry> {
    const result = await db.insert(journalEntries).values(journalEntry).returning();
    return result[0];
  }

  async updateJournalEntry(id: string, journalData: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const result = await db.update(journalEntries).set(journalData).where(eq(journalEntries.id, id)).returning();
    return result[0];
  }

  async deleteJournalEntry(id: string): Promise<boolean> {
    const result = await db.delete(journalEntries).where(eq(journalEntries.id, id));
    return result.length > 0;
  }

  // Pomodoro Session methods
  async getPomodoroSessionsByUserId(userId: string): Promise<PomodoroSession[]> {
    return await db.select().from(pomodoroSessions).where(eq(pomodoroSessions.userId, userId));
  }

  async createPomodoroSession(session: InsertPomodoroSession): Promise<PomodoroSession> {
    const result = await db.insert(pomodoroSessions).values(session).returning();
    return result[0];
  }

  // AI Summary methods
  async getAiSummariesByUserId(userId: string): Promise<AiSummary[]> {
    return await db.select().from(aiSummaries).where(eq(aiSummaries.userId, userId));
  }

  async createAiSummary(summary: InsertAiSummary): Promise<AiSummary> {
    const result = await db.insert(aiSummaries).values(summary).returning();
    return result[0];
  }

  async deleteAiSummary(id: string): Promise<boolean> {
    const result = await db.delete(aiSummaries).where(eq(aiSummaries.id, id));
    return result.length > 0;
  }

  // Habit methods
  async getHabitsByUserId(userId: string): Promise<Habit[]> {
    return await db.select().from(habits).where(eq(habits.userId, userId));
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    const result = await db.insert(habits).values(habit).returning();
    return result[0];
  }

  async updateHabit(id: string, habitData: Partial<InsertHabit>): Promise<Habit | undefined> {
    const result = await db.update(habits).set(habitData).where(eq(habits.id, id)).returning();
    return result[0];
  }

  async deleteHabit(id: string): Promise<boolean> {
    const result = await db.delete(habits).where(eq(habits.id, id));
    return result.length > 0;
  }

  // Notes methods
  async getNotesByUserId(userId: string): Promise<Note[]> {
    return await db.select().from(notes).where(eq(notes.userId, userId));
  }

  async getNote(id: string): Promise<Note | undefined> {
    const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    return result[0];
  }

  async createNote(note: InsertNote): Promise<Note> {
    const result = await db.insert(notes).values(note).returning();
    return result[0];
  }

  async updateNote(id: string, noteData: Partial<InsertNote>): Promise<Note | undefined> {
    const result = await db.update(notes).set({
      ...noteData,
      updatedAt: new Date()
    }).where(eq(notes.id, id)).returning();
    return result[0];
  }

  async deleteNote(id: string): Promise<boolean> {
    const result = await db.delete(notes).where(eq(notes.id, id));
    return result.length > 0;
  }

  // Analytics methods
  async getUserAnalytics(userId: string): Promise<any> {
    const userAssignments = await this.getAssignmentsByUserId(userId);
    const userMoodEntries = await this.getMoodEntriesByUserId(userId);
    const userPomodoroSessions = await this.getPomodoroSessionsByUserId(userId);
    const userJournalEntries = await this.getJournalEntriesByUserId(userId);

    const completedAssignments = userAssignments.filter(a => a.status === "completed");
    const totalPomodoroMinutes = userPomodoroSessions.reduce((sum: number, session) => sum + session.duration, 0);
    const avgMood = userMoodEntries.length > 0
      ? userMoodEntries.reduce((sum: number, entry) => sum + entry.mood, 0) / userMoodEntries.length
      : 0;

    return {
      totalAssignments: userAssignments.length,
      completedAssignments: completedAssignments.length,
      completionRate: userAssignments.length > 0 ? (completedAssignments.length / userAssignments.length) * 100 : 0,
      totalStudyMinutes: totalPomodoroMinutes,
      totalMoodEntries: userMoodEntries.length,
      averageMood: avgMood,
      totalJournalEntries: userJournalEntries.length,
      totalPomodoroSessions: userPomodoroSessions.length,
    };
  }

  // Deck management methods (stub implementations)
  async getDecksByUserId(userId: string): Promise<FlashcardDeck[]> {
    console.warn('Deck management not available in DatabaseStorage - requires Oracle database');
    return [];
  }

  async createDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck> {
    throw new Error('Deck management not available in DatabaseStorage - requires Oracle database');
  }

  async updateDeck(id: string, deck: Partial<InsertFlashcardDeck>): Promise<FlashcardDeck | undefined> {
    throw new Error('Deck management not available in DatabaseStorage - requires Oracle database');
  }

  async deleteDeck(id: string): Promise<boolean> {
    throw new Error('Deck management not available in DatabaseStorage - requires Oracle database');
  }

  async getFlashcardsByDeck(deckId: string): Promise<Flashcard[]> {
    throw new Error('Deck management not available in DatabaseStorage - requires Oracle database');
  }

  async recordReview(review: InsertFlashcardReview): Promise<FlashcardReview> {
    throw new Error('Review tracking not available in DatabaseStorage - requires Oracle database');
  }

  async getDailyStats(userId: string, days: number = 30): Promise<any[]> {
    throw new Error('Statistics not available in DatabaseStorage - requires Oracle database');
  }

  async getDeckStats(userId: string): Promise<any[]> {
    throw new Error('Statistics not available in DatabaseStorage - requires Oracle database');
  }

  async getRetentionCurve(userId: string, deckId?: string): Promise<any[]> {
    throw new Error('Statistics not available in DatabaseStorage - requires Oracle database');
  }

  // Todo Board stub methods (not implemented in DatabaseStorage)
  async getBoardsByUserId(userId: string): Promise<any[]> { return []; }
  async getBoard(id: string): Promise<any | undefined> { return undefined; }
  async createBoard(board: any): Promise<any> { throw new Error('Todo boards not available in DatabaseStorage'); }
  async updateBoard(id: string, board: any): Promise<any | undefined> { return undefined; }
  async deleteBoard(id: string): Promise<boolean> { return false; }
  async getListsByBoardId(boardId: string): Promise<any[]> { return []; }
  async createList(list: any): Promise<any> { throw new Error('Todo boards not available in DatabaseStorage'); }
  async updateList(id: string, list: any): Promise<any | undefined> { return undefined; }
  async deleteList(id: string): Promise<boolean> { return false; }
  async getCardsByUserId(userId: string): Promise<any[]> { return []; }
  async getCardsByListId(listId: string): Promise<any[]> { return []; }
  async getInboxCards(userId: string): Promise<any[]> { return []; }
  async getCard(id: string): Promise<any | undefined> { return undefined; }
  async createCard(card: any): Promise<any> { throw new Error('Todo boards not available in DatabaseStorage'); }
  async updateCard(id: string, card: any): Promise<any | undefined> { return undefined; }
  async deleteCard(id: string): Promise<boolean> { return false; }
  async getChecklistsByCardId(cardId: string): Promise<any[]> { return []; }
  async createChecklist(checklist: any): Promise<any> { throw new Error('Todo boards not available in DatabaseStorage'); }
  async updateChecklist(id: string, checklist: any): Promise<any | undefined> { return undefined; }
  async deleteChecklist(id: string): Promise<boolean> { return false; }
  async getLabelsByUserId(userId: string): Promise<any[]> { return []; }
  async createLabel(label: any): Promise<any> { throw new Error('Todo boards not available in DatabaseStorage'); }
  async updateLabel(id: string, label: any): Promise<any | undefined> { return undefined; }
  async deleteLabel(id: string): Promise<boolean> { return false; }
  async addLabelToCard(cardId: string, labelId: string): Promise<void> { }
  async removeLabelFromCard(cardId: string, labelId: string): Promise<void> { }
  async getCardLabels(cardId: string): Promise<any[]> { return []; }
  async getQuickTasksByUserId(userId: string): Promise<any[]> { return []; }
  async createQuickTask(task: any): Promise<any> { throw new Error('Quick tasks not available in DatabaseStorage'); }
  async updateQuickTask(id: string, task: any): Promise<any | undefined> { return undefined; }
  async deleteQuickTask(id: string): Promise<boolean> { return false; }
}

// Initialize storage with fallback handling
let storage: OracleStorage | LocalStorageFallback;

try {
  storage = new OracleStorage();
  console.log(' Oracle storage initialized');
} catch (error) {
  console.error(' Failed to initialize Oracle storage:', error);
  console.log(' Falling back to localStorage storage');
  storage = new LocalStorageFallback();
}

// Document Processing Session Storage
export async function createDocumentSession(data: {
  userId: string;
  jobId: string;
  fileName: string;
  kind: "pdf" | "pptx" | "xlsx";
}) {
  // Store session metadata in memory or database
  // For now, return a simple session object
  return {
    id: randomUUID(),
    ...data,
    createdAt: new Date().toISOString(),
    status: "processing",
  };
}

export async function updateDocumentSession(
  sessionId: string,
  updates: {
    status?: string;
    phase?: string;
    error?: string;
  }
) {
  // Update session in storage
  // For now, just log the update
  console.log(`Updating session ${sessionId}:`, updates);
  return true;
}

export async function saveGeneratedAssets(data: {
  sessionId: string;
  userId: string;
  notes?: InsertNote[];
  flashcards?: InsertFlashcard[];
  assignments?: InsertAssignment[];
}) {
  const results = {
    notes: [] as Note[],
    flashcards: [] as Flashcard[],
    assignments: [] as Assignment[],
  };

  // Save notes
  if (data.notes) {
    for (const note of data.notes) {
      try {
        // Ensure tags is an array (fix Oracle array binding issue)
        const noteToSave = {
          ...note,
          tags: Array.isArray(note.tags) ? note.tags : []
        };
        const saved = await storage.createNote(noteToSave);
        results.notes.push(saved);
      } catch (error) {
        console.error(`Failed to save note "${note.title}":`, error);
        // Continue with other notes even if one fails
      }
    }
  }

  // Save flashcards
  if (data.flashcards) {
    for (const flashcard of data.flashcards) {
      try {
        const saved = await storage.createFlashcard(flashcard);
        results.flashcards.push(saved);
      } catch (error) {
        console.error(`Failed to save flashcard:`, error);
        // Continue with other flashcards even if one fails
      }
    }
  }

  // Save assignments
  if (data.assignments) {
    for (const assignment of data.assignments) {
      try {
        const saved = await storage.createAssignment(assignment);
        results.assignments.push(saved);
      } catch (error) {
        console.error(`Failed to save assignment "${assignment.title}":`, error);
        // Continue with other assignments even if one fails
      }
    }
  }

  return results;
}

export { storage };