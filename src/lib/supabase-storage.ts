import { supabase } from './supabase';
import { encryptToken, decryptToken } from './tokenEncryption';
import type {
  User,
  InsertUser,
  Class,
  InsertClass,
  Assignment,
  InsertAssignment,
  AiSummary,
  InsertAiSummary,
  Habit,
  InsertHabit,
  CalendarEvent as CalendarEventDB,
  InsertCalendarEvent,
  Note,
  InsertNote,
  Folder,
  InsertFolder,
  Board,
  InsertBoard,
  TodoList,
  InsertTodoList,
  Card,
  InsertCard,
  Label,
  InsertLabel,
  QuickTask,
  InsertQuickTask,
  FlashcardDeck,
  InsertFlashcardDeck,
  Flashcard,
  InsertFlashcard,
} from '@shared/schema';

/**
 * SupabaseStorage - Complete data access layer for Supabase PostgreSQL
 * Replaces OracleStorage with direct Supabase client calls
 * All methods enforce user-level authorization by filtering on user_id
 */

// Helper to map snake_case DB response to camelCase Note type
function mapDbToNote(row: any): Note {
  return {
    id: row.id,
    userId: row.user_id,
    folderId: row.folder_id ?? null,
    classId: row.class_id ?? null,
    title: row.title,
    content: row.content,
    category: row.category,
    tags: row.tags,
    isPinned: row.is_pinned,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to map snake_case DB response to camelCase Folder type
function mapDbToFolder(row: any): Folder {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    parentFolderId: row.parent_folder_id ?? null,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    isExpanded: row.is_expanded,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to map snake_case DB response to camelCase FlashcardDeck type
function mapDbToFlashcardDeck(row: any): FlashcardDeck {
  return {
    id: row.id,
    userId: row.user_id,
    folderId: row.folder_id ?? null,
    title: row.title,
    description: row.description ?? '',
    tags: row.tags ?? [],
    isPublic: row.is_public ?? false,
    cardCount: row.card_count ?? 0,
    lastStudied: row.last_studied,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to map snake_case DB response to camelCase Flashcard type
function mapDbToFlashcard(row: any): Flashcard {
  return {
    id: row.id,
    deckId: row.deck_id,
    term: row.term ?? '',
    definition: row.definition ?? '',
    termImage: row.term_image ?? null,
    definitionImage: row.definition_image ?? null,
    termAudio: row.term_audio ?? null,
    definitionAudio: row.definition_audio ?? null,
    position: row.position ?? 0,
    isStarred: row.is_starred ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


export class SupabaseStorage {
  // ========================================
  // USER METHODS
  // ========================================

  /**
   * Decrypt OAuth tokens on a user object after reading from database.
   * Handles both encrypted and legacy unencrypted tokens gracefully.
   */
  private async decryptUserTokens(user: User): Promise<User> {
    if (!user) return user;
    try {
      if (user.googleAccessToken) {
        user.googleAccessToken =
          (await decryptToken(user.googleAccessToken)) || user.googleAccessToken;
      }
      if (user.googleRefreshToken) {
        user.googleRefreshToken =
          (await decryptToken(user.googleRefreshToken)) || user.googleRefreshToken;
      }
    } catch (error) {
      console.warn('Failed to decrypt user tokens (may be unencrypted):', error);
    }
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();

    if (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }

    if (!data) return undefined;

    return await this.decryptUserTokens(data as User);
  }


  async createUser(user: InsertUser & { id: string }): Promise<User> {
    // Encrypt OAuth tokens before storing
    const encryptedAccessToken = user.googleAccessToken
      ? await encryptToken(user.googleAccessToken)
      : null;
    const encryptedRefreshToken = user.googleRefreshToken
      ? await encryptToken(user.googleRefreshToken)
      : null;

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id, // Firebase UID
        email: user.email,
        name: user.name || user.email.split('@')[0],
        first_name: user.firstName || null,
        last_name: user.lastName || null,
        avatar: user.avatar || null,
        google_id: user.googleId || null,
        google_access_token: encryptedAccessToken,
        google_refresh_token: encryptedRefreshToken,
        preferences: user.preferences || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return await this.decryptUserTokens(data as User);
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const updates: any = {};
    if (user.name !== undefined) updates.name = user.name;
    if (user.firstName !== undefined) updates.first_name = user.firstName;
    if (user.lastName !== undefined) updates.last_name = user.lastName;
    if (user.avatar !== undefined) updates.avatar = user.avatar;
    if (user.googleAccessToken !== undefined) {
      updates.google_access_token = user.googleAccessToken
        ? await encryptToken(user.googleAccessToken)
        : user.googleAccessToken;
    }
    if (user.googleRefreshToken !== undefined) {
      updates.google_refresh_token = user.googleRefreshToken
        ? await encryptToken(user.googleRefreshToken)
        : user.googleRefreshToken;
    }
    if (user.preferences !== undefined) updates.preferences = user.preferences;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return undefined;
    }

    return await this.decryptUserTokens(data as User);
  }

  /**
   * Upsert user - creates if not exists, updates if exists
   * Used for auth sync after login
   */
  async upsertUser(userData: {
    uid: string;
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
    accessToken?: string | null;
  }): Promise<User | undefined> {
    try {
      // Try to get existing user first
      const existingUser = await this.getUser(userData.uid);

      if (existingUser) {
        // Update existing user
        const updates: any = {};
        if (userData.displayName) updates.name = userData.displayName;
        if (userData.photoURL) updates.avatar = userData.photoURL;
        if (userData.accessToken) {
          updates.google_access_token = await encryptToken(userData.accessToken);
        }

        if (Object.keys(updates).length > 0) {
          return await this.updateUser(userData.uid, updates);
        }
        return existingUser;
      } else {
        // Create new user
        return await this.createUser({
          id: userData.uid,
          email: userData.email,
          name: userData.displayName || userData.email.split('@')[0],
          avatar: userData.photoURL || null,
          googleAccessToken: userData.accessToken || null,
        });
      }
    } catch (error) {
      console.error('Error upserting user:', error);
      return undefined;
    }
  }

  // ========================================
  // CLASS METHODS
  // ========================================

  async getClassesByUserId(userId: string): Promise<Class[]> {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching classes:', error);
      return [];
    }

    return data as Class[];
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const { data, error } = await supabase
      .from('classes')
      .insert({
        user_id: classData.userId,
        name: classData.name,
        section: classData.section || null,
        description: classData.description || null,
        teacher_name: classData.teacherName || null,
        teacher_email: classData.teacherEmail || null,
        color: classData.color || '#42a5f5',
        google_classroom_id: classData.googleClassroomId || null,
        source: classData.source || 'manual',
        sync_status: classData.syncStatus || 'synced',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating class:', error);
      throw new Error(`Failed to create class: ${error.message}`);
    }

    return data as Class;
  }

  async updateClass(id: string, updates: Partial<InsertClass>): Promise<Class | null> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.teacherName !== undefined) updateData.teacher_name = updates.teacherName;
    if (updates.teacherEmail !== undefined) updateData.teacher_email = updates.teacherEmail;
    if (updates.section !== undefined) updateData.section = updates.section;
    if (updates.googleClassroomId !== undefined)
      updateData.google_classroom_id = updates.googleClassroomId;
    if (updates.source !== undefined) updateData.source = updates.source;
    if (updates.syncStatus !== undefined) updateData.sync_status = updates.syncStatus;

    const { data, error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating class:', error);
      return null;
    }

    return data as Class;
  }

  async deleteClass(id: string): Promise<boolean> {
    const { error } = await supabase.from('classes').delete().eq('id', id);

    if (error) {
      console.error('Error deleting class:', error);
      return false;
    }

    return true;
  }

  // ========================================
  // ASSIGNMENT METHODS
  // ========================================

  async getAssignmentsByUserId(userId: string): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }

    return data as Assignment[];
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        user_id: assignment.userId,
        class_id: assignment.classId || null,
        google_classroom_id: assignment.googleClassroomId || null,
        google_calendar_id: assignment.googleCalendarId || null,
        title: assignment.title,
        description: assignment.description || null,
        due_date: assignment.dueDate || null,
        status: assignment.status || 'pending',
        priority: assignment.priority || 'medium',
        is_custom: assignment.isCustom || false,
        source: assignment.source || 'manual',
        sync_status: assignment.syncStatus || 'synced',
        completed_at: assignment.completedAt || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating assignment:', error);
      throw new Error(`Failed to create assignment: ${error.message}`);
    }

    return data as Assignment;
  }


  async deleteAssignment(id: string): Promise<boolean> {
    const { error } = await supabase.from('assignments').delete().eq('id', id);

    if (error) {
      console.error('Error deleting assignment:', error);
      return false;
    }

    return true;
  }

  // ========================================
  // FOLDER METHODS (unified file organization)
  // ========================================

  async getFoldersByUserId(userId: string): Promise<Folder[]> {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching folders:', error);
      return [];
    }

    return (data || []).map(mapDbToFolder);
  }


  async createFolder(folder: InsertFolder): Promise<Folder> {
    const { data, error } = await supabase
      .from('folders')
      .insert({
        user_id: folder.userId,
        name: folder.name,
        parent_folder_id: folder.parentFolderId || null,
        color: folder.color || '#3b82f6',
        icon: folder.icon || null,
        sort_order: folder.sortOrder || 0,
        is_expanded: folder.isExpanded !== undefined ? folder.isExpanded : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      throw new Error(`Failed to create folder: ${error.message}`);
    }

    return mapDbToFolder(data);
  }

  async updateFolder(id: string, folder: Partial<InsertFolder>): Promise<Folder | undefined> {
    const updates: any = {};
    if (folder.name !== undefined) updates.name = folder.name;
    if (folder.parentFolderId !== undefined) updates.parent_folder_id = folder.parentFolderId;
    if (folder.color !== undefined) updates.color = folder.color;
    if (folder.icon !== undefined) updates.icon = folder.icon;
    if (folder.sortOrder !== undefined) updates.sort_order = folder.sortOrder;
    if (folder.isExpanded !== undefined) updates.is_expanded = folder.isExpanded;

    const { data, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating folder:', error);
      return undefined;
    }

    return mapDbToFolder(data);
  }

  async deleteFolder(id: string): Promise<boolean> {
    const { error } = await supabase.from('folders').delete().eq('id', id);

    if (error) {
      console.error('Error deleting folder:', error);
      return false;
    }

    return true;
  }

  // ========================================
  // NOTE METHODS
  // ========================================

  async getNotesByUserId(userId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }

    return (data || []).map(mapDbToNote);
  }

  async getNote(id: string): Promise<Note | undefined> {
    const { data, error } = await supabase.from('notes').select('*').eq('id', id).single();

    if (error) {
      console.error('Error fetching note:', error);
      return undefined;
    }

    return mapDbToNote(data);
  }

  async createNote(note: InsertNote): Promise<Note> {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: note.userId,
        folder_id: note.folderId || null,
        class_id: note.classId || null,
        title: note.title,
        content: note.content,
        category: note.category || 'general',
        tags: note.tags || [],
        is_pinned: note.isPinned || false,
        color: note.color || '#ffffff',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      throw new Error(`Failed to create note: ${error.message}`);
    }

    return mapDbToNote(data);
  }

  async updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined> {
    const updates: any = {};
    if (note.title !== undefined) updates.title = note.title;
    if (note.content !== undefined) updates.content = note.content;
    if (note.folderId !== undefined) updates.folder_id = note.folderId;
    if (note.category !== undefined) updates.category = note.category;
    if (note.tags !== undefined) updates.tags = note.tags;
    if (note.isPinned !== undefined) updates.is_pinned = note.isPinned;
    if (note.color !== undefined) updates.color = note.color;

    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return undefined;
    }

    return mapDbToNote(data);
  }


  // ========================================
  // CALENDAR EVENT METHODS
  // ========================================

  private mapDbToCalendarEvent(row: any): CalendarEventDB {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description ?? null,
      startTime: row.start_time ? new Date(row.start_time) : new Date(),
      endTime: row.end_time ? new Date(row.end_time) : new Date(),
      type: row.type ?? 'event',
      color: row.color ?? 'bg-blue-500',
      location: row.location ?? null,
      isAllDay: row.is_all_day ?? false,
      assignmentId: row.assignment_id ?? null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }

  async getCalendarEventsByUserId(userId: string): Promise<CalendarEventDB[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }

    return (data || []).map((row: any) => this.mapDbToCalendarEvent(row));
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEventDB> {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: event.userId,
        title: event.title,
        description: event.description || null,
        start_time:
          event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
        end_time: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime,
        type: event.type || 'event',
        color: event.color || 'bg-blue-500',
        location: event.location || null,
        is_all_day: event.isAllDay || false,
        assignment_id: event.assignmentId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }

    return this.mapDbToCalendarEvent(data);
  }

  async updateCalendarEvent(
    id: string,
    event: Partial<InsertCalendarEvent>,
  ): Promise<CalendarEventDB | undefined> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (event.title !== undefined) updates.title = event.title;
    if (event.description !== undefined) updates.description = event.description;
    if (event.startTime !== undefined)
      updates.start_time =
        event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime;
    if (event.endTime !== undefined)
      updates.end_time =
        event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime;
    if (event.type !== undefined) updates.type = event.type;
    if (event.color !== undefined) updates.color = event.color;
    if (event.location !== undefined) updates.location = event.location;
    if (event.isAllDay !== undefined) updates.is_all_day = event.isAllDay;
    if (event.assignmentId !== undefined) updates.assignment_id = event.assignmentId;

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating calendar event:', error);
      return undefined;
    }

    return this.mapDbToCalendarEvent(data);
  }

  async deleteCalendarEvent(id: string): Promise<boolean> {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);

    if (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }

    return true;
  }

  // ========================================
  // HABIT METHODS
  // ========================================

  async getHabitsByUserId(userId: string): Promise<Habit[]> {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching habits:', error);
      return [];
    }

    return data as Habit[];
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id: habit.userId,
        name: habit.name,
        description: habit.description || null,
        category: habit.category || null,
        frequency: habit.frequency || 'daily',
        target_count: habit.targetCount || 1,
        color: habit.color || null,
        icon: habit.icon || null,
        streak: habit.streak || 0,
        completions: habit.completions || {},
        is_active: habit.isActive !== undefined ? habit.isActive : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating habit:', error);
      throw new Error(`Failed to create habit: ${error.message}`);
    }

    return data as Habit;
  }

  async updateHabit(id: string, habit: Partial<InsertHabit>): Promise<Habit | undefined> {
    const updates: any = {};
    if (habit.name !== undefined) updates.name = habit.name;
    if (habit.description !== undefined) updates.description = habit.description;
    if (habit.category !== undefined) updates.category = habit.category;
    if (habit.frequency !== undefined) updates.frequency = habit.frequency;
    if (habit.targetCount !== undefined) updates.target_count = habit.targetCount;
    if (habit.color !== undefined) updates.color = habit.color;
    if (habit.icon !== undefined) updates.icon = habit.icon;
    if (habit.streak !== undefined) updates.streak = habit.streak;
    if (habit.completions !== undefined) updates.completions = habit.completions;
    if (habit.isActive !== undefined) updates.is_active = habit.isActive;

    const { data, error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating habit:', error);
      return undefined;
    }

    return data as Habit;
  }

  async deleteHabit(id: string): Promise<boolean> {
    const { error } = await supabase.from('habits').delete().eq('id', id);

    if (error) {
      console.error('Error deleting habit:', error);
      return false;
    }

    return true;
  }

  // ========================================
  // AI SUMMARY METHODS
  // ========================================

  async getAiSummariesByUserId(userId: string): Promise<AiSummary[]> {
    const { data, error } = await supabase
      .from('ai_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AI summaries:', error);
      return [];
    }

    return data as AiSummary[];
  }

  async createAiSummary(summary: InsertAiSummary): Promise<AiSummary> {
    const { data, error } = await supabase
      .from('ai_summaries')
      .insert({
        user_id: summary.userId,
        title: summary.title,
        summary: summary.summary,
        original_content: summary.originalContent || null,
        summary_type: summary.summaryType || 'quick',
        file_type: summary.fileType || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating AI summary:', error);
      throw new Error(`Failed to create AI summary: ${error.message}`);
    }

    return data as AiSummary;
  }

  async deleteAiSummary(id: string): Promise<boolean> {
    const { error } = await supabase.from('ai_summaries').delete().eq('id', id);

    if (error) {
      console.error('Error deleting AI summary:', error);
      return false;
    }

    return true;
  }

  // ========================================
  // BOARD METHODS (Kanban)
  // ========================================

  async getBoardsByUserId(userId: string): Promise<Board[]> {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching boards:', error);
      return [];
    }

    return data as Board[];
  }


  async createBoard(board: InsertBoard): Promise<Board> {
    const { data, error } = await supabase
      .from('boards')
      .insert({
        user_id: board.userId,
        title: board.title,
        background: board.background || null,
        position: board.position || 0,
        is_archived: board.isArchived || false,
        is_favorited: board.isFavorited || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating board:', error);
      throw new Error(`Failed to create board: ${error.message}`);
    }

    return data as Board;
  }

  async updateBoard(id: string, board: Partial<InsertBoard>): Promise<Board | undefined> {
    const updates: any = {};
    if (board.title !== undefined) updates.title = board.title;
    if (board.background !== undefined) updates.background = board.background;
    if (board.position !== undefined) updates.position = board.position;
    if (board.isArchived !== undefined) updates.is_archived = board.isArchived;
    if (board.isFavorited !== undefined) updates.is_favorited = board.isFavorited;

    const { data, error } = await supabase
      .from('boards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating board:', error);
      return undefined;
    }

    return data as Board;
  }

  async deleteBoard(id: string): Promise<boolean> {
    const { error } = await supabase.from('boards').delete().eq('id', id);

    if (error) {
      console.error('Error deleting board:', error);
      return false;
    }

    return true;
  }

  // ========================================
  // TODO LIST METHODS
  // ========================================

  async getListsByBoardId(boardId: string): Promise<TodoList[]> {
    const { data, error } = await supabase
      .from('todo_lists')
      .select('*')
      .eq('board_id', boardId)
      .eq('is_archived', false)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching lists:', error);
      return [];
    }

    // Map snake_case to camelCase
    return (data || []).map((list) => ({
      id: list.id,
      boardId: list.board_id,
      title: list.title,
      position: list.position,
      isArchived: list.is_archived,
      createdAt: list.created_at,
    })) as TodoList[];
  }

  async createList(list: InsertTodoList): Promise<TodoList> {
    const { data, error } = await supabase
      .from('todo_lists')
      .insert({
        board_id: list.boardId,
        title: list.title,
        position: list.position || 0,
        is_archived: list.isArchived || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating list:', error);
      throw new Error(`Failed to create list: ${error.message}`);
    }

    // Map snake_case to camelCase
    return {
      id: data.id,
      boardId: data.board_id,
      title: data.title,
      position: data.position,
      isArchived: data.is_archived,
      createdAt: data.created_at,
    } as TodoList;
  }

  async updateList(id: string, list: Partial<InsertTodoList>): Promise<TodoList | undefined> {
    const updates: any = {};
    if (list.title !== undefined) updates.title = list.title;
    if (list.position !== undefined) updates.position = list.position;
    if (list.isArchived !== undefined) updates.is_archived = list.isArchived;

    const { data, error } = await supabase
      .from('todo_lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating list:', error);
      return undefined;
    }

    return data as TodoList;
  }

  async deleteList(id: string): Promise<boolean> {
    const { error } = await supabase.from('todo_lists').delete().eq('id', id);

    if (error) {
      console.error('Error deleting list:', error);
      return false;
    }

    return true;
  }

  // ========================================
  // CARD METHODS
  // ========================================



  async getCardsByBoardId(boardId: string): Promise<Card[]> {
    // Get all lists for this board first
    const lists = await this.getListsByBoardId(boardId);
    const listIds = lists.map((l) => l.id);

    if (listIds.length === 0) return [];

    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .in('list_id', listIds)
      .eq('is_archived', false)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching cards by board:', error);
      return [];
    }

    // Map snake_case to camelCase
    return (data || []).map((card) => ({
      id: card.id,
      userId: card.user_id,
      listId: card.list_id,
      originalListId: card.original_list_id,
      title: card.title,
      description: card.description,
      position: card.position,
      dueDate: card.due_date,
      isCompleted: card.is_completed,
      isArchived: card.is_archived,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
    })) as Card[];
  }

  async getInboxCards(userId: string): Promise<Card[]> {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', userId)
      .is('list_id', null)
      .eq('is_archived', false)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching inbox cards:', error);
      return [];
    }

    // Map snake_case to camelCase
    return (data || []).map((card) => ({
      id: card.id,
      userId: card.user_id,
      listId: card.list_id,
      originalListId: card.original_list_id,
      title: card.title,
      description: card.description,
      position: card.position,
      dueDate: card.due_date,
      isCompleted: card.is_completed,
      isArchived: card.is_archived,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
    })) as Card[];
  }


  async createCard(card: InsertCard): Promise<Card> {
    const { data, error } = await supabase
      .from('cards')
      .insert({
        user_id: card.userId,
        list_id: card.listId || null,
        original_list_id: card.originalListId || null,
        title: card.title,
        description: card.description || null,
        position: card.position || 0,
        due_date: card.dueDate || null,
        is_completed: card.isCompleted || false,
        is_archived: card.isArchived || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating card:', error);
      throw new Error(`Failed to create card: ${error.message}`);
    }

    // Map snake_case to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      listId: data.list_id,
      originalListId: data.original_list_id,
      title: data.title,
      description: data.description,
      position: data.position,
      dueDate: data.due_date,
      isCompleted: data.is_completed,
      isArchived: data.is_archived,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as Card;
  }

  async updateCard(id: string, card: Partial<InsertCard>): Promise<Card | undefined> {
    const updates: any = {};
    if (card.title !== undefined) updates.title = card.title;
    if (card.description !== undefined) updates.description = card.description;
    if (card.listId !== undefined) updates.list_id = card.listId;
    if (card.originalListId !== undefined) updates.original_list_id = card.originalListId;
    if (card.position !== undefined) updates.position = card.position;
    if (card.dueDate !== undefined) updates.due_date = card.dueDate;
    if (card.isCompleted !== undefined) updates.is_completed = card.isCompleted;
    if (card.isArchived !== undefined) updates.is_archived = card.isArchived;

    const { data, error } = await supabase
      .from('cards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating card:', error);
      return undefined;
    }

    // Map snake_case to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      listId: data.list_id,
      originalListId: data.original_list_id,
      title: data.title,
      description: data.description,
      position: data.position,
      dueDate: data.due_date,
      isCompleted: data.is_completed,
      isArchived: data.is_archived,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as Card;
  }

  async deleteCard(id: string): Promise<boolean> {
    const { error } = await supabase.from('cards').delete().eq('id', id);

    if (error) {
      console.error('Error deleting card:', error);
      return false;
    }

    return true;
  }


  // ========================================
  // LABEL METHODS
  // ========================================

  async getLabelsByUserId(userId: string): Promise<Label[]> {
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching labels:', error);
      return [];
    }

    return data as Label[];
  }

  async createLabel(label: InsertLabel): Promise<Label> {
    const { data, error } = await supabase
      .from('labels')
      .insert({
        user_id: label.userId,
        name: label.name,
        color: label.color,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating label:', error);
      throw new Error(`Failed to create label: ${error.message}`);
    }

    return data as Label;
  }

  async updateLabel(id: string, label: Partial<InsertLabel>): Promise<Label | undefined> {
    const updates: any = {};
    if (label.name !== undefined) updates.name = label.name;
    if (label.color !== undefined) updates.color = label.color;

    const { data, error } = await supabase
      .from('labels')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating label:', error);
      return undefined;
    }

    return data as Label;
  }

  async deleteLabel(id: string): Promise<boolean> {
    const { error } = await supabase.from('labels').delete().eq('id', id);

    if (error) {
      console.error('Error deleting label:', error);
      return false;
    }

    return true;
  }

  async addLabelToCard(cardId: string, labelId: string): Promise<boolean> {
    const { error } = await supabase.from('card_labels').insert({
      card_id: cardId,
      label_id: labelId,
    });

    if (error) {
      console.error('Error adding label to card:', error);
      return false;
    }
    return true;
  }

  async removeLabelFromCard(cardId: string, labelId: string): Promise<boolean> {
    const { error } = await supabase
      .from('card_labels')
      .delete()
      .eq('card_id', cardId)
      .eq('label_id', labelId);

    if (error) {
      console.error('Error removing label from card:', error);
      return false;
    }
    return true;
  }


  // ========================================
  // QUICK TASK METHODS
  // ========================================

  async getQuickTasksByUserId(userId: string): Promise<QuickTask[]> {
    const { data, error } = await supabase
      .from('quick_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quick tasks:', error);
      return [];
    }

    return data as QuickTask[];
  }

  async createQuickTask(task: InsertQuickTask): Promise<QuickTask> {
    const { data, error } = await supabase
      .from('quick_tasks')
      .insert({
        user_id: task.userId,
        title: task.title,
        completed: task.completed || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quick task:', error);
      throw new Error(`Failed to create quick task: ${error.message}`);
    }

    return data as QuickTask;
  }

  async updateQuickTask(
    id: string,
    task: Partial<InsertQuickTask>,
  ): Promise<QuickTask | undefined> {
    const updates: any = {};
    if (task.title !== undefined) updates.title = task.title;
    if (task.completed !== undefined) updates.completed = task.completed;

    const { data, error } = await supabase
      .from('quick_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating quick task:', error);
      return undefined;
    }

    return data as QuickTask;
  }

  async deleteQuickTask(id: string): Promise<boolean> {
    const { error } = await supabase.from('quick_tasks').delete().eq('id', id);

    if (error) {
      console.error('Error deleting quick task:', error);
      return false;
    }

    return true;
  }


  // ========================================
  // USER SETTINGS METHODS (dashboard widgets, notifications, etc.)
  // ========================================

  async updateUserSettings(
    userId: string,
    settings: {
      gpaExcludedCourses?: string[];
    },
  ): Promise<User | undefined> {
    const updates: any = {};
    if (settings.gpaExcludedCourses !== undefined)
      updates.gpa_excluded_courses = settings.gpaExcludedCourses;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      return undefined;
    }

    return data as User;
  }


  async getGpaExcludedCourses(userId: string): Promise<string[]> {
    const user = await this.getUser(userId);
    return (user?.gpaExcludedCourses as string[]) || [];
  }

  async saveGpaExcludedCourses(userId: string, courses: string[]): Promise<boolean> {
    const result = await this.updateUserSettings(userId, { gpaExcludedCourses: courses });
    return !!result;
  }


  // ========================================
  // FLASHCARD DECK METHODS
  // ========================================

  async getFlashcardDecksByUserId(userId: string): Promise<FlashcardDeck[]> {
    const { data, error } = await supabase
      .from('flashcard_decks')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching flashcard decks:', error);
      return [];
    }

    return (data || []).map(mapDbToFlashcardDeck);
  }

  async getFlashcardDeck(id: string): Promise<FlashcardDeck | undefined> {
    const { data, error } = await supabase
      .from('flashcard_decks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching flashcard deck:', error);
      return undefined;
    }

    return mapDbToFlashcardDeck(data);
  }

  async createFlashcardDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck> {
    const { data, error } = await supabase
      .from('flashcard_decks')
      .insert({
        user_id: deck.userId,
        folder_id: deck.folderId || null,
        title: deck.title || 'Untitled Deck',
        description: deck.description || '',
        tags: deck.tags || [],
        is_public: deck.isPublic ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating flashcard deck:', error);
      throw new Error(`Failed to create flashcard deck: ${error.message}`);
    }

    return mapDbToFlashcardDeck(data);
  }

  async updateFlashcardDeck(
    id: string,
    deck: Partial<InsertFlashcardDeck>,
  ): Promise<FlashcardDeck | undefined> {
    const updates: any = {};
    if (deck.title !== undefined) updates.title = deck.title;
    if (deck.description !== undefined) updates.description = deck.description;
    if (deck.tags !== undefined) updates.tags = deck.tags;
    if (deck.isPublic !== undefined) updates.is_public = deck.isPublic;
    if (deck.folderId !== undefined) updates.folder_id = deck.folderId;
    if (deck.lastStudied !== undefined) updates.last_studied = deck.lastStudied;

    const { data, error } = await supabase
      .from('flashcard_decks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating flashcard deck:', error);
      return undefined;
    }

    return mapDbToFlashcardDeck(data);
  }

  async deleteFlashcardDeck(id: string): Promise<boolean> {
    const { error } = await supabase.from('flashcard_decks').delete().eq('id', id);

    if (error) {
      console.error('Error deleting flashcard deck:', error);
      return false;
    }

    return true;
  }

  // ========================================
  // FLASHCARD (INDIVIDUAL CARD) METHODS
  // ========================================

  async getFlashcardsByDeckId(deckId: string): Promise<Flashcard[]> {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching flashcards:', error);
      return [];
    }

    return (data || []).map(mapDbToFlashcard);
  }

  async createFlashcard(card: InsertFlashcard): Promise<Flashcard> {
    const { data, error } = await supabase
      .from('flashcards')
      .insert({
        deck_id: card.deckId,
        term: card.term || '',
        definition: card.definition || '',
        term_image: card.termImage || null,
        definition_image: card.definitionImage || null,
        term_audio: card.termAudio || null,
        definition_audio: card.definitionAudio || null,
        position: card.position ?? 0,
        is_starred: card.isStarred ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating flashcard:', error);
      throw new Error(`Failed to create flashcard: ${error.message}`);
    }

    return mapDbToFlashcard(data);
  }

  async createFlashcardsBatch(cards: InsertFlashcard[]): Promise<Flashcard[]> {
    if (cards.length === 0) return [];
    const rows = cards.map((c) => ({
      deck_id: c.deckId,
      term: c.term || '',
      definition: c.definition || '',
      term_image: c.termImage || null,
      definition_image: c.definitionImage || null,
      term_audio: c.termAudio || null,
      definition_audio: c.definitionAudio || null,
      position: c.position ?? 0,
      is_starred: c.isStarred ?? false,
    }));

    const { data, error } = await supabase.from('flashcards').insert(rows).select();

    if (error) {
      console.error('Error batch creating flashcards:', error);
      throw new Error(`Failed to batch create flashcards: ${error.message}`);
    }

    return (data || []).map(mapDbToFlashcard);
  }


  async deleteFlashcard(id: string): Promise<boolean> {
    const { error } = await supabase.from('flashcards').delete().eq('id', id);

    if (error) {
      console.error('Error deleting flashcard:', error);
      return false;
    }

    return true;
  }


  /**
   * Save a full deck with all its cards in one go.
   * Creates the deck row, then batch-inserts all cards.
   * Returns the created deck (with cardCount populated by trigger).
   */
  async saveFlashcardDeckWithCards(
    deckInput: InsertFlashcardDeck,
    cards: Omit<InsertFlashcard, 'deckId'>[],
  ): Promise<{ deck: FlashcardDeck; cards: Flashcard[] }> {
    // 1. Create deck
    const deck = await this.createFlashcardDeck(deckInput);

    // 2. Batch insert cards with deck_id
    const cardInputs: InsertFlashcard[] = cards.map((c, i) => ({
      ...c,
      deckId: deck.id,
      position: c.position ?? i,
    }));

    const savedCards = await this.createFlashcardsBatch(cardInputs);

    // 3. Re-fetch deck to get updated card_count from trigger
    const updatedDeck = await this.getFlashcardDeck(deck.id);

    return { deck: updatedDeck || deck, cards: savedCards };
  }



}

// Export singleton instance
export const supabaseStorage = new SupabaseStorage();
export const storage = supabaseStorage; // Alias for compatibility
export default supabaseStorage;
