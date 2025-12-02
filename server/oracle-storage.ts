import { executeQuery, executeQueryWithConnection, initializeDatabase, oracledb } from './oracle-database';
import { randomUUID } from 'crypto';
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
  Habit,
  InsertHabit,
  Note,
  InsertNote,
  Board,
  InsertBoard,
  TodoList,
  InsertTodoList,
  Card,
  InsertCard,
  Checklist,
  InsertChecklist,
  Label,
  InsertLabel,
  QuickTask,
  InsertQuickTask
} from "@shared/schema";

export class OracleStorage {
  private initialized = false;
  private oracleAvailable = false;

  async initialize() {
    if (!this.initialized) {
      try {
        await initializeDatabase();
        this.oracleAvailable = true;
        this.initialized = true;
        console.log(' Oracle storage initialized successfully');
      } catch (error) {
        console.warn(' Oracle database not available, using fallback mode:', (error as Error).message);
        this.oracleAvailable = false;
        this.initialized = true; // Mark as initialized to avoid repeated attempts
        throw new Error('Oracle database not available - fallback to localStorage');
      }
    }
  }

  private async ensureOracleAvailable() {
    await this.initialize();
    if (!this.oracleAvailable) {
      throw new Error('Oracle database is not available. Please install Oracle Instant Client to use database features.');
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    await this.ensureOracleAvailable();
    const result = await executeQuery('SELECT * FROM users WHERE id = :id', { id });
    
    if (!result.rows || result.rows.length === 0) {
      return undefined;
    }
    
    const row = result.rows[0] as any;
    return {
      id: row.ID,
      name: row.NAME,
      email: row.EMAIL,
      firstName: row.FIRST_NAME,
      lastName: row.LAST_NAME,
      avatar: row.AVATAR,
      googleId: row.GOOGLE_ID,
      googleAccessToken: row.GOOGLE_ACCESS_TOKEN,
      googleRefreshToken: row.GOOGLE_REFRESH_TOKEN,
      preferences: row.PREFERENCES,
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureOracleAvailable();
    const result = await executeQuery('SELECT * FROM users WHERE email = :email', { email });
    
    if (!result.rows || result.rows.length === 0) {
      return undefined;
    }
    
    const row = result.rows[0] as any;
    return {
      id: row.ID,
      name: row.NAME,
      email: row.EMAIL,
      firstName: row.FIRST_NAME,
      lastName: row.LAST_NAME,
      avatar: row.AVATAR,
      googleId: row.GOOGLE_ID,
      googleAccessToken: row.GOOGLE_ACCESS_TOKEN,
      googleRefreshToken: row.GOOGLE_REFRESH_TOKEN,
      preferences: row.PREFERENCES,
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    };
  }

  async createUser(user: InsertUser): Promise<User> {
    await this.ensureOracleAvailable();
    const id = randomUUID();
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const sql = `
      INSERT INTO users (id, name, email, first_name, last_name, avatar, google_id, 
                        google_access_token, google_refresh_token, preferences, 
                        created_at, updated_at)
      VALUES (:id, :name, :email, :firstName, :lastName, :avatar, :googleId,
              :googleAccessToken, :googleRefreshToken, :preferences,
              :createdAt, :updatedAt)
    `;
    
    await executeQuery(sql, {
      id,
      name: user.name,
      email: user.email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      avatar: user.avatar || null,
      googleId: user.googleId || null,
      googleAccessToken: user.googleAccessToken || null,
      googleRefreshToken: user.googleRefreshToken || null,
      preferences: user.preferences || null,
      createdAt,
      updatedAt
    });

    return {
      id,
      name: user.name,
      email: user.email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      avatar: user.avatar || null,
      googleId: user.googleId || null,
      googleAccessToken: user.googleAccessToken || null,
      googleRefreshToken: user.googleRefreshToken || null,
      preferences: user.preferences || null,
      createdAt,
      updatedAt
    };
  }

  async createUserWithId(userId: string, user: InsertUser): Promise<User> {
    await this.initialize();
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const sql = `
      INSERT INTO users (id, name, email, first_name, last_name, avatar, google_id, 
                        google_access_token, google_refresh_token, preferences, 
                        created_at, updated_at)
      VALUES (:id, :name, :email, :firstName, :lastName, :avatar, :googleId,
              :googleAccessToken, :googleRefreshToken, :preferences,
              :createdAt, :updatedAt)
    `;
    
    await executeQuery(sql, {
      id: userId,
      name: user.name,
      email: user.email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      avatar: user.avatar || null,
      googleId: user.googleId || null,
      googleAccessToken: user.googleAccessToken || null,
      googleRefreshToken: user.googleRefreshToken || null,
      preferences: user.preferences || null,
      createdAt,
      updatedAt
    });

    return {
      id: userId,
      name: user.name,
      email: user.email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      avatar: user.avatar || null,
      googleId: user.googleId || null,
      googleAccessToken: user.googleAccessToken || null,
      googleRefreshToken: user.googleRefreshToken || null,
      preferences: user.preferences || null,
      createdAt,
      updatedAt
    };
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    await this.initialize();
    const updatedAt = new Date();
    
    const setParts: string[] = [];
    const binds: any = { id, updatedAt };
    
    // Map camelCase keys to UPPER_CASE column names
    const columnMap: Record<string, string> = {
      id: 'ID',
      name: 'NAME',
      email: 'EMAIL',
      firstName: 'FIRST_NAME',
      lastName: 'LAST_NAME',
      avatar: 'AVATAR',
      googleId: 'GOOGLE_ID',
      googleAccessToken: 'GOOGLE_ACCESS_TOKEN',
      googleRefreshToken: 'GOOGLE_REFRESH_TOKEN',
      preferences: 'PREFERENCES',
      createdAt: 'CREATED_AT',
      updatedAt: 'UPDATED_AT'
    };
    
    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined) {
        const columnName = columnMap[key] || key.toUpperCase();
        setParts.push(`${columnName} = :${key}`);
        binds[key] = value;
      }
    });
    
    if (setParts.length === 0) {
      return this.getUser(id);
    }
    
    const sql = `UPDATE users SET ${setParts.join(', ')}, UPDATED_AT = :updatedAt WHERE ID = :id`;
    await executeQuery(sql, binds);
    
    return this.getUser(id);
  }

  // Notes methods
  async getNotesByUserId(userId: string): Promise<Note[]> {
    await this.ensureOracleAvailable();
    
    return await executeQueryWithConnection(async (connection) => {
      const result = await connection.execute(
        'SELECT * FROM notes WHERE user_id = :userId ORDER BY created_at DESC', 
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT, autoCommit: true }
      );
      
      // Convert Oracle result to plain objects and handle LOB content
      const notes = await Promise.all((result.rows || []).map(async (row: any) => {
        let content = row.CONTENT;
        
        // If content is a LOB (Large Object), read its data
        if (content && typeof content === 'object' && content.getData) {
          try {
            content = await content.getData();
          } catch (error) {
            console.error('Error reading LOB data:', error);
            content = '';
          }
        }
        
        // Parse tags JSON string back to array
        let tags = null;
        if (row.TAGS) {
          try {
            tags = typeof row.TAGS === 'string' ? JSON.parse(row.TAGS) : row.TAGS;
          } catch (e) {
            console.error('Error parsing tags JSON:', e);
            tags = null;
          }
        }
        
        return {
          id: row.ID,
          userId: row.USER_ID,
          classId: row.CLASS_ID,
          title: row.TITLE,
          content: content,
          category: row.CATEGORY,
          tags: tags,
          isPinned: row.IS_PINNED === 1,
          color: row.COLOR,
          createdAt: row.CREATED_AT,
          updatedAt: row.UPDATED_AT
        };
      }));
      
      console.log(` Found notes: ${notes.length}`);
      return notes;
    });
  }

  async getNote(id: string): Promise<Note | undefined> {
    await this.ensureOracleAvailable();
    
    return await executeQueryWithConnection(async (connection) => {
      const result = await connection.execute(
        'SELECT * FROM notes WHERE id = :id', 
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT, autoCommit: true }
      );
      
      if (!result.rows || result.rows.length === 0) {
        return undefined;
      }
      
      const row = result.rows[0] as any;
      let content = row.CONTENT;
      
      // If content is a LOB (Large Object), read its data
      if (content && typeof content === 'object' && content.getData) {
        try {
          content = await content.getData();
        } catch (error) {
          console.error('Error reading LOB data:', error);
          content = '';
        }
      }
      
      // Parse tags JSON string back to array
      let tags = null;
      if (row.TAGS) {
        try {
          tags = typeof row.TAGS === 'string' ? JSON.parse(row.TAGS) : row.TAGS;
        } catch (e) {
          console.error('Error parsing tags JSON:', e);
          tags = null;
        }
      }
      
      return {
        id: row.ID,
        userId: row.USER_ID,
        classId: row.CLASS_ID,
        title: row.TITLE,
        content: content,
        category: row.CATEGORY,
        tags: tags,
        isPinned: row.IS_PINNED === 1,
        color: row.COLOR,
        createdAt: row.CREATED_AT,
        updatedAt: row.UPDATED_AT
      };
    });
  }

  async createNote(note: InsertNote): Promise<Note> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const sql = `
      INSERT INTO notes (ID, USER_ID, CLASS_ID, TITLE, CONTENT, CATEGORY, TAGS, 
                        IS_PINNED, COLOR, CREATED_AT, UPDATED_AT)
      VALUES (:id, :userId, :classId, :title, :content, :category, :tags,
              :isPinned, :color, :createdAt, :updatedAt)
    `;
    
    await executeQuery(sql, {
      id,
      userId: note.userId,
      classId: note.classId || null,
      title: note.title,
      content: note.content,
      category: note.category || null,
      tags: note.tags ? JSON.stringify(note.tags) : null,
      isPinned: note.isPinned ? 1 : 0,
      color: note.color || null,
      createdAt,
      updatedAt
    });

    return {
      id,
      userId: note.userId,
      classId: note.classId || null,
      title: note.title,
      content: note.content,
      category: note.category || null,
      tags: note.tags || null,
      isPinned: note.isPinned || false,
      color: note.color || null,
      createdAt,
      updatedAt
    };
  }

  async updateNote(id: string, noteData: Partial<InsertNote>): Promise<Note | undefined> {
    await this.initialize();
    const updatedAt = new Date();
    
    const setParts: string[] = [];
    const binds: any = { id, updatedAt };
    
    // Map camelCase keys to UPPER_CASE column names
    const columnMap: Record<string, string> = {
      id: 'ID',
      userId: 'USER_ID',
      classId: 'CLASS_ID',
      title: 'TITLE',
      content: 'CONTENT',
      category: 'CATEGORY',
      tags: 'TAGS',
      isPinned: 'IS_PINNED',
      color: 'COLOR',
      createdAt: 'CREATED_AT',
      updatedAt: 'UPDATED_AT'
    };
    
    Object.entries(noteData).forEach(([key, value]) => {
      if (value !== undefined) {
        const columnName = columnMap[key] || key.toUpperCase();
        if (key === 'isPinned') {
          setParts.push(`${columnName} = :isPinned`);
          binds.isPinned = value ? 1 : 0;
        } else if (key === 'tags') {
          setParts.push(`${columnName} = :${key}`);
          binds[key] = Array.isArray(value) ? JSON.stringify(value) : value;
        } else {
          setParts.push(`${columnName} = :${key}`);
          binds[key] = value;
        }
      }
    });
    
    if (setParts.length === 0) {
      return this.getNote(id);
    }
    
    const sql = `UPDATE notes SET ${setParts.join(', ')}, UPDATED_AT = :updatedAt WHERE ID = :id`;
    await executeQuery(sql, binds);
    
    return this.getNote(id);
  }

  async deleteNote(id: string): Promise<boolean> {
    await this.initialize();
    const result = await executeQuery('DELETE FROM notes WHERE ID = :id', { id });
    return (result.rowsAffected || 0) > 0;
  }

  // Class methods
  async getClassesByUserId(userId: string): Promise<Class[]> {
    await this.initialize();
    console.log(' Fetching classes for user:', userId);
    
    const result = await executeQuery(
      'SELECT * FROM classes WHERE user_id = :userId ORDER BY created_at DESC',
      { userId }
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log(' No classes found for user:', userId);
      return [];
    }
    
    console.log(' Found classes:', result.rows.length);
    
    return result.rows.map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      googleClassroomId: row.GOOGLE_CLASSROOM_ID,
      name: row.NAME,
      section: row.SECTION,
      description: row.DESCRIPTION,
      teacherName: row.TEACHER_NAME,
      teacherEmail: row.TEACHER_EMAIL,
      color: row.COLOR,
      source: row.SOURCE || 'manual',
      syncStatus: row.SYNC_STATUS || 'synced',
      createdAt: row.CREATED_AT
    }));
  }

  async createClass(classData: InsertClass): Promise<Class> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    
    console.log(' Creating class:', { id, ...classData });
    
    const sql = `
      INSERT INTO classes (id, user_id, google_classroom_id, name, section, 
                          description, teacher_name, teacher_email, color, created_at)
      VALUES (:id, :userId, :googleClassroomId, :name, :section,
              :description, :teacherName, :teacherEmail, :color, :createdAt)
    `;
    
    await executeQuery(sql, {
      id,
      userId: classData.userId,
      googleClassroomId: classData.googleClassroomId || null,
      name: classData.name,
      section: classData.section || null,
      description: classData.description || null,
      teacherName: classData.teacherName || null,
      teacherEmail: classData.teacherEmail || null,
      color: classData.color || '#42a5f5',
      createdAt
    });
    
    console.log(' Class created successfully');
    
    return {
      id,
      userId: classData.userId,
      googleClassroomId: classData.googleClassroomId || null,
      name: classData.name,
      section: classData.section || null,
      description: classData.description || null,
      teacherName: classData.teacherName || null,
      teacherEmail: classData.teacherEmail || null,
      color: classData.color || '#42a5f5',
      source: classData.source || 'manual',
      syncStatus: classData.syncStatus || 'synced',
      createdAt
    };
  }

  async updateClass(id: string, classData: Partial<InsertClass>): Promise<Class | undefined> {
    await this.initialize();
    console.log(' Updating class:', id, classData);
    
    const setParts = [];
    const params: any = { id };
    
    if (classData.name !== undefined) {
      setParts.push('name = :name');
      params.name = classData.name;
    }
    if (classData.section !== undefined) {
      setParts.push('section = :section');
      params.section = classData.section;
    }
    if (classData.description !== undefined) {
      setParts.push('description = :description');
      params.description = classData.description;
    }
    if (classData.teacherName !== undefined) {
      setParts.push('teacher_name = :teacherName');
      params.teacherName = classData.teacherName;
    }
    if (classData.teacherEmail !== undefined) {
      setParts.push('teacher_email = :teacherEmail');
      params.teacherEmail = classData.teacherEmail;
    }
    if (classData.color !== undefined) {
      setParts.push('color = :color');
      params.color = classData.color;
    }
    if (classData.source !== undefined) {
      setParts.push('source = :source');
      params.source = classData.source;
    }
    if (classData.syncStatus !== undefined) {
      setParts.push('sync_status = :syncStatus');
      params.syncStatus = classData.syncStatus;
    }
    if (classData.googleClassroomId !== undefined) {
      setParts.push('google_classroom_id = :googleClassroomId');
      params.googleClassroomId = classData.googleClassroomId;
    }
    
    if (setParts.length === 0) {
      console.log(' No fields to update');
      return this.getClassById(id);
    }
    
    const sql = `UPDATE classes SET ${setParts.join(', ')} WHERE id = :id`;
    await executeQuery(sql, params);
    
    console.log(' Class updated successfully');
    return this.getClassById(id);
  }

  async getClassById(id: string): Promise<Class | undefined> {
    await this.initialize();
    const result = await executeQuery(
      'SELECT * FROM classes WHERE id = :id',
      { id }
    );
    
    if (!result.rows || result.rows.length === 0) {
      return undefined;
    }
    
    const row: any = result.rows[0];
    return {
      id: row.ID,
      userId: row.USER_ID,
      googleClassroomId: row.GOOGLE_CLASSROOM_ID,
      name: row.NAME,
      section: row.SECTION,
      description: row.DESCRIPTION,
      teacherName: row.TEACHER_NAME,
      teacherEmail: row.TEACHER_EMAIL,
      color: row.COLOR,
      source: row.SOURCE || 'manual',
      syncStatus: row.SYNC_STATUS || 'synced',
      createdAt: row.CREATED_AT
    };
  }

  async deleteClass(id: string): Promise<boolean> {
    await this.initialize();
    console.log(' Deleting class:', id);
    
    const result = await executeQuery('DELETE FROM classes WHERE id = :id', { id });
    const success = Boolean(result.rowsAffected && result.rowsAffected > 0);
    
    if (success) {
      console.log(' Class deleted successfully');
    } else {
      console.log(' Class not found');
    }
    
    return success;
  }
  
  // Assignment methods
  async getAssignmentsByUserId(userId: string): Promise<Assignment[]> {
    await this.initialize();
    console.log(' Fetching assignments for user:', userId);
    
    const result = await executeQuery(
      'SELECT * FROM assignments WHERE user_id = :userId ORDER BY created_at DESC',
      { userId }
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log(' No assignments found for user:', userId);
      return [];
    }
    
    console.log(' Found assignments:', result.rows.length);
    
    return result.rows.map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      classId: row.CLASS_ID,
      googleClassroomId: row.GOOGLE_CLASSROOM_ID,
      googleCalendarId: row.GOOGLE_CALENDAR_ID || null,
      title: row.TITLE,
      description: row.DESCRIPTION,
      dueDate: row.DUE_DATE,
      status: row.STATUS,
      priority: row.PRIORITY,
      isCustom: Boolean(row.IS_CUSTOM),
      source: row.SOURCE || 'manual',
      syncStatus: row.SYNC_STATUS || 'synced',
      completedAt: row.COMPLETED_AT,
      createdAt: row.CREATED_AT
    }));
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    
    console.log(' Creating assignment:', { id, ...assignment });
    
    const sql = `
      INSERT INTO assignments (id, user_id, class_id, google_classroom_id, title, 
                              description, due_date, status, priority, is_custom, 
                              completed_at, created_at)
      VALUES (:id, :userId, :classId, :googleClassroomId, :title,
              :description, :dueDate, :status, :priority, :isCustom,
              :completedAt, :createdAt)
    `;
    
    await executeQuery(sql, {
      id,
      userId: assignment.userId,
      classId: assignment.classId || null,
      googleClassroomId: assignment.googleClassroomId || null,
      title: assignment.title,
      description: assignment.description || null,
      dueDate: assignment.dueDate || null,
      status: assignment.status || 'pending',
      priority: assignment.priority || 'medium',
      isCustom: assignment.isCustom ? 1 : 0,
      completedAt: assignment.completedAt || null,
      createdAt
    });
    
    console.log(' Assignment created successfully');
    
    return {
      id,
      userId: assignment.userId,
      classId: assignment.classId || null,
      googleClassroomId: assignment.googleClassroomId || null,
      googleCalendarId: assignment.googleCalendarId || null,
      title: assignment.title,
      description: assignment.description || null,
      dueDate: assignment.dueDate || null,
      status: assignment.status || 'pending',
      priority: assignment.priority || 'medium',
      isCustom: assignment.isCustom || false,
      source: assignment.source || 'manual',
      syncStatus: assignment.syncStatus || 'synced',
      completedAt: assignment.completedAt || null,
      createdAt
    };
  }

  async updateAssignment(id: string, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    await this.initialize();
    console.log(' Updating assignment:', id, assignment);
    
    const setParts = [];
    const params: any = { id };
    
    if (assignment.title !== undefined) {
      setParts.push('title = :title');
      params.title = assignment.title;
    }
    if (assignment.description !== undefined) {
      setParts.push('description = :description');
      params.description = assignment.description;
    }
    if (assignment.dueDate !== undefined) {
      setParts.push('due_date = :dueDate');
      params.dueDate = assignment.dueDate;
    }
    if (assignment.status !== undefined) {
      setParts.push('status = :status');
      params.status = assignment.status;
    }
    if (assignment.priority !== undefined) {
      setParts.push('priority = :priority');
      params.priority = assignment.priority;
    }
    if (assignment.isCustom !== undefined) {
      setParts.push('is_custom = :isCustom');
      params.isCustom = assignment.isCustom ? 1 : 0;
    }
    if (assignment.completedAt !== undefined) {
      setParts.push('completed_at = :completedAt');
      params.completedAt = assignment.completedAt;
    }
    if (assignment.classId !== undefined) {
      setParts.push('class_id = :classId');
      params.classId = assignment.classId;
    }
    
    if (setParts.length === 0) {
      console.log(' No fields to update');
      return undefined;
    }
    
    const sql = `UPDATE assignments SET ${setParts.join(', ')} WHERE id = :id`;
    await executeQuery(sql, params);
    
    // Return updated assignment
    const result = await executeQuery('SELECT * FROM assignments WHERE id = :id', { id });
    if (!result.rows || result.rows.length === 0) {
      console.log(' Assignment not found after update');
      return undefined;
    }
    
    const row = result.rows[0] as any;
    console.log(' Assignment updated successfully');
    
    return {
      id: row.ID,
      userId: row.USER_ID,
      classId: row.CLASS_ID,
      googleClassroomId: row.GOOGLE_CLASSROOM_ID,
      googleCalendarId: row.GOOGLE_CALENDAR_ID || null,
      title: row.TITLE,
      description: row.DESCRIPTION,
      dueDate: row.DUE_DATE,
      status: row.STATUS,
      priority: row.PRIORITY,
      isCustom: Boolean(row.IS_CUSTOM),
      source: row.SOURCE || 'manual',
      syncStatus: row.SYNC_STATUS || 'synced',
      completedAt: row.COMPLETED_AT,
      createdAt: row.CREATED_AT
    };
  }

  async deleteAssignment(id: string): Promise<boolean> {
    await this.initialize();
    console.log(' Deleting assignment:', id);
    
    const result = await executeQuery('DELETE FROM assignments WHERE id = :id', { id });
    const success = Boolean(result.rowsAffected && result.rowsAffected > 0);
    
    if (success) {
      console.log(' Assignment deleted successfully');
    } else {
      console.log(' Assignment not found');
    }
    
    return success;
  }
  
  // Flashcard methods
  async getFlashcardsByUserId(userId: string): Promise<Flashcard[]> {
    await this.initialize();
    console.log(' Fetching flashcards for user:', userId);
    
    const result = await executeQuery(
      'SELECT * FROM flashcards WHERE user_id = :userId ORDER BY created_at DESC',
      { userId }
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log(' No flashcards found for user:', userId);
      return [];
    }
    
    console.log(' Found flashcards:', result.rows.length);
    
    return result.rows.map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      deckId: row.DECK_ID,
      classId: row.CLASS_ID,
      cardType: row.CARD_TYPE || 'basic',
      front: row.FRONT,
      back: row.BACK,
      clozeText: row.CLOZE_TEXT,
      clozeIndex: row.CLOZE_INDEX,
      difficulty: row.DIFFICULTY,
      lastReviewed: row.LAST_REVIEWED,
      reviewCount: row.REVIEW_COUNT || 0,
      correctCount: row.CORRECT_COUNT || 0,
      incorrectCount: row.INCORRECT_COUNT || 0,
      easeFactor: row.EASE_FACTOR || 250,
      interval: row.INTERVAL_DAYS || 0,
      maturityLevel: row.MATURITY_LEVEL || 'new',
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    }));
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    const updatedAt = new Date();
    
    console.log(' Creating flashcard:', { id, ...flashcard });
    
    const sql = `
      INSERT INTO flashcards (id, user_id, deck_id, class_id, card_type, front, back, 
                             cloze_text, cloze_index, difficulty, last_reviewed, review_count,
                             correct_count, incorrect_count, ease_factor, interval_days,
                             maturity_level, created_at, updated_at)
      VALUES (:id, :userId, :deckId, :classId, :cardType, :front, :back,
              :clozeText, :clozeIndex, :difficulty, :lastReviewed, :reviewCount,
              :correctCount, :incorrectCount, :easeFactor, :intervalDays,
              :maturityLevel, :createdAt, :updatedAt)
    `;
    
    await executeQuery(sql, {
      id,
      userId: flashcard.userId,
      deckId: flashcard.deckId || null,
      classId: flashcard.classId || null,
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
      intervalDays: flashcard.interval || 0,
      maturityLevel: flashcard.maturityLevel || 'new',
      createdAt,
      updatedAt
    });
    
    console.log(' Flashcard created successfully');
    
    return {
      id,
      userId: flashcard.userId,
      deckId: flashcard.deckId || null,
      classId: flashcard.classId || null,
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
      createdAt,
      updatedAt
    };
  }

  async updateFlashcard(id: string, flashcard: Partial<InsertFlashcard>): Promise<Flashcard | undefined> {
    await this.initialize();
    console.log(' Updating flashcard:', id, flashcard);
    
    const setParts = [];
    const params: any = { id };
    
    if (flashcard.front !== undefined) {
      setParts.push('front = :front');
      params.front = flashcard.front;
    }
    if (flashcard.back !== undefined) {
      setParts.push('back = :back');
      params.back = flashcard.back;
    }
    if (flashcard.difficulty !== undefined) {
      setParts.push('difficulty = :difficulty');
      params.difficulty = flashcard.difficulty;
    }
    if (flashcard.lastReviewed !== undefined) {
      setParts.push('last_reviewed = :lastReviewed');
      params.lastReviewed = flashcard.lastReviewed;
    }
    if (flashcard.reviewCount !== undefined) {
      setParts.push('review_count = :reviewCount');
      params.reviewCount = flashcard.reviewCount;
    }
    if (flashcard.classId !== undefined) {
      setParts.push('class_id = :classId');
      params.classId = flashcard.classId;
    }
    
    if (setParts.length === 0) {
      console.log(' No fields to update');
      return undefined;
    }
    
    const sql = `UPDATE flashcards SET ${setParts.join(', ')} WHERE id = :id`;
    await executeQuery(sql, params);
    
    // Return updated flashcard
    const result = await executeQuery('SELECT * FROM flashcards WHERE id = :id', { id });
    if (!result.rows || result.rows.length === 0) {
      console.log(' Flashcard not found after update');
      return undefined;
    }
    
    const row = result.rows[0] as any;
    console.log(' Flashcard updated successfully');
    
    return {
      id: row.ID,
      userId: row.USER_ID,
      deckId: row.DECK_ID,
      classId: row.CLASS_ID,
      cardType: row.CARD_TYPE || 'basic',
      front: row.FRONT,
      back: row.BACK,
      clozeText: row.CLOZE_TEXT,
      clozeIndex: row.CLOZE_INDEX,
      difficulty: row.DIFFICULTY,
      lastReviewed: row.LAST_REVIEWED,
      reviewCount: row.REVIEW_COUNT || 0,
      correctCount: row.CORRECT_COUNT || 0,
      incorrectCount: row.INCORRECT_COUNT || 0,
      easeFactor: row.EASE_FACTOR || 250,
      interval: row.INTERVAL_DAYS || 0,
      maturityLevel: row.MATURITY_LEVEL || 'new',
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    };
  }

  async deleteFlashcard(id: string): Promise<boolean> {
    await this.initialize();
    console.log(' Deleting flashcard:', id);
    
    const result = await executeQuery('DELETE FROM flashcards WHERE id = :id', { id });
    const success = Boolean(result.rowsAffected && result.rowsAffected > 0);
    
    if (success) {
      console.log(' Flashcard deleted successfully');
    } else {
      console.log(' Flashcard not found');
    }
    
    return success;
  }

  // Flashcard Deck methods
  async getDecksByUserId(userId: string): Promise<FlashcardDeck[]> {
    await this.initialize();
    console.log(' Fetching decks for user:', userId);
    
    const result = await executeQuery(
      'SELECT * FROM flashcard_decks WHERE user_id = :userId ORDER BY sort_order, created_at',
      { userId }
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log(' No decks found for user:', userId);
      return [];
    }
    
    console.log(' Found decks:', result.rows.length);
    
    return result.rows.map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      name: row.NAME,
      description: row.DESCRIPTION,
      parentDeckId: row.PARENT_DECK_ID,
      color: row.COLOR,
      sortOrder: row.SORT_ORDER,
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    }));
  }

  async createDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    const updatedAt = new Date();
    
    console.log(' Creating deck:', { id, ...deck });
    
    const sql = `
      INSERT INTO flashcard_decks (id, user_id, name, description, parent_deck_id, color, sort_order, created_at, updated_at)
      VALUES (:id, :userId, :name, :description, :parentDeckId, :color, :sortOrder, :createdAt, :updatedAt)
    `;
    
    await executeQuery(sql, {
      id,
      userId: deck.userId,
      name: deck.name,
      description: deck.description || null,
      parentDeckId: deck.parentDeckId || null,
      color: deck.color || '#3b82f6',
      sortOrder: deck.sortOrder || 0,
      createdAt,
      updatedAt
    });
    
    console.log(' Deck created successfully');
    
    return {
      id,
      userId: deck.userId,
      name: deck.name,
      description: deck.description || null,
      parentDeckId: deck.parentDeckId || null,
      color: deck.color || '#3b82f6',
      sortOrder: deck.sortOrder || 0,
      createdAt,
      updatedAt
    };
  }

  async updateDeck(id: string, deck: Partial<InsertFlashcardDeck>): Promise<FlashcardDeck | undefined> {
    await this.initialize();
    console.log(' Updating deck:', id, deck);
    
    const setParts = [];
    const params: any = { id };
    
    if (deck.name !== undefined) {
      setParts.push('name = :name');
      params.name = deck.name;
    }
    if (deck.description !== undefined) {
      setParts.push('description = :description');
      params.description = deck.description;
    }
    if (deck.parentDeckId !== undefined) {
      setParts.push('parent_deck_id = :parentDeckId');
      params.parentDeckId = deck.parentDeckId;
    }
    if (deck.color !== undefined) {
      setParts.push('color = :color');
      params.color = deck.color;
    }
    if (deck.sortOrder !== undefined) {
      setParts.push('sort_order = :sortOrder');
      params.sortOrder = deck.sortOrder;
    }
    
    if (setParts.length === 0) {
      console.log(' No fields to update');
      return undefined;
    }
    
    setParts.push('updated_at = :updatedAt');
    params.updatedAt = new Date();
    
    const sql = `UPDATE flashcard_decks SET ${setParts.join(', ')} WHERE id = :id`;
    await executeQuery(sql, params);
    
    const result = await executeQuery('SELECT * FROM flashcard_decks WHERE id = :id', { id });
    if (!result.rows || result.rows.length === 0) {
      console.log(' Deck not found after update');
      return undefined;
    }
    
    const row = result.rows[0] as any;
    console.log(' Deck updated successfully');
    
    return {
      id: row.ID,
      userId: row.USER_ID,
      name: row.NAME,
      description: row.DESCRIPTION,
      parentDeckId: row.PARENT_DECK_ID,
      color: row.COLOR,
      sortOrder: row.SORT_ORDER,
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    };
  }

  async deleteDeck(id: string): Promise<boolean> {
    await this.initialize();
    console.log(' Deleting deck:', id);
    
    const result = await executeQuery('DELETE FROM flashcard_decks WHERE id = :id', { id });
    const success = Boolean(result.rowsAffected && result.rowsAffected > 0);
    
    if (success) {
      console.log(' Deck deleted successfully');
    } else {
      console.log(' Deck not found');
    }
    
    return success;
  }

  async getFlashcardsByDeck(deckId: string): Promise<Flashcard[]> {
    await this.initialize();
    console.log(' Fetching flashcards for deck:', deckId);
    
    const result = await executeQuery(
      'SELECT * FROM flashcards WHERE deck_id = :deckId ORDER BY created_at DESC',
      { deckId }
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log(' No flashcards found for deck:', deckId);
      return [];
    }
    
    console.log(' Found flashcards:', result.rows.length);
    
    return result.rows.map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      deckId: row.DECK_ID,
      classId: row.CLASS_ID,
      cardType: row.CARD_TYPE || 'basic',
      front: row.FRONT,
      back: row.BACK,
      clozeText: row.CLOZE_TEXT,
      clozeIndex: row.CLOZE_INDEX,
      difficulty: row.DIFFICULTY,
      lastReviewed: row.LAST_REVIEWED,
      reviewCount: row.REVIEW_COUNT || 0,
      correctCount: row.CORRECT_COUNT || 0,
      incorrectCount: row.INCORRECT_COUNT || 0,
      easeFactor: row.EASE_FACTOR || 250,
      interval: row.INTERVAL_DAYS || 0,
      maturityLevel: row.MATURITY_LEVEL || 'new',
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    }));
  }

  // Flashcard Review methods
  async recordReview(review: InsertFlashcardReview): Promise<FlashcardReview> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    
    console.log(' Recording flashcard review:', { id, ...review });
    
    const sql = `
      INSERT INTO flashcard_reviews (id, user_id, flashcard_id, deck_id, was_correct, 
                                     time_spent, review_date, ease_factor, interval_days, created_at)
      VALUES (:id, :userId, :flashcardId, :deckId, :wasCorrect, 
              :timeSpent, :reviewDate, :easeFactor, :intervalDays, :createdAt)
    `;
    
    await executeQuery(sql, {
      id,
      userId: review.userId,
      flashcardId: review.flashcardId,
      deckId: review.deckId || null,
      wasCorrect: review.wasCorrect ? 1 : 0,
      timeSpent: review.timeSpent || null,
      reviewDate: review.reviewDate || createdAt,
      easeFactor: review.easeFactor || null,
      intervalDays: review.interval || null,
      createdAt
    });
    
    console.log(' Review recorded successfully');
    
    return {
      id,
      userId: review.userId,
      flashcardId: review.flashcardId,
      deckId: review.deckId || null,
      wasCorrect: review.wasCorrect,
      timeSpent: review.timeSpent || null,
      reviewDate: review.reviewDate || createdAt,
      easeFactor: review.easeFactor || null,
      interval: review.interval || null,
      createdAt
    };
  }

  async getDailyStats(userId: string, days: number = 30): Promise<any[]> {
    await this.initialize();
    console.log(' Fetching daily stats for user:', userId, 'days:', days);
    
    const sql = `
      SELECT * FROM v_daily_review_stats 
      WHERE user_id = :userId 
      AND review_day >= SYSDATE - :days
      ORDER BY review_day DESC
    `;
    
    const result = await executeQuery(sql, { userId, days });
    
    if (!result.rows || result.rows.length === 0) {
      console.log(' No daily stats found');
      return [];
    }
    
    console.log(' Found daily stats:', result.rows.length);
    
    return result.rows.map((row: any) => ({
      userId: row.USER_ID,
      reviewDay: row.REVIEW_DAY,
      totalReviews: row.TOTAL_REVIEWS,
      correctReviews: row.CORRECT_REVIEWS,
      incorrectReviews: row.INCORRECT_REVIEWS,
      successRate: row.SUCCESS_RATE,
      avgTimeSpent: row.AVG_TIME_SPENT,
      uniqueCardsReviewed: row.UNIQUE_CARDS_REVIEWED
    }));
  }

  async getDeckStats(userId: string): Promise<any[]> {
    await this.initialize();
    console.log(' Fetching deck stats for user:', userId);
    
    const sql = `SELECT * FROM v_deck_stats WHERE user_id = :userId`;
    
    const result = await executeQuery(sql, { userId });
    
    if (!result.rows || result.rows.length === 0) {
      console.log(' No deck stats found');
      return [];
    }
    
    console.log(' Found deck stats:', result.rows.length);
    
    return result.rows.map((row: any) => ({
      deckId: row.DECK_ID,
      userId: row.USER_ID,
      deckName: row.DECK_NAME,
      totalCards: row.TOTAL_CARDS,
      newCards: row.NEW_CARDS,
      learningCards: row.LEARNING_CARDS,
      youngCards: row.YOUNG_CARDS,
      matureCards: row.MATURE_CARDS,
      avgEaseFactor: row.AVG_EASE_FACTOR,
      avgInterval: row.AVG_INTERVAL
    }));
  }

  async getRetentionCurve(userId: string, deckId?: string): Promise<any[]> {
    await this.initialize();
    console.log(' Fetching retention curve for user:', userId, 'deck:', deckId);
    
    let sql = `SELECT * FROM v_retention_curve WHERE user_id = :userId`;
    const params: any = { userId };
    
    if (deckId) {
      sql += ' AND deck_id = :deckId';
      params.deckId = deckId;
    }
    
    sql += ' ORDER BY days_ago';
    
    const result = await executeQuery(sql, params);
    
    if (!result.rows || result.rows.length === 0) {
      console.log(' No retention curve data found');
      return [];
    }
    
    console.log(' Found retention curve data:', result.rows.length);
    
    return result.rows.map((row: any) => ({
      userId: row.USER_ID,
      deckId: row.DECK_ID,
      daysAgo: row.DAYS_AGO,
      reviewsCount: row.REVIEWS_COUNT,
      correctCount: row.CORRECT_COUNT,
      retentionRate: row.RETENTION_RATE
    }));
  }
  
  // Mood Entry methods
  async getMoodEntriesByUserId(userId: string): Promise<MoodEntry[]> {
    await this.initialize();
    console.log(' Fetching mood entries for user:', userId);
    
    const result = await executeQuery(
      'SELECT * FROM mood_entries WHERE user_id = :userId ORDER BY created_at DESC',
      { userId }
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log(' No mood entries found for user:', userId);
      return [];
    }
    
    console.log(' Found mood entries:', result.rows.length);
    
    return result.rows.map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      mood: row.MOOD,
      notes: row.NOTES,
      date: row.DATE_ENTRY,
      createdAt: row.CREATED_AT
    }));
  }

  async createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    const date = new Date();
    
    console.log(' Creating mood entry:', { id, ...entry });
    
    const sql = `
      INSERT INTO mood_entries (id, user_id, mood, notes, date_entry, created_at)
      VALUES (:id, :userId, :mood, :notes, :dateValue, :createdAt)
    `;
    
    await executeQuery(sql, {
      id,
      userId: entry.userId,
      mood: entry.mood,
      notes: entry.notes || null,
      dateValue: date,
      createdAt
    });
    
    console.log(' Mood entry created successfully');
    
    return {
      id,
      userId: entry.userId,
      mood: entry.mood,
      notes: entry.notes || null,
      date,
      createdAt
    };
  }
  
  // Journal Entry methods
  async getJournalEntriesByUserId(userId: string): Promise<JournalEntry[]> {
    await this.initialize();
    console.log(' Fetching journal entries for user:', userId);
    
    const result = await executeQuery(
      'SELECT * FROM journal_entries WHERE user_id = :userId ORDER BY created_at DESC',
      { userId }
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log(' No journal entries found for user:', userId);
      return [];
    }
    
    console.log(' Found journal entries:', result.rows.length);
    
    return result.rows.map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      content: row.CONTENT,
      date: row.DATE_ENTRY,
      createdAt: row.CREATED_AT
    }));
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    const date = new Date();
    
    console.log(' Creating journal entry:', { id, ...entry });
    
    const sql = `
      INSERT INTO journal_entries (id, user_id, content, date_entry, created_at)
      VALUES (:id, :userId, :content, :dateValue, :createdAt)
    `;
    
    await executeQuery(sql, {
      id,
      userId: entry.userId,
      content: entry.content,
      dateValue: date,
      createdAt
    });
    
    console.log(' Journal entry created successfully');
    
    return {
      id,
      userId: entry.userId,
      content: entry.content,
      date,
      createdAt
    };
  }

  async updateJournalEntry(id: string, entry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    await this.initialize();
    console.log(' Updating journal entry:', id, entry);
    
    const setParts = [];
    const params: any = { id };
    
    if (entry.content !== undefined) {
      setParts.push('content = :content');
      params.content = entry.content;
    }
    if (entry.date !== undefined) {
      setParts.push('date = :date');
      params.date = entry.date;
    }
    
    if (setParts.length === 0) {
      console.log(' No fields to update');
      return undefined;
    }
    
    const sql = `UPDATE journal_entries SET ${setParts.join(', ')} WHERE id = :id`;
    await executeQuery(sql, params);
    
    // Return updated journal entry
    const result = await executeQuery('SELECT * FROM journal_entries WHERE id = :id', { id });
    if (!result.rows || result.rows.length === 0) {
      console.log(' Journal entry not found after update');
      return undefined;
    }
    
    const row = result.rows[0] as any;
    console.log(' Journal entry updated successfully');
    
    return {
      id: row.ID,
      userId: row.USER_ID,
      content: row.CONTENT,
      date: row.DATE_ENTRY,
      createdAt: row.CREATED_AT
    };
  }

  async deleteJournalEntry(id: string): Promise<boolean> {
    await this.initialize();
    console.log(' Deleting journal entry:', id);
    
    const result = await executeQuery('DELETE FROM journal_entries WHERE id = :id', { id });
    const success = Boolean(result.rowsAffected && result.rowsAffected > 0);
    
    if (success) {
      console.log(' Journal entry deleted successfully');
    } else {
      console.log(' Journal entry not found');
    }
    
    return success;
  }
  
  // Pomodoro Session methods
  async getPomodoroSessionsByUserId(userId: string): Promise<PomodoroSession[]> {
    await this.initialize();
    console.log(' Fetching pomodoro sessions for user:', userId);
    
    const result = await executeQuery(
      'SELECT * FROM pomodoro_sessions WHERE user_id = :userId ORDER BY completed_at DESC',
      { userId }
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log(' No pomodoro sessions found for user:', userId);
      return [];
    }
    
    console.log(' Found pomodoro sessions:', result.rows.length);
    
    return result.rows.map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      duration: row.DURATION,
      type: row.TYPE,
      completedAt: row.COMPLETED_AT
    }));
  }

  async createPomodoroSession(session: InsertPomodoroSession): Promise<PomodoroSession> {
    await this.initialize();
    const id = randomUUID();
    const completedAt = new Date();
    
    console.log(' Creating pomodoro session:', { id, ...session });
    
    const sql = `
      INSERT INTO pomodoro_sessions (id, user_id, duration, type, completed_at)
      VALUES (:id, :userId, :duration, :type, :completedAt)
    `;
    
    await executeQuery(sql, {
      id,
      userId: session.userId,
      duration: session.duration,
      type: session.type || 'work',
      completedAt
    });
    
    console.log(' Pomodoro session created successfully');
    
    return {
      id,
      userId: session.userId,
      duration: session.duration,
      type: session.type || 'work',
      completedAt
    };
  }
  
  // Habit methods
  async getHabitsByUserId(userId: string): Promise<Habit[]> {
    await this.initialize();
    const result = await executeQuery(
      'SELECT * FROM habits WHERE user_id = :userId ORDER BY created_at DESC',
      { userId }
    );

    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      name: row.NAME,
      description: row.DESCRIPTION,
      category: row.CATEGORY,
      frequency: row.FREQUENCY,
      targetCount: row.TARGET_COUNT,
      color: row.COLOR,
      icon: row.ICON,
      streak: row.STREAK,
      completions: row.COMPLETIONS,
      createdAt: row.CREATED_AT,
      isActive: row.IS_ACTIVE === 1 || row.IS_ACTIVE === true
    }));
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();

    await executeQuery(
      `INSERT INTO habits (id, user_id, name, description, category, frequency, target_count, color, icon, streak, completions, created_at, is_active)
       VALUES (:id, :userId, :name, :description, :category, :frequency, :targetCount, :color, :icon, :streak, :completions, :createdAt, :isActive)`,
      {
        id,
        userId: habit.userId,
        name: habit.name,
        description: habit.description || null,
        category: habit.category || null,
        frequency: habit.frequency || 'daily',
        targetCount: habit.targetCount || 1,
        color: habit.color || null,
        icon: habit.icon || null,
        streak: habit.streak || 0,
        completions: habit.completions ? JSON.stringify(habit.completions) : '{}',
        createdAt,
        isActive: habit.isActive === false ? 0 : 1,
      }
    );

    return {
      id,
      userId: habit.userId,
      name: habit.name,
      description: habit.description || null,
      category: habit.category || null,
      frequency: habit.frequency || 'daily',
      targetCount: habit.targetCount || 1,
      color: habit.color || null,
      icon: habit.icon || null,
      streak: habit.streak || 0,
      completions: habit.completions || {},
      createdAt,
      isActive: habit.isActive !== false,
    };
  }

  async updateHabit(id: string, habit: Partial<InsertHabit>): Promise<Habit | undefined> {
    await this.initialize();

    const setParts: string[] = [];
    const params: any = { id };

    if (habit.name !== undefined) { setParts.push('name = :name'); params.name = habit.name; }
    if (habit.description !== undefined) { setParts.push('description = :description'); params.description = habit.description; }
    if (habit.category !== undefined) { setParts.push('category = :category'); params.category = habit.category; }
    if (habit.frequency !== undefined) { setParts.push('frequency = :frequency'); params.frequency = habit.frequency; }
    if (habit.targetCount !== undefined) { setParts.push('target_count = :targetCount'); params.targetCount = habit.targetCount; }
    if (habit.color !== undefined) { setParts.push('color = :color'); params.color = habit.color; }
    if (habit.icon !== undefined) { setParts.push('icon = :icon'); params.icon = habit.icon; }
    if (habit.streak !== undefined) { setParts.push('streak = :streak'); params.streak = habit.streak; }
    if (habit.completions !== undefined) { setParts.push('completions = :completions'); params.completions = JSON.stringify(habit.completions); }
    if (habit.isActive !== undefined) { setParts.push('is_active = :isActive'); params.isActive = habit.isActive ? 1 : 0; }

    if (setParts.length === 0) {
      const existing = await executeQuery('SELECT * FROM habits WHERE id = :id', { id });
      if (!existing.rows || existing.rows.length === 0) return undefined;
      const row: any = existing.rows[0];
      return {
        id: row.ID,
        userId: row.USER_ID,
        name: row.NAME,
        description: row.DESCRIPTION,
        category: row.CATEGORY,
        frequency: row.FREQUENCY,
        targetCount: row.TARGET_COUNT,
        color: row.COLOR,
        icon: row.ICON,
        streak: row.STREAK,
        completions: row.COMPRETIONS,
        createdAt: row.CREATED_AT,
        isActive: row.IS_ACTIVE === 1 || row.IS_ACTIVE === true,
      };
    }

    await executeQuery(
      `UPDATE habits SET ${setParts.join(', ')} WHERE id = :id`,
      params
    );

    const result = await executeQuery('SELECT * FROM habits WHERE id = :id', { id });
    if (!result.rows || result.rows.length === 0) return undefined;
    const row: any = result.rows[0];

    return {
      id: row.ID,
      userId: row.USER_ID,
      name: row.NAME,
      description: row.DESCRIPTION,
      category: row.category,
      frequency: row.FREQUENCY,
      targetCount: row.TARGET_COUNT,
      color: row.COLOR,
      icon: row.ICON,
      streak: row.STREAK,
      completions: row.COMPLETIONS,
      createdAt: row.CREATED_AT,
      isActive: row.IS_ACTIVE === 1 || row.IS_ACTIVE === true,
    };
  }

  async deleteHabit(id: string): Promise<boolean> {
    await this.initialize();
    const result = await executeQuery('DELETE FROM habits WHERE id = :id', { id });
    return Boolean(result.rowsAffected && result.rowsAffected > 0);
  }
  
  // AI Summary methods
  async getAiSummariesByUserId(userId: string): Promise<AiSummary[]> {
    await this.initialize();
    console.log(' Fetching AI summaries for user:', userId);
    
    const result = await executeQuery(
      'SELECT * FROM ai_summaries WHERE user_id = :userId ORDER BY created_at DESC',
      { userId }
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log(' No AI summaries found for user:', userId);
      return [];
    }
    
    console.log(' Found AI summaries:', result.rows.length);
    
    return result.rows.map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      title: row.TITLE,
      originalContent: row.ORIGINAL_CONTENT,
      summary: row.SUMMARY_CONTENT,
      summaryType: row.SUMMARY_TYPE,
      fileType: row.FILE_TYPE,
      createdAt: row.CREATED_AT
    }));
  }

  async createAiSummary(summary: InsertAiSummary): Promise<AiSummary> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    
    console.log(' Creating AI summary:', { id, title: summary.title });
    
    const sql = `
      INSERT INTO ai_summaries (id, user_id, title, original_content, summary_content, 
                               summary_type, file_type, created_at)
      VALUES (:id, :userId, :title, :originalContent, :summary,
              :summaryType, :fileType, :createdAt)
    `;
    
    await executeQuery(sql, {
      id,
      userId: summary.userId,
      title: summary.title,
      originalContent: summary.originalContent || null,
      summary: summary.summary,
      summaryType: summary.summaryType || 'quick',
      fileType: summary.fileType || null,
      createdAt
    });
    
    console.log(' AI summary created successfully');
    
    return {
      id,
      userId: summary.userId,
      title: summary.title,
      originalContent: summary.originalContent || null,
      summary: summary.summary,
      summaryType: summary.summaryType || 'quick',
      fileType: summary.fileType || null,
      createdAt
    };
  }

  async deleteAiSummary(id: string): Promise<boolean> {
    await this.initialize();
    console.log(' Deleting AI summary:', id);
    
    const result = await executeQuery('DELETE FROM ai_summaries WHERE id = :id', { id });
    const success = Boolean(result.rowsAffected && result.rowsAffected > 0);
    
    if (success) {
      console.log(' AI summary deleted successfully');
    } else {
      console.log(' AI summary not found');
    }
    
    return success;
  }
  
  // ========== TODO BOARD METHODS ==========
  
  // Board methods
  async getBoardsByUserId(userId: string): Promise<Board[]> {
    await this.initialize();
    const result = await executeQuery(
      'SELECT * FROM boards WHERE user_id = :userId AND is_archived = 0 ORDER BY position ASC',
      { userId }
    );
    
    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      title: row.TITLE,
      background: row.BACKGROUND,
      position: row.POSITION,
      isArchived: Boolean(row.IS_ARCHIVED),
      isFavorited: Boolean(row.IS_FAVORITED),
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    }));
  }

  async getBoard(id: string): Promise<Board | undefined> {
    await this.initialize();
    const result = await executeQuery('SELECT * FROM boards WHERE id = :id', { id });
    
    if (!result.rows || result.rows.length === 0) return undefined;
    
    const row: any = result.rows[0];
    return {
      id: row.ID,
      userId: row.USER_ID,
      title: row.TITLE,
      background: row.BACKGROUND,
      position: row.POSITION,
      isArchived: Boolean(row.IS_ARCHIVED),
      isFavorited: Boolean(row.IS_FAVORITED),
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    };
  }

  async createBoard(board: InsertBoard): Promise<Board> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    const updatedAt = new Date();
    
    await executeQuery(
      `INSERT INTO boards (id, user_id, title, background, position, is_archived, is_favorited, created_at, updated_at)
       VALUES (:id, :userId, :title, :background, :position, :isArchived, :isFavorited, :createdAt, :updatedAt)`,
      {
        id,
        userId: board.userId,
        title: board.title,
        background: board.background || null,
        position: board.position || 0,
        isArchived: board.isArchived ? 1 : 0,
        isFavorited: board.isFavorited ? 1 : 0,
        createdAt,
        updatedAt
      }
    );
    
    return {
      id,
      userId: board.userId,
      title: board.title,
      background: board.background || null,
      position: board.position || 0,
      isArchived: board.isArchived || false,
      isFavorited: board.isFavorited || false,
      createdAt,
      updatedAt
    };
  }

  async updateBoard(id: string, board: Partial<InsertBoard>): Promise<Board | undefined> {
    await this.initialize();
    const updatedAt = new Date();
    
    const updates: string[] = [];
    const params: any = { id, updatedAt };
    
    if (board.title !== undefined) {
      updates.push('title = :title');
      params.title = board.title;
    }
    if (board.background !== undefined) {
      updates.push('background = :background');
      params.background = board.background;
    }
    if (board.position !== undefined) {
      updates.push('position = :position');
      params.position = board.position;
    }
    if (board.isArchived !== undefined) {
      updates.push('is_archived = :isArchived');
      params.isArchived = board.isArchived ? 1 : 0;
    }
    if (board.isFavorited !== undefined) {
      updates.push('is_favorited = :isFavorited');
      params.isFavorited = board.isFavorited ? 1 : 0;
    }
    
    if (updates.length === 0) return this.getBoard(id);
    
    updates.push('updated_at = :updatedAt');
    
    await executeQuery(
      `UPDATE boards SET ${updates.join(', ')} WHERE id = :id`,
      params
    );
    
    return this.getBoard(id);
  }

  async deleteBoard(id: string): Promise<boolean> {
    await this.initialize();
    const result = await executeQuery('DELETE FROM boards WHERE id = :id', { id });
    return Boolean(result.rowsAffected && result.rowsAffected > 0);
  }

  // List methods
  async getListsByBoardId(boardId: string): Promise<TodoList[]> {
    await this.initialize();
    const result = await executeQuery(
      'SELECT * FROM todo_lists WHERE board_id = :boardId AND is_archived = 0 ORDER BY position ASC',
      { boardId }
    );
    
    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      boardId: row.BOARD_ID,
      title: row.TITLE,
      position: row.POSITION,
      isArchived: Boolean(row.IS_ARCHIVED),
      createdAt: row.CREATED_AT
    }));
  }

  async createList(list: InsertTodoList): Promise<TodoList> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    
    await executeQuery(
      `INSERT INTO todo_lists (id, board_id, title, position, is_archived, created_at)
       VALUES (:id, :boardId, :title, :position, :isArchived, :createdAt)`,
      {
        id,
        boardId: list.boardId,
        title: list.title,
        position: list.position || 0,
        isArchived: list.isArchived ? 1 : 0,
        createdAt
      }
    );
    
    return {
      id,
      boardId: list.boardId,
      title: list.title,
      position: list.position || 0,
      isArchived: list.isArchived || false,
      createdAt
    };
  }

  async updateList(id: string, list: Partial<InsertTodoList>): Promise<TodoList | undefined> {
    await this.initialize();
    
    const updates: string[] = [];
    const params: any = { id };
    
    if (list.title !== undefined) {
      updates.push('title = :title');
      params.title = list.title;
    }
    if (list.position !== undefined) {
      updates.push('position = :position');
      params.position = list.position;
    }
    if (list.isArchived !== undefined) {
      updates.push('is_archived = :isArchived');
      params.isArchived = list.isArchived ? 1 : 0;
    }
    
    if (updates.length === 0) {
      const result = await executeQuery('SELECT * FROM todo_lists WHERE id = :id', { id });
      if (!result.rows || result.rows.length === 0) return undefined;
      const row: any = result.rows[0];
      return {
        id: row.ID,
        boardId: row.BOARD_ID,
        title: row.TITLE,
        position: row.POSITION,
        isArchived: Boolean(row.IS_ARCHIVED),
        createdAt: row.CREATED_AT
      };
    }
    
    await executeQuery(
      `UPDATE todo_lists SET ${updates.join(', ')} WHERE id = :id`,
      params
    );
    
    const result = await executeQuery('SELECT * FROM todo_lists WHERE id = :id', { id });
    if (!result.rows || result.rows.length === 0) return undefined;
    
    const row: any = result.rows[0];
    return {
      id: row.ID,
      boardId: row.BOARD_ID,
      title: row.TITLE,
      position: row.POSITION,
      isArchived: Boolean(row.IS_ARCHIVED),
      createdAt: row.CREATED_AT
    };
  }

  async deleteList(id: string): Promise<boolean> {
    await this.initialize();
    const result = await executeQuery('DELETE FROM todo_lists WHERE id = :id', { id });
    return Boolean(result.rowsAffected && result.rowsAffected > 0);
  }

  // Card methods
  async getCardsByUserId(userId: string): Promise<Card[]> {
    await this.initialize();
    const result = await executeQuery(
      'SELECT * FROM cards WHERE user_id = :userId ORDER BY position ASC',
      { userId }
    );
    
    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      listId: row.LIST_ID,
      title: row.TITLE,
      description: row.DESCRIPTION,
      position: row.POSITION,
      dueDate: row.DUE_DATE,
      isCompleted: Boolean(row.IS_COMPLETED),
      isArchived: Boolean(row.IS_ARCHIVED),
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    }));
  }

  async getCardsByListId(listId: string): Promise<Card[]> {
    await this.initialize();
    const result = await executeQuery(
      'SELECT * FROM cards WHERE list_id = :listId ORDER BY position ASC',
      { listId }
    );
    
    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      listId: row.LIST_ID,
      title: row.TITLE,
      description: row.DESCRIPTION,
      position: row.POSITION,
      dueDate: row.DUE_DATE,
      isCompleted: Boolean(row.IS_COMPLETED),
      isArchived: Boolean(row.IS_ARCHIVED),
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    }));
  }

  async getInboxCards(userId: string): Promise<Card[]> {
    await this.initialize();
    const result = await executeQuery(
      'SELECT * FROM cards WHERE user_id = :userId AND list_id IS NULL ORDER BY position ASC',
      { userId }
    );
    
    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      listId: row.LIST_ID,
      title: row.TITLE,
      description: row.DESCRIPTION,
      position: row.POSITION,
      dueDate: row.DUE_DATE,
      isCompleted: Boolean(row.IS_COMPLETED),
      isArchived: Boolean(row.IS_ARCHIVED),
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    }));
  }

  async getCard(id: string): Promise<Card | undefined> {
    await this.initialize();
    const result = await executeQuery('SELECT * FROM cards WHERE id = :id', { id });
    
    if (!result.rows || result.rows.length === 0) return undefined;
    
    const row: any = result.rows[0];
    return {
      id: row.ID,
      userId: row.USER_ID,
      listId: row.LIST_ID,
      title: row.TITLE,
      description: row.DESCRIPTION,
      position: row.POSITION,
      dueDate: row.DUE_DATE,
      isCompleted: Boolean(row.IS_COMPLETED),
      isArchived: Boolean(row.IS_ARCHIVED),
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    };
  }

  async createCard(card: InsertCard): Promise<Card> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    const updatedAt = new Date();
    
    await executeQuery(
      `INSERT INTO cards (id, user_id, list_id, title, description, position, due_date, is_completed, is_archived, created_at, updated_at)
       VALUES (:id, :userId, :listId, :title, :description, :position, :dueDate, :isCompleted, :isArchived, :createdAt, :updatedAt)`,
      {
        id,
        userId: card.userId,
        listId: card.listId || null,
        title: card.title,
        description: card.description || null,
        position: card.position || 0,
        dueDate: card.dueDate || null,
        isCompleted: card.isCompleted ? 1 : 0,
        isArchived: card.isArchived ? 1 : 0,
        createdAt,
        updatedAt
      }
    );
    
    return {
      id,
      userId: card.userId,
      listId: card.listId || null,
      title: card.title,
      description: card.description || null,
      position: card.position || 0,
      dueDate: card.dueDate || null,
      isCompleted: card.isCompleted || false,
      isArchived: card.isArchived || false,
      createdAt,
      updatedAt
    };
  }

  async updateCard(id: string, card: Partial<InsertCard>): Promise<Card | undefined> {
    await this.initialize();
    const updatedAt = new Date();
    
    const updates: string[] = [];
    const params: any = { id, updatedAt };
    
    if (card.listId !== undefined) {
      updates.push('list_id = :listId');
      params.listId = card.listId;
    }
    if (card.title !== undefined) {
      updates.push('title = :title');
      params.title = card.title;
    }
    if (card.description !== undefined) {
      updates.push('description = :description');
      params.description = card.description;
    }
    if (card.dueDate !== undefined) {
      updates.push('due_date = :dueDate');
      params.dueDate = card.dueDate;
    }
    if (card.isCompleted !== undefined) {
      updates.push('is_completed = :isCompleted');
      params.isCompleted = card.isCompleted ? 1 : 0;
    }
    if (card.position !== undefined) {
      updates.push('position = :position');
      params.position = card.position;
    }
    
    if (updates.length === 0) return this.getCard(id);
    
    updates.push('updated_at = :updatedAt');
    
    await executeQuery(
      `UPDATE cards SET ${updates.join(', ')} WHERE id = :id`,
      params
    );
    
    return this.getCard(id);
  }

  async deleteCard(id: string): Promise<boolean> {
    await this.initialize();
    const result = await executeQuery('DELETE FROM cards WHERE id = :id', { id });
    return Boolean(result.rowsAffected && result.rowsAffected > 0);
  }

  // Checklist methods
  async getChecklistsByCardId(cardId: string): Promise<Checklist[]> {
    await this.initialize();
    const result = await executeQuery(
      'SELECT * FROM checklists WHERE card_id = :cardId ORDER BY position ASC',
      { cardId }
    );
    
    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      cardId: row.CARD_ID,
      title: row.TITLE,
      isChecked: Boolean(row.IS_CHECKED),
      position: row.POSITION,
      createdAt: row.CREATED_AT
    }));
  }

  async createChecklist(checklist: InsertChecklist): Promise<Checklist> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    
    await executeQuery(
      `INSERT INTO checklists (id, card_id, title, is_checked, position, created_at)
       VALUES (:id, :cardId, :title, :isChecked, :position, :createdAt)`,
      {
        id,
        cardId: checklist.cardId,
        title: checklist.title,
        isChecked: checklist.isChecked ? 1 : 0,
        position: checklist.position || 0,
        createdAt
      }
    );
    
    return {
      id,
      cardId: checklist.cardId,
      title: checklist.title,
      isChecked: checklist.isChecked || false,
      position: checklist.position || 0,
      createdAt
    };
  }

  async updateChecklist(id: string, checklist: Partial<InsertChecklist>): Promise<Checklist | undefined> {
    await this.initialize();
    
    const updates: string[] = [];
    const params: any = { id };
    
    if (checklist.title !== undefined) {
      updates.push('title = :title');
      params.title = checklist.title;
    }
    if (checklist.isChecked !== undefined) {
      updates.push('is_checked = :isChecked');
      params.isChecked = checklist.isChecked ? 1 : 0;
    }
    if (checklist.position !== undefined) {
      updates.push('position = :position');
      params.position = checklist.position;
    }
    
    if (updates.length === 0) {
      const result = await executeQuery('SELECT * FROM checklists WHERE id = :id', { id });
      if (!result.rows || result.rows.length === 0) return undefined;
      const row: any = result.rows[0];
      return {
        id: row.ID,
        cardId: row.CARD_ID,
        title: row.TITLE,
        isChecked: Boolean(row.IS_CHECKED),
        position: row.POSITION,
        createdAt: row.CREATED_AT
      };
    }
    
    await executeQuery(
      `UPDATE checklists SET ${updates.join(', ')} WHERE id = :id`,
      params
    );
    
    const result = await executeQuery('SELECT * FROM checklists WHERE id = :id', { id });
    if (!result.rows || result.rows.length === 0) return undefined;
    
    const row: any = result.rows[0];
    return {
      id: row.ID,
      cardId: row.CARD_ID,
      title: row.TITLE,
      isChecked: Boolean(row.IS_CHECKED),
      position: row.POSITION,
      createdAt: row.CREATED_AT
    };
  }

  async deleteChecklist(id: string): Promise<boolean> {
    await this.initialize();
    const result = await executeQuery('DELETE FROM checklists WHERE id = :id', { id });
    return Boolean(result.rowsAffected && result.rowsAffected > 0);
  }

  // Label methods
  async getLabelsByUserId(userId: string): Promise<Label[]> {
    await this.initialize();
    const result = await executeQuery(
      'SELECT * FROM labels WHERE user_id = :userId OR user_id = \'SYSTEM\' ORDER BY created_at ASC',
      { userId }
    );
    
    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      name: row.NAME,
      color: row.COLOR,
      createdAt: row.CREATED_AT
    }));
  }

  async createLabel(label: InsertLabel): Promise<Label> {
    await this.initialize();
    const id = randomUUID();
    const createdAt = new Date();
    
    await executeQuery(
      `INSERT INTO labels (id, user_id, name, color, created_at)
       VALUES (:id, :userId, :name, :color, :createdAt)`,
      {
        id,
        userId: label.userId,
        name: label.name,
        color: label.color,
        createdAt
      }
    );
    
    return {
      id,
      userId: label.userId,
      name: label.name,
      color: label.color,
      createdAt
    };
  }

  async updateLabel(id: string, label: Partial<InsertLabel>): Promise<Label | undefined> {
    await this.initialize();
    
    const updates: string[] = [];
    const params: any = { id };
    
    if (label.name !== undefined) {
      updates.push('name = :name');
      params.name = label.name;
    }
    if (label.color !== undefined) {
      updates.push('color = :color');
      params.color = label.color;
    }
    
    if (updates.length === 0) {
      const result = await executeQuery('SELECT * FROM labels WHERE id = :id', { id });
      if (!result.rows || result.rows.length === 0) return undefined;
      const row: any = result.rows[0];
      return {
        id: row.ID,
        userId: row.USER_ID,
        name: row.NAME,
        color: row.COLOR,
        createdAt: row.CREATED_AT
      };
    }
    
    await executeQuery(
      `UPDATE labels SET ${updates.join(', ')} WHERE id = :id`,
      params
    );
    
    const result = await executeQuery('SELECT * FROM labels WHERE id = :id', { id });
    if (!result.rows || result.rows.length === 0) return undefined;
    
    const row: any = result.rows[0];
    return {
      id: row.ID,
      userId: row.USER_ID,
      name: row.NAME,
      color: row.COLOR,
      createdAt: row.CREATED_AT
    };
  }

  async deleteLabel(id: string): Promise<boolean> {
    await this.initialize();
    const result = await executeQuery('DELETE FROM labels WHERE id = :id', { id });
    return Boolean(result.rowsAffected && result.rowsAffected > 0);
  }

  async addLabelToCard(cardId: string, labelId: string): Promise<void> {
    await this.initialize();
    await executeQuery(
      'INSERT INTO card_labels (card_id, label_id) VALUES (:cardId, :labelId)',
      { cardId, labelId }
    );
  }

  async removeLabelFromCard(cardId: string, labelId: string): Promise<void> {
    await this.initialize();
    await executeQuery(
      'DELETE FROM card_labels WHERE card_id = :cardId AND label_id = :labelId',
      { cardId, labelId }
    );
  }

  async getCardLabels(cardId: string): Promise<Label[]> {
    await this.initialize();
    const result = await executeQuery(
      `SELECT l.* FROM labels l
       INNER JOIN card_labels cl ON l.id = cl.label_id
       WHERE cl.card_id = :cardId
       ORDER BY l.created_at ASC`,
      { cardId }
    );
    
    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      name: row.NAME,
      color: row.COLOR,
      createdAt: row.CREATED_AT
    }));
  }

  // Quick Task methods
  async getQuickTasksByUserId(userId: string): Promise<QuickTask[]> {
    await this.ensureOracleAvailable();
    const result = await executeQuery(
      'SELECT * FROM quick_tasks WHERE user_id = :userId ORDER BY created_at ASC',
      { userId }
    );
    
    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      userId: row.USER_ID,
      title: row.TITLE,
      completed: row.COMPLETED === 1,
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    }));
  }

  async createQuickTask(task: InsertQuickTask): Promise<QuickTask> {
    await this.ensureOracleAvailable();
    const id = randomUUID();
    const now = new Date();
    
    await executeQuery(
      `INSERT INTO quick_tasks (id, user_id, title, completed, created_at, updated_at)
       VALUES (:id, :userId, :title, :completed, :createdAt, :updatedAt)`,
      {
        id,
        userId: task.userId,
        title: task.title,
        completed: task.completed ? 1 : 0,
        createdAt: now,
        updatedAt: now
      }
    );
    
    return {
      id,
      userId: task.userId,
      title: task.title,
      completed: task.completed ?? false,
      createdAt: now,
      updatedAt: now
    };
  }

  async updateQuickTask(id: string, task: Partial<InsertQuickTask>): Promise<QuickTask | undefined> {
    await this.ensureOracleAvailable();
    const now = new Date();
    
    const updates: string[] = [];
    const binds: any = { id, updatedAt: now };
    
    if (task.title !== undefined) {
      updates.push('title = :title');
      binds.title = task.title;
    }
    if (task.completed !== undefined) {
      updates.push('completed = :completed');
      binds.completed = task.completed ? 1 : 0;
    }
    updates.push('updated_at = :updatedAt');
    
    await executeQuery(
      `UPDATE quick_tasks SET ${updates.join(', ')} WHERE id = :id`,
      binds
    );
    
    // Fetch and return the updated task
    const result = await executeQuery(
      'SELECT * FROM quick_tasks WHERE id = :id',
      { id }
    );
    
    if (!result.rows || result.rows.length === 0) {
      return undefined;
    }
    
    const row = result.rows[0] as any;
    return {
      id: row.ID,
      userId: row.USER_ID,
      title: row.TITLE,
      completed: row.COMPLETED === 1,
      createdAt: row.CREATED_AT,
      updatedAt: row.UPDATED_AT
    };
  }

  async deleteQuickTask(id: string): Promise<boolean> {
    await this.ensureOracleAvailable();
    const result = await executeQuery(
      'DELETE FROM quick_tasks WHERE id = :id',
      { id }
    );
    
    return (result.rowsAffected || 0) > 0;
  }
  
  
  async getUserAnalytics(userId: string): Promise<any> { return {}; }
}
