import type { Express } from "express";
import { createServer, type Server } from "http";
import { optimizedStorage } from "./optimized-storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertClassSchema, 
  insertAssignmentSchema,
  insertFlashcardSchema,
  insertFlashcardDeckSchema,
  insertFlashcardReviewSchema,
  insertMoodEntrySchema,
  insertJournalEntrySchema,
  insertPomodoroSessionSchema, 
  insertAiSummarySchema,
  insertHabitSchema,
  insertNoteSchema,
  insertBoardSchema,
  insertTodoListSchema,
  insertCardSchema,
  insertChecklistSchema,
  insertLabelSchema,
  insertCardLabelSchema,
  hacLoginSchema,
  hacGpaCalculationSchema
} from "@shared/schema";
import * as hacScraper from "./hac";

// Helper to create default lists for a new board
async function createDefaultListsForBoard(boardId: string) {
  const defaultTitles = ["Urgent", "Today", "This Week", "Later"];
  debugLog(`🔧 Creating ${defaultTitles.length} default lists for board ${boardId}`);

  for (let index = 0; index < defaultTitles.length; index++) {
    const title = defaultTitles[index];
    debugLog(`  → Creating list "${title}" at position ${index}`);

    const listData = insertTodoListSchema.parse({
      boardId,
      title,
      position: index,
      isArchived: false,
    });

    const created = await optimizedStorage.createList(listData as any);
    debugLog(`  ✓ Created list "${title}" with ID: ${created.id}`);
  }
  debugLog(`✅ Finished creating default lists for board ${boardId}`);
}

// Conditional logging helper - only logs in development
const isDev = process.env.NODE_ENV !== 'production';
const debugLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};

// Pagination helper - extracts page, limit, offset from query params
function getPaginationParams(req: any): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Pagination response helper
function paginatedResponse<T>(items: T[], total: number, page: number, limit: number) {
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: (page * limit) < total
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to extract user ID from request
  const getUserId = (req: any): string => {
    // Check for user ID in request headers - authentication required
    // Firebase token verification is handled by frontend
    const userId = req.headers['x-user-id'] || req.headers['user-id'];
    
    debugLog('🔍 getUserId called, userId:', userId ? 'present' : 'missing');
    
    if (userId) {
      return userId as string;
    }
    
    // No fallback - require proper authentication
    console.error('❌ No user ID provided in request headers');
    throw new Error('Authentication required: No user ID provided');
  };

  // Firebase to Oracle sync endpoint
  app.post("/api/auth/sync", async (req, res) => {
    try {
      const { uid, email, displayName, photoURL, accessToken, refreshToken } = req.body;
      
      if (!uid || !email) {
        return res.status(400).json({ message: "Missing required user data" });
      }

      // Check if user already exists
      let user = await optimizedStorage.getUser(uid);
      
      if (user) {
        // Update existing user - only update fields that have changed
        const updateData: any = {};
        
        if (displayName && displayName !== user.name) {
          updateData.name = displayName;
        }
        if (photoURL && photoURL !== user.avatar) {
          updateData.avatar = photoURL;
        }
        if (accessToken && accessToken !== user.googleAccessToken) {
          updateData.googleAccessToken = accessToken;
        }
        // Only update refresh token if provided (don't overwrite with null)
        if (refreshToken && refreshToken !== user.googleRefreshToken) {
          updateData.googleRefreshToken = refreshToken;
        }
        
        // Only update if there are changes
        if (Object.keys(updateData).length > 0) {
          user = await optimizedStorage.updateUser(uid, updateData);
          debugLog(` Updated user: ${email}`);
        } else {
          debugLog(` User already up to date: ${email}`);
        }
      } else {
        // Create new user
        const userData = {
          name: displayName || email.split('@')[0],
          email,
          firstName: displayName?.split(' ')[0] || '',
          lastName: displayName?.split(' ').slice(1).join(' ') || '',
          avatar: photoURL || null,
          googleId: uid,
          googleAccessToken: accessToken || null,
          googleRefreshToken: refreshToken || null,
        };
        
        // Use Firebase UID as the Oracle database user ID
        user = await optimizedStorage.createUserWithId(uid, userData);
        debugLog(` Created new user: ${email}`);
      }
      
      res.json({ success: true, user });
    } catch (error) {
      console.error(' Error syncing user:', error);
      res.status(500).json({ message: "Failed to sync user" });
    }
  });

  // Google Calendar GET endpoint - fetch events from Google Calendar API
  app.get("/api/calendar/events", async (req, res) => {
    try {
      const userId = getUserId(req);
      const accessToken = req.headers['x-google-token'] as string;
      
      if (!accessToken) {
        return res.status(401).json({ message: "Google access token required" });
      }

      // Get events from the last 30 days and next 365 days
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 365);

      // Fetch calendars
      const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!calendarsResponse.ok) {
        const error = await calendarsResponse.json().catch(() => ({}));
        console.error(' Failed to fetch calendars:', error);
        return res.status(calendarsResponse.status).json({ 
          message: "Failed to fetch calendars from Google",
          error: error.error?.message || 'Unknown error'
        });
      }

      const calendarsData = await calendarsResponse.json();
      const calendars = calendarsData.items || [];

      // Fetch events from all calendars IN PARALLEL using Promise.allSettled
      const calendarPromises = calendars.map(async (calendar: any) => {
        const params = new URLSearchParams({
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '500', // Reduced from 2500 for better performance
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
        });

        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout per calendar

        try {
          const eventsResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params}`,
            { 
              headers: { 'Authorization': `Bearer ${accessToken}` },
              signal: controller.signal
            }
          );
          clearTimeout(timeoutId);

          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json();
            return {
              calendar,
              events: (eventsData.items || []).map((event: any) => ({
                ...event,
                calendarId: calendar.id,
                calendarName: calendar.summary,
              }))
            };
          }
          return { calendar, events: [] };
        } catch (error) {
          clearTimeout(timeoutId);
          console.warn(`Failed to fetch events from calendar ${calendar.summary}:`, error);
          return { calendar, events: [] };
        }
      });

      const results = await Promise.allSettled(calendarPromises);
      const allEvents = results
        .filter((r): r is PromiseFulfilledResult<{ calendar: any; events: any[] }> => r.status === 'fulfilled')
        .flatMap(r => r.value.events);

      debugLog(` Fetched ${allEvents.length} calendar events for user ${userId}`);

      res.json({
        success: true,
        calendars,
        events: allEvents,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(' Error fetching Google Calendar events:', error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  // Google Calendar sync endpoint
  app.post("/api/sync/google-calendar", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { events } = req.body;

      if (!events) {
        return res.status(400).json({ message: "Missing Google Calendar events" });
      }

      // Just log the calendar sync, don't create assignments from calendar events
      debugLog(` Received ${events.length} calendar events for user ${userId}`);
      debugLog('Note: Calendar events are NOT synced as assignments');

      res.json({
        success: true,
        syncedEvents: events.length,
        message: "Calendar events received but not synced as assignments",
      });
    } catch (error) {
      console.error(' Error syncing Google Calendar events:', error);
      res.status(500).json({ message: "Failed to sync Google Calendar events" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await optimizedStorage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await optimizedStorage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await optimizedStorage.updateUser(req.params.id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Class routes
  app.get("/api/users/:userId/classes", async (req, res) => {
    try {
      const classes = await optimizedStorage.getClassesByUserId(req.params.userId);
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.post("/api/users/:userId/classes", async (req, res) => {
    try {
      const classData = insertClassSchema.parse({ ...req.body, userId: req.params.userId });
      const newClass = await optimizedStorage.createClass(classData);
      res.status(201).json(newClass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid class data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  app.delete("/api/classes/:id", async (req, res) => {
    try {
      const deleted = await optimizedStorage.deleteClass(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Class not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete class" });
    }
  });

  // Assignment routes
  app.get("/api/users/:userId/assignments", async (req, res) => {
    try {
      // Support pagination via query params: ?page=1&limit=50&status=pending
      const usePagination = req.query.page || req.query.limit;
      
      if (usePagination) {
        const { page, limit, offset } = getPaginationParams(req);
        const status = req.query.status as string | undefined;
        
        const result = await optimizedStorage.getAssignmentsByUserIdPaginated(
          req.params.userId,
          { limit, offset, status }
        );
        
        res.json(paginatedResponse(result.items, result.total, page, limit));
      } else {
        // Backward compatible - return all assignments
        const assignments = await optimizedStorage.getAssignmentsByUserId(req.params.userId);
        res.json(assignments);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.post("/api/users/:userId/assignments", async (req, res) => {
    try {
      const bodyWithParsedDate = {
        ...req.body,
        userId: req.params.userId,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      };
      const assignmentData = insertAssignmentSchema.parse(bodyWithParsedDate);
      const assignment = await optimizedStorage.createAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  app.put("/api/assignments/:id", async (req, res) => {
    try {
      debugLog('PUT /api/assignments/:id - Request body:', req.body);
      const bodyWithParsedDate = {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : req.body.dueDate,
      };
      const assignmentData = insertAssignmentSchema.partial().parse(bodyWithParsedDate);
      debugLog('PUT /api/assignments/:id - Parsed data:', assignmentData);
      const assignment = await optimizedStorage.updateAssignment(req.params.id, assignmentData);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Zod validation error:', error.errors);
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      console.error('Error updating assignment:', error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  app.delete("/api/assignments/:id", async (req, res) => {
    try {
      const deleted = await optimizedStorage.deleteAssignment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  // Flashcard routes
  app.get("/api/users/:userId/flashcards", async (req, res) => {
    try {
      // Support pagination via query params
      const usePagination = req.query.page || req.query.limit;
      
      if (usePagination) {
        const { page, limit, offset } = getPaginationParams(req);
        const deckId = req.query.deckId as string | undefined;
        
        const result = await optimizedStorage.getFlashcardsByUserIdPaginated(
          req.params.userId,
          { limit, offset, deckId }
        );
        
        res.json(paginatedResponse(result.items, result.total, page, limit));
      } else {
        const flashcards = await optimizedStorage.getFlashcardsByUserId(req.params.userId);
        res.json(flashcards);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch flashcards" });
    }
  });

  app.post("/api/users/:userId/flashcards", async (req, res) => {
    try {
      const flashcardData = insertFlashcardSchema.parse({ ...req.body, userId: req.params.userId });
      const flashcard = await optimizedStorage.createFlashcard(flashcardData);
      res.status(201).json(flashcard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid flashcard data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create flashcard" });
    }
  });

  app.put("/api/flashcards/:id", async (req, res) => {
    try {
      const flashcardData = insertFlashcardSchema.partial().parse(req.body);
      const flashcard = await optimizedStorage.updateFlashcard(req.params.id, flashcardData);
      if (!flashcard) {
        return res.status(404).json({ message: "Flashcard not found" });
      }
      res.json(flashcard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid flashcard data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update flashcard" });
    }
  });

  app.delete("/api/flashcards/:id", async (req, res) => {
    try {
      const deleted = await optimizedStorage.deleteFlashcard(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Flashcard not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete flashcard" });
    }
  });

  // Flashcard Deck routes
  app.get("/api/users/:userId/flashcard-decks", async (req, res) => {
    try {
      const decks = await optimizedStorage.getDecksByUserId(req.params.userId);
      res.json(decks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch decks" });
    }
  });

  app.post("/api/users/:userId/flashcard-decks", async (req, res) => {
    try {
      const deckData = insertFlashcardDeckSchema.parse({ ...req.body, userId: req.params.userId });
      const deck = await optimizedStorage.createDeck(deckData);
      res.status(201).json(deck);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid deck data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create deck" });
    }
  });

  app.put("/api/flashcard-decks/:id", async (req, res) => {
    try {
      const deckData = insertFlashcardDeckSchema.partial().parse(req.body);
      const deck = await optimizedStorage.updateDeck(req.params.id, deckData);
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      res.json(deck);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid deck data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update deck" });
    }
  });

  app.delete("/api/flashcard-decks/:id", async (req, res) => {
    try {
      const deleted = await optimizedStorage.deleteDeck(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Deck not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete deck" });
    }
  });

  app.get("/api/flashcard-decks/:deckId/flashcards", async (req, res) => {
    try {
      const flashcards = await optimizedStorage.getFlashcardsByDeck(req.params.deckId);
      res.json(flashcards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch flashcards for deck" });
    }
  });

  // Flashcard Review and Statistics routes
  app.post("/api/flashcards/:id/review", async (req, res) => {
    try {
      const userId = getUserId(req);
      const reviewData = insertFlashcardReviewSchema.parse({
        ...req.body,
        userId,
        flashcardId: req.params.id,
      });
      const review = await optimizedStorage.recordReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to record review" });
    }
  });

  app.get("/api/users/:userId/flashcard-stats/daily", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const stats = await optimizedStorage.getDailyStats(req.params.userId, days);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily stats" });
    }
  });

  app.get("/api/users/:userId/flashcard-stats/decks", async (req, res) => {
    try {
      const stats = await optimizedStorage.getDeckStats(req.params.userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deck stats" });
    }
  });

  app.get("/api/users/:userId/flashcard-stats/retention", async (req, res) => {
    try {
      const deckId = req.query.deckId as string | undefined;
      const curve = await optimizedStorage.getRetentionCurve(req.params.userId, deckId);
      res.json(curve);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch retention curve" });
    }
  });

  // Mood entry routes
  app.get("/api/users/:userId/mood-entries", async (req, res) => {
    try {
      const entries = await optimizedStorage.getMoodEntriesByUserId(req.params.userId);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mood entries" });
    }
  });

  app.post("/api/users/:userId/mood-entries", async (req, res) => {
    try {
      debugLog(' Creating mood entry with data:', { ...req.body, userId: req.params.userId });
      const entryData = insertMoodEntrySchema.parse({ ...req.body, userId: req.params.userId });
      const entry = await optimizedStorage.createMoodEntry(entryData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(' Zod validation error:', error.errors);
        return res.status(400).json({ message: "Invalid mood entry data", errors: error.errors });
      }
      console.error(' Mood entry creation error:', error);
      res.status(500).json({ message: "Failed to create mood entry" });
    }
  });

  // Journal entry routes
  app.get("/api/users/:userId/journal-entries", async (req, res) => {
    try {
      const entries = await optimizedStorage.getJournalEntriesByUserId(req.params.userId);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  app.post("/api/users/:userId/journal-entries", async (req, res) => {
    try {
      debugLog(' Creating journal entry with data:', { ...req.body, userId: req.params.userId });
      const entryData = insertJournalEntrySchema.parse({ ...req.body, userId: req.params.userId });
      const entry = await optimizedStorage.createJournalEntry(entryData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(' Zod validation error:', error.errors);
        return res.status(400).json({ message: "Invalid journal entry data", errors: error.errors });
      }
      console.error(' Journal entry creation error:', error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  app.put("/api/journal-entries/:id", async (req, res) => {
    try {
      const entryData = insertJournalEntrySchema.partial().parse(req.body);
      const entry = await optimizedStorage.updateJournalEntry(req.params.id, entryData);
      if (!entry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid journal entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update journal entry" });
    }
  });

  app.delete("/api/journal-entries/:id", async (req, res) => {
    try {
      const deleted = await optimizedStorage.deleteJournalEntry(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete journal entry" });
    }
  });

  // Pomodoro session routes
  app.get("/api/users/:userId/pomodoro-sessions", async (req, res) => {
    try {
      const sessions = await optimizedStorage.getPomodoroSessionsByUserId(req.params.userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pomodoro sessions" });
    }
  });

  app.post("/api/users/:userId/pomodoro-sessions", async (req, res) => {
    try {
      const sessionData = insertPomodoroSessionSchema.parse({ ...req.body, userId: req.params.userId });
      const session = await optimizedStorage.createPomodoroSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid pomodoro session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create pomodoro session" });
    }
  });

  // Habit routes
  app.get("/api/habits", async (req, res) => {
    try {
      const userId = getUserId(req);
      const habits = await optimizedStorage.getHabitsByUserId(userId);
      res.json(habits);
    } catch (error) {
      console.error('Error fetching habits:', error);
      res.status(500).json({ message: "Failed to fetch habits" });
    }
  });

  app.post("/api/habits", async (req, res) => {
    try {
      const userId = getUserId(req);
      const habitData = insertHabitSchema.parse({ ...req.body, userId });
      const habit = await optimizedStorage.createHabit(habitData);
      res.status(201).json(habit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid habit data", errors: error.errors });
      }
      console.error('Error creating habit:', error);
      res.status(500).json({ message: "Failed to create habit" });
    }
  });

  app.put("/api/habits/:id", async (req, res) => {
    try {
      const habitData = insertHabitSchema.partial().parse(req.body);
      const habit = await optimizedStorage.updateHabit(req.params.id, habitData);
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      res.json(habit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid habit data", errors: error.errors });
      }
      console.error('Error updating habit:', error);
      res.status(500).json({ message: "Failed to update habit" });
    }
  });

  app.delete("/api/habits/:id", async (req, res) => {
    try {
      const deleted = await optimizedStorage.deleteHabit(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Habit not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting habit:', error);
      res.status(500).json({ message: "Failed to delete habit" });
    }
  });

  // AI summary routes
  app.get("/api/users/:userId/ai-summaries", async (req, res) => {
    try {
      const summaries = await optimizedStorage.getAiSummariesByUserId(req.params.userId);
      res.json(summaries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI summaries" });
    }
  });

  app.post("/api/users/:userId/ai-summaries", async (req, res) => {
    try {
      const summaryData = insertAiSummarySchema.parse({ ...req.body, userId: req.params.userId });
      const summary = await optimizedStorage.createAiSummary(summaryData);
      res.status(201).json(summary);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid AI summary data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create AI summary" });
    }
  });

  app.delete("/api/ai-summaries/:id", async (req, res) => {
    try {
      const deleted = await optimizedStorage.deleteAiSummary(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "AI summary not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete AI summary" });
    }
  });


  // Notes routes - Updated to use real authentication
  app.get("/api/notes", async (req, res) => {
    try {
      const userId = getUserId(req);
      debugLog(' Fetching notes for user:', userId);
      
      // Support pagination via query params
      const usePagination = req.query.page || req.query.limit;
      
      if (usePagination) {
        const { page, limit, offset } = getPaginationParams(req);
        const result = await optimizedStorage.getNotesByUserIdPaginated(userId, { limit, offset });
        debugLog(' Found notes (paginated):', result.items.length, 'of', result.total);
        res.json(paginatedResponse(result.items, result.total, page, limit));
      } else {
        const notes = await optimizedStorage.getNotesByUserId(userId);
        debugLog(' Found notes:', notes.length);
        res.json(notes);
      }
    } catch (error) {
      console.error(' Error fetching notes:', error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      const userId = getUserId(req);
      const noteData = insertNoteSchema.parse({ ...req.body, userId });
      const note = await optimizedStorage.createNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid note data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  app.put("/api/notes/:id", async (req, res) => {
    try {
      const noteData = insertNoteSchema.partial().parse(req.body);
      const note = await optimizedStorage.updateNote(req.params.id, noteData);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid note data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const deleted = await optimizedStorage.deleteNote(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // Classes route for notes page
  app.get("/api/classes", async (req, res) => {
    try {
      const userId = getUserId(req);
      const classes = await optimizedStorage.getClassesByUserId(userId);
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  // Session-based assignment routes
  app.post("/api/assignments", async (req, res) => {
    try {
      const userId = getUserId(req);
      debugLog(' Assignment creation request body:', JSON.stringify(req.body, null, 2));
      
      // Convert dueDate string to Date object if present
      const bodyWithParsedDate = {
        ...req.body,
        userId,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      };
      
      const assignmentData = insertAssignmentSchema.parse(bodyWithParsedDate);
      const assignment = await optimizedStorage.createAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        debugLog(' Assignment validation error:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      console.error(' Assignment creation error:', error);
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  // Session-based class routes
  app.post("/api/classes", async (req, res) => {
    try {
      const userId = getUserId(req);
      const classData = insertClassSchema.parse({ ...req.body, userId });
      const newClass = await optimizedStorage.createClass(classData);
      res.status(201).json(newClass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid class data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  // YouTube transcript route
  app.post("/api/youtube/transcript", async (req, res) => {
    try {
      debugLog('📺 YouTube transcript request received');
      const userId = req.header('x-user-id');
      if (!userId) {
        debugLog('❌ No user ID provided');
        return res.status(401).json({ message: 'User authentication required' });
      }

      const schema = z.object({
        videoId: z.string().min(1, "Video ID is required"),
        url: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        debugLog('❌ Validation failed:', parsed.error.errors);
        return res.status(400).json({ 
          message: 'Invalid input',
          errors: parsed.error.errors 
        });
      }

      const { videoId } = parsed.data;
      debugLog(`🎬 Fetching transcript for video: ${videoId}`);

      // Dynamically import youtube-transcript
      const { YoutubeTranscript } = await import('youtube-transcript');
      
      const segments = await YoutubeTranscript.fetchTranscript(videoId);
      const fullText = segments.map((s: any) => s.text.trim()).join(' ').replace(/\s+/g, ' ').trim();

      if (!fullText) {
        debugLog('❌ Empty transcript received');
        return res.status(404).json({ 
          message: 'No transcript found for this video. Video may not have captions enabled.' 
        });
      }

      debugLog(`✅ Transcript fetched successfully: ${fullText.length} characters`);
      res.json({ 
        videoId,
        transcript: fullText,
        length: fullText.length 
      });
    } catch (error: any) {
      console.error('❌ YouTube transcript error:', error.message || error);
      
      // Provide user-friendly error messages
      let message = 'Failed to fetch YouTube transcript';
      
      if (error?.message?.includes('disabled')) {
        message = 'This video has transcripts/captions disabled by the creator.';
      } else if (error?.message?.includes('not available')) {
        message = 'No transcript is available for this video.';
      } else if (error?.message?.includes('private') || error?.message?.includes('unavailable')) {
        message = 'This video is private, unlisted, or has been removed.';
      } else if (error?.message?.includes('restricted')) {
        message = 'This video has geographic or age restrictions.';
      } else {
        message = error?.message || message;
      }
      
      res.status(500).json({ message });
    }
  });

  // Analytics routes
  app.get("/api/users/:userId/analytics", async (req, res) => {
    try {
      const analytics = await optimizedStorage.getUserAnalytics(req.params.userId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Google token refresh endpoint
  app.post("/api/auth/refresh-token", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { refreshToken: clientRefreshToken } = req.body; // Accept refresh token from client as fallback
      
      // Get user's refresh token from storage
      const user = await optimizedStorage.getUser(userId);
      const refreshToken = user?.googleRefreshToken || clientRefreshToken;
      
      if (!refreshToken) {
        return res.status(400).json({ message: "No refresh token available. Please sign in again." });
      }

      const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.status(500).json({ message: "Google OAuth not configured" });
      }

      // Call Google's token refresh endpoint
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error(' Token refresh failed:', error);
        return res.status(401).json({ message: "Failed to refresh token. Please sign in again." });
      }

      const tokenData = await tokenResponse.json();
      const newAccessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Update user's access token in storage
      await optimizedStorage.updateUser(userId, {
        googleAccessToken: newAccessToken,
        // Also store the refresh token if it was provided from client but not in DB
        ...(clientRefreshToken && !user?.googleRefreshToken ? { googleRefreshToken: clientRefreshToken } : {}),
      });

      debugLog(` Token refreshed for user ${userId}, expires at ${expiresAt}`);

      res.json({
        success: true,
        accessToken: newAccessToken,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error(' Error refreshing token:', error);
      res.status(500).json({ message: "Failed to refresh token" });
    }
  });

  // Calendar OAuth callback routes
  app.post("/api/auth/calendar/callback", async (req, res) => {
    try {
      const { code, provider, redirectUri } = req.body;
      
      if (!code || !provider) {
        return res.status(400).json({ message: "Missing code or provider" });
      }

      let tokenResponse;
      
      if (provider === 'google') {
        // Exchange Google OAuth code for access token
        const tokenUrl = 'https://oauth2.googleapis.com/token';
        const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET; // Server-side secret
        
        if (!clientId || !clientSecret) {
          return res.status(500).json({ message: "Google OAuth not configured" });
        }

        tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });
      } else if (provider === 'outlook') {
        // Exchange Microsoft OAuth code for access token
        const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
        const clientId = process.env.VITE_MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET; // Server-side secret
        
        if (!clientId || !clientSecret) {
          return res.status(500).json({ message: "Microsoft OAuth not configured" });
        }

        tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            scope: 'https://graph.microsoft.com/calendars.read https://graph.microsoft.com/calendars.readwrite',
          }),
        });
      } else {
        return res.status(400).json({ message: "Unsupported provider" });
      }

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error(`${provider} token exchange error:`, errorData);
        return res.status(400).json({ message: `Failed to exchange ${provider} authorization code` });
      }

      const tokenData = await tokenResponse.json();
      
      res.json({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
      });
    } catch (error) {
      console.error('Calendar OAuth callback error:', error);
      res.status(500).json({ message: "OAuth callback failed" });
    }
  });

  // Test endpoint to check calendar configuration
  app.get("/api/test/calendar-config", async (req, res) => {
    try {
      const config = {
        googleClientId: process.env.VITE_GOOGLE_CLIENT_ID ? 'Configured' : 'Missing',
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Configured' : 'Missing',
        microsoftClientId: process.env.VITE_MICROSOFT_CLIENT_ID ? 'Configured' : 'Missing',
        microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET ? 'Configured' : 'Missing',
      };
      
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to check configuration" });
    }
  });

  // ========== TODO BOARD ENDPOINTS ==========

  // Board endpoints
  app.get("/api/boards", async (req, res) => {
    try {
      const userId = getUserId(req);
      const boards = await optimizedStorage.getBoardsByUserId(userId);
      res.json(boards);
    } catch (error: any) {
      console.error('Error fetching boards:', error);
      res.status(500).json({ message: error.message || "Failed to fetch boards" });
    }
  });

  app.get("/api/boards/:id", async (req, res) => {
    try {
      const board = await optimizedStorage.getBoard(req.params.id);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.json(board);
    } catch (error: any) {
      console.error('Error fetching board:', error);
      res.status(500).json({ message: error.message || "Failed to fetch board" });
    }
  });

  app.post("/api/boards", async (req, res) => {
    try {
      const userId = getUserId(req);
      const boardData = insertBoardSchema.parse({ ...req.body, userId });
      const newBoard = await optimizedStorage.createBoard(boardData);
      debugLog(`📋 Board created: ${newBoard.id}, now creating default lists...`);

      try {
        await createDefaultListsForBoard(newBoard.id);
      } catch (listError) {
        console.error("❌ Error creating default lists for board", newBoard.id, listError);
      }

      res.status(201).json(newBoard);
    } catch (error: any) {
      console.error('Error creating board:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid board data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create board" });
    }
  });

  app.patch("/api/boards/:id", async (req, res) => {
    try {
      const updated = await optimizedStorage.updateBoard(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating board:', error);
      res.status(500).json({ message: error.message || "Failed to update board" });
    }
  });

  app.delete("/api/boards/:id", async (req, res) => {
    try {
      const success = await optimizedStorage.deleteBoard(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting board:', error);
      res.status(500).json({ message: error.message || "Failed to delete board" });
    }
  });

  // List endpoints
  app.get("/api/boards/:boardId/lists", async (req, res) => {
    try {
      const lists = await optimizedStorage.getListsByBoardId(req.params.boardId);
      res.json(lists);
    } catch (error: any) {
      console.error('Error fetching lists:', error);
      res.status(500).json({ message: error.message || "Failed to fetch lists" });
    }
  });

  app.post("/api/boards/:boardId/lists", async (req, res) => {
    try {
      const listData = insertTodoListSchema.parse({ ...req.body, boardId: req.params.boardId });
      const newList = await optimizedStorage.createList(listData);
      res.status(201).json(newList);
    } catch (error: any) {
      console.error('Error creating list:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid list data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create list" });
    }
  });

  app.patch("/api/lists/:id", async (req, res) => {
    try {
      const updated = await optimizedStorage.updateList(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "List not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating list:', error);
      res.status(500).json({ message: error.message || "Failed to update list" });
    }
  });

  app.delete("/api/lists/:id", async (req, res) => {
    try {
      const success = await optimizedStorage.deleteList(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "List not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting list:', error);
      res.status(500).json({ message: error.message || "Failed to delete list" });
    }
  });

  // Card endpoints
  
  // Get all cards for user, optionally filtered by boardId
  app.get("/api/cards", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { boardId } = req.query;
      
      if (boardId && typeof boardId === 'string') {
        // Get all lists for the board, then get cards for those lists
        const lists = await optimizedStorage.getListsByBoardId(boardId);
        const cardPromises = lists.map((list: any) => optimizedStorage.getCardsByListId(list.id));
        const cardArrays = await Promise.all(cardPromises);
        const cards = cardArrays.flat();
        res.json(cards);
      } else {
        // Get all cards for user
        const cards = await optimizedStorage.getCardsByUserId(userId);
        res.json(cards);
      }
    } catch (error: any) {
      console.error('Error fetching cards:', error);
      res.status(500).json({ message: error.message || "Failed to fetch cards" });
    }
  });

  app.get("/api/cards/inbox", async (req, res) => {
    try {
      const userId = getUserId(req);
      const cards = await optimizedStorage.getInboxCards(userId);
      res.json(cards);
    } catch (error: any) {
      console.error('Error fetching inbox cards:', error);
      res.status(500).json({ message: error.message || "Failed to fetch inbox cards" });
    }
  });

  app.get("/api/lists/:listId/cards", async (req, res) => {
    try {
      const cards = await optimizedStorage.getCardsByListId(req.params.listId);
      res.json(cards);
    } catch (error: any) {
      console.error('Error fetching cards:', error);
      res.status(500).json({ message: error.message || "Failed to fetch cards" });
    }
  });

  app.get("/api/cards/:id", async (req, res) => {
    try {
      const card = await optimizedStorage.getCard(req.params.id);
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      res.json(card);
    } catch (error: any) {
      console.error('Error fetching card:', error);
      res.status(500).json({ message: error.message || "Failed to fetch card" });
    }
  });

  app.post("/api/cards", async (req, res) => {
    try {
      const userId = getUserId(req);
      const cardData = insertCardSchema.parse({ ...req.body, userId });
      const newCard = await optimizedStorage.createCard(cardData);
      res.status(201).json(newCard);
    } catch (error: any) {
      console.error('Error creating card:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid card data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create card" });
    }
  });

  app.patch("/api/cards/:id", async (req, res) => {
    try {
      console.log(' PATCH /api/cards/:id - req.body:', JSON.stringify(req.body));
      
      // Convert dueDate string to Date object if present
      const updates = { ...req.body };
      if (updates.dueDate !== undefined) {
        console.log(' dueDate before processing:', updates.dueDate, 'type:', typeof updates.dueDate);
        if (updates.dueDate === null) {
          // Keep null as null (clearing the due date)
          updates.dueDate = null;
        } else {
          // Convert string to Date object
          const parsedDate = new Date(updates.dueDate);
          console.log(' parsedDate:', parsedDate, 'isValid:', !isNaN(parsedDate.getTime()));
          if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: "Invalid due date format" });
          }
          updates.dueDate = parsedDate;
        }
      }
      
      const updated = await optimizedStorage.updateCard(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Card not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating card:', error);
      res.status(500).json({ message: error.message || "Failed to update card" });
    }
  });

  app.patch("/api/cards/:id/move", async (req, res) => {
    try {
      const { listId, position } = req.body;
      const updated = await optimizedStorage.updateCard(req.params.id, { listId, position });
      if (!updated) {
        return res.status(404).json({ message: "Card not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error moving card:', error);
      res.status(500).json({ message: error.message || "Failed to move card" });
    }
  });

  app.delete("/api/cards/:id", async (req, res) => {
    try {
      const success = await optimizedStorage.deleteCard(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Card not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting card:', error);
      res.status(500).json({ message: error.message || "Failed to delete card" });
    }
  });

  // Checklist endpoints
  app.get("/api/cards/:cardId/checklists", async (req, res) => {
    try {
      const checklists = await optimizedStorage.getChecklistsByCardId(req.params.cardId);
      res.json(checklists);
    } catch (error: any) {
      console.error('Error fetching checklists:', error);
      res.status(500).json({ message: error.message || "Failed to fetch checklists" });
    }
  });

  app.post("/api/cards/:cardId/checklists", async (req, res) => {
    try {
      const checklistData = insertChecklistSchema.parse({ ...req.body, cardId: req.params.cardId });
      const newChecklist = await optimizedStorage.createChecklist(checklistData);
      res.status(201).json(newChecklist);
    } catch (error: any) {
      console.error('Error creating checklist:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid checklist data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create checklist" });
    }
  });

  app.patch("/api/checklists/:id", async (req, res) => {
    try {
      const updated = await optimizedStorage.updateChecklist(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating checklist:', error);
      res.status(500).json({ message: error.message || "Failed to update checklist" });
    }
  });

  app.delete("/api/checklists/:id", async (req, res) => {
    try {
      const success = await optimizedStorage.deleteChecklist(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting checklist:', error);
      res.status(500).json({ message: error.message || "Failed to delete checklist" });
    }
  });

  // Label endpoints
  app.get("/api/labels", async (req, res) => {
    try {
      const userId = getUserId(req);
      const labels = await optimizedStorage.getLabelsByUserId(userId);
      res.json(labels);
    } catch (error: any) {
      console.error('Error fetching labels:', error);
      res.status(500).json({ message: error.message || "Failed to fetch labels" });
    }
  });

  app.post("/api/labels", async (req, res) => {
    try {
      const userId = getUserId(req);
      const labelData = insertLabelSchema.parse({ ...req.body, userId });
      const newLabel = await optimizedStorage.createLabel(labelData);
      res.status(201).json(newLabel);
    } catch (error: any) {
      console.error('Error creating label:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid label data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create label" });
    }
  });

  app.patch("/api/labels/:id", async (req, res) => {
    try {
      const updated = await optimizedStorage.updateLabel(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Label not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating label:', error);
      res.status(500).json({ message: error.message || "Failed to update label" });
    }
  });

  app.delete("/api/labels/:id", async (req, res) => {
    try {
      const success = await optimizedStorage.deleteLabel(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Label not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting label:', error);
      res.status(500).json({ message: error.message || "Failed to delete label" });
    }
  });

  // Card-Label association endpoints
  app.post("/api/cards/:cardId/labels", async (req, res) => {
    try {
      const { labelId } = req.body;
      if (!labelId) {
        return res.status(400).json({ message: "Label ID required" });
      }
      await optimizedStorage.addLabelToCard(req.params.cardId, labelId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error adding label to card:', error);
      res.status(500).json({ message: error.message || "Failed to add label to card" });
    }
  });

  app.delete("/api/cards/:cardId/labels/:labelId", async (req, res) => {
    try {
      await optimizedStorage.removeLabelFromCard(req.params.cardId, req.params.labelId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing label from card:', error);
      res.status(500).json({ message: error.message || "Failed to remove label from card" });
    }
  });

  app.get("/api/cards/:cardId/labels", async (req, res) => {
    try {
      const labels = await optimizedStorage.getCardLabels(req.params.cardId);
      res.json(labels);
    } catch (error: any) {
      console.error('Error fetching card labels:', error);
      res.status(500).json({ message: error.message || "Failed to fetch card labels" });
    }
  });

  // ============ Quick Tasks API (Dashboard Quick Todos) ============
  app.get("/api/quick-tasks", async (req, res) => {
    try {
      const userId = getUserId(req);
      const tasks = await optimizedStorage.getQuickTasksByUserId(userId);
      res.json(tasks);
    } catch (error: any) {
      console.error('Error fetching quick tasks:', error);
      if (error.message?.includes('Authentication required')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Failed to fetch quick tasks" });
    }
  });

  app.post("/api/quick-tasks", async (req, res) => {
    try {
      const userId = getUserId(req);
      const taskData = {
        userId,
        title: req.body.title,
        completed: req.body.completed ?? false
      };
      
      if (!taskData.title || typeof taskData.title !== 'string') {
        return res.status(400).json({ message: "Title is required" });
      }
      
      const task = await optimizedStorage.createQuickTask(taskData);
      res.status(201).json(task);
    } catch (error: any) {
      console.error('Error creating quick task:', error);
      if (error.message?.includes('Authentication required')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Failed to create quick task" });
    }
  });

  app.patch("/api/quick-tasks/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { title, completed } = req.body;
      
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (completed !== undefined) updates.completed = completed;
      
      const updated = await optimizedStorage.updateQuickTask(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Quick task not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating quick task:', error);
      if (error.message?.includes('Authentication required')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Failed to update quick task" });
    }
  });

  app.delete("/api/quick-tasks/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      const success = await optimizedStorage.deleteQuickTask(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Quick task not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting quick task:', error);
      if (error.message?.includes('Authentication required')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Failed to delete quick task" });
    }
  });

  // =====================================================
  // HAC (Home Access Center) Grade Scraping Routes
  // =====================================================

  // HAC Login - Create session and authenticate with HAC
  app.post("/api/hac/login", async (req, res) => {
    try {
      const data = hacLoginSchema.parse(req.body);
      
      const { session, error } = await hacScraper.createSessionAndLogin(
        data.username,
        data.password,
        data.districtBaseUrl
      );
      
      if (error || !session) {
        return res.status(401).json({ 
          success: false,
          error: error || 'Login failed' 
        });
      }
      
      res.json({ 
        success: true,
        sessionId: session.sessionId,
        message: 'Login successful' 
      });
    } catch (error: any) {
      console.error('HAC login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid credentials format',
          details: error.errors 
        });
      }
      res.status(500).json({ 
        success: false,
        error: error.message || 'Server error during login' 
      });
    }
  });

  // HAC Grades - Fetch current grades and assignments
  app.get("/api/hac/grades", async (req, res) => {
    try {
      const sessionId = req.headers['x-hac-session'] as string;
      
      if (!sessionId) {
        return res.status(401).json({ 
          error: 'HAC session required. Please log in first.' 
        });
      }
      
      const isValid = await hacScraper.validateSession(sessionId);
      if (!isValid) {
        return res.status(401).json({ 
          error: 'Session expired or invalid. Please log in again.' 
        });
      }
      
      const gradesData = await hacScraper.fetchGrades(sessionId);
      
      if (!gradesData) {
        return res.status(500).json({ 
          error: 'Failed to fetch grades from HAC' 
        });
      }
      
      res.json(gradesData);
    } catch (error: any) {
      console.error('HAC grades error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch grades' 
      });
    }
  });

  // HAC Assignments for specific course
  app.get("/api/hac/assignments/:courseId", async (req, res) => {
    try {
      const sessionId = req.headers['x-hac-session'] as string;
      const courseIndex = parseInt(req.params.courseId, 10);
      
      if (!sessionId) {
        return res.status(401).json({ 
          error: 'HAC session required. Please log in first.' 
        });
      }
      
      if (isNaN(courseIndex)) {
        return res.status(400).json({ error: 'Invalid course ID' });
      }
      
      const isValid = await hacScraper.validateSession(sessionId);
      if (!isValid) {
        return res.status(401).json({ 
          error: 'Session expired or invalid. Please log in again.' 
        });
      }
      
      const assignments = await hacScraper.fetchAssignmentsForCourse(sessionId, courseIndex);
      
      if (!assignments) {
        return res.status(500).json({ 
          error: 'Failed to fetch assignments from HAC' 
        });
      }
      
      res.json({ assignments });
    } catch (error: any) {
      console.error('HAC assignments error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch assignments' 
      });
    }
  });

  // HAC Report Card - Fetch report card data with all cycles
  app.get("/api/hac/report-card", async (req, res) => {
    try {
      const sessionId = req.headers['x-hac-session'] as string;
      
      if (!sessionId) {
        return res.status(401).json({ 
          error: 'HAC session required. Please log in first.' 
        });
      }
      
      const isValid = await hacScraper.validateSession(sessionId);
      if (!isValid) {
        return res.status(401).json({ 
          error: 'Session expired or invalid. Please log in again.' 
        });
      }
      
      const reportCard = await hacScraper.fetchReportCard(sessionId);
      
      if (!reportCard) {
        return res.status(500).json({ 
          error: 'Failed to fetch report card from HAC' 
        });
      }
      
      res.json(reportCard);
    } catch (error: any) {
      console.error('HAC report card error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch report card' 
      });
    }
  });

  // HAC Calculate GPA - Calculate cumulative GPA with selected courses
  app.post("/api/hac/calculate-gpa", async (req, res) => {
    try {
      const sessionId = req.headers['x-hac-session'] as string;
      
      if (!sessionId) {
        return res.status(401).json({ 
          error: 'HAC session required. Please log in first.' 
        });
      }
      
      const isValid = await hacScraper.validateSession(sessionId);
      if (!isValid) {
        return res.status(401).json({ 
          error: 'Session expired or invalid. Please log in again.' 
        });
      }
      
      const data = hacGpaCalculationSchema.parse(req.body);
      
      const gpaData = await hacScraper.calculateCumulativeGpa(
        sessionId,
        data.selectedCourses,
        data.excludedCourses || []
      );
      
      if (!gpaData) {
        return res.status(500).json({ 
          error: 'Failed to calculate GPA' 
        });
      }
      
      res.json(gpaData);
    } catch (error: any) {
      console.error('HAC GPA calculation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request format',
          details: error.errors 
        });
      }
      res.status(500).json({ 
        error: error.message || 'Failed to calculate GPA' 
      });
    }
  });

  // HAC Logout - Destroy session
  app.post("/api/hac/logout", async (req, res) => {
    try {
      const sessionId = req.headers['x-hac-session'] as string;
      
      if (sessionId) {
        hacScraper.destroySession(sessionId);
      }
      
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
      console.error('HAC logout error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to logout' 
      });
    }
  });

  // HAC Session validation endpoint
  app.get("/api/hac/session/validate", async (req, res) => {
    try {
      const sessionId = req.headers['x-hac-session'] as string;
      
      if (!sessionId) {
        return res.json({ valid: false });
      }
      
      const isValid = await hacScraper.validateSession(sessionId);
      res.json({ valid: isValid });
    } catch (error: any) {
      console.error('HAC session validation error:', error);
      res.json({ valid: false });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
