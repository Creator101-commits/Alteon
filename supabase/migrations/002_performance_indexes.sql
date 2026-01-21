-- Performance indexes for faster queries
-- These indexes optimize the most frequently used queries in Alteon

-- ============================================
-- USERS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- NOTES TABLE
-- Most common queries: by user, by class, recently updated
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_class_id ON notes(class_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_pinned ON notes(user_id, is_pinned DESC, updated_at DESC);

-- ============================================
-- ASSIGNMENTS TABLE
-- Most common queries: by user, by due date, by status
-- ============================================
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_user_status ON assignments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_user_due ON assignments(user_id, due_date);

-- ============================================
-- CLASSES TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);

-- ============================================
-- CALENDAR EVENTS TABLE
-- Most common queries: by user + date range
-- ============================================
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_start ON calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date_range ON calendar_events(user_id, start_time, end_time);

-- ============================================
-- FLASHCARDS / DECKS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_parent ON flashcard_decks(parent_deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(user_id, next_review_date);

-- ============================================
-- HABITS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id, completed_date);

-- ============================================
-- TODO BOARDS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_todo_boards_user_id ON todo_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_todo_columns_board ON todo_columns(board_id, position);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_column ON todo_tasks(column_id, position);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_board ON todo_tasks(board_id);

-- ============================================
-- MOOD / JOURNAL TABLES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON mood_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, entry_date DESC);

-- ============================================
-- QUICK TASKS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_quick_tasks_user_id ON quick_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_completed ON quick_tasks(user_id, completed);

-- ============================================
-- COMPOSITE INDEXES for common JOIN patterns
-- ============================================
-- Notes with class info (common dashboard query)
CREATE INDEX IF NOT EXISTS idx_notes_user_class_updated ON notes(user_id, class_id, updated_at DESC);
-- Assignments dashboard view
CREATE INDEX IF NOT EXISTS idx_assignments_dashboard ON assignments(user_id, status, due_date);
