-- ================================================================
-- Alteon PostgreSQL Schema for Supabase
-- Initial Supabase schema
-- Date: January 19, 2026
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- 1. CORE TABLES
-- ================================================================

-- Users table (Firebase UID as primary key)
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- Firebase UID
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar TEXT,
    google_id TEXT,
    google_access_token TEXT,
    google_refresh_token TEXT,
    preferences JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    section TEXT,
    color TEXT DEFAULT '#42a5f5',
    google_classroom_id TEXT,
    description TEXT,
    teacher_name TEXT,
    teacher_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignments table
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    google_classroom_id TEXT,
    is_custom BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT[], -- Array of tags instead of JSON string
    is_pinned BOOLEAN DEFAULT false,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. FLASHCARD SYSTEM
-- ================================================================

-- Flashcard Decks table (with hierarchical support)
CREATE TABLE flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    parent_deck_id UUID REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#3b82f6',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcards table (with spaced repetition)
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id UUID REFERENCES flashcard_decks(id) ON DELETE SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    card_type TEXT DEFAULT 'basic', -- 'basic' or 'cloze'
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    cloze_text TEXT,
    cloze_index INTEGER,
    difficulty TEXT DEFAULT 'medium',
    last_reviewed TIMESTAMPTZ,
    review_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    ease_factor INTEGER DEFAULT 250, -- 2.5 * 100
    interval_days INTEGER DEFAULT 0,
    maturity_level TEXT DEFAULT 'new', -- 'new', 'learning', 'young', 'mature'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcard Reviews table (detailed statistics)
CREATE TABLE flashcard_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    deck_id UUID REFERENCES flashcard_decks(id) ON DELETE SET NULL,
    was_correct BOOLEAN NOT NULL,
    time_spent INTEGER, -- Seconds
    review_date TIMESTAMPTZ DEFAULT NOW(),
    ease_factor INTEGER,
    interval_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 3. PRODUCTIVITY & WELLBEING
-- ================================================================

-- Mood Entries table
CREATE TABLE mood_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 5),
    notes TEXT,
    date_entry TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Entries table
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    date_entry TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pomodoro Sessions table
CREATE TABLE pomodoro_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL, -- Minutes
    type TEXT, -- 'work' or 'break'
    completed_at TIMESTAMPTZ
);

-- Habits table (stored as JSONB for completions)
CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    frequency TEXT DEFAULT 'daily',
    target_count INTEGER DEFAULT 1,
    color TEXT,
    icon TEXT,
    streak INTEGER DEFAULT 0,
    completions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- ================================================================
-- 4. TODO BOARDS (KANBAN)
-- ================================================================

-- Boards table
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    background TEXT,
    position INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,
    is_favorited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lists table (columns in a board)
CREATE TABLE todo_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards table (tasks in lists)
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_id UUID REFERENCES todo_lists(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    due_date TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklists table (subtasks in cards)
CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_checked BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Labels table
CREATE TABLE labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Card-Labels junction table (many-to-many)
CREATE TABLE card_labels (
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, label_id)
);

-- Attachments table
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quick Tasks table (dashboard quick todos)
CREATE TABLE quick_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 5. AI FEATURES
-- ================================================================

-- AI Summaries table
CREATE TABLE ai_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary_content TEXT NOT NULL,
    summary_type TEXT,
    original_content TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark',
    color_scheme JSONB,
    typography JSONB,
    layout JSONB,
    workspace JSONB,
    features JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- Classes indexes
CREATE INDEX idx_classes_user_id ON classes(user_id);
CREATE INDEX idx_classes_google_classroom_id ON classes(google_classroom_id);

-- Assignments indexes
CREATE INDEX idx_assignments_user_id ON assignments(user_id);
CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_google_classroom_id ON assignments(google_classroom_id);

-- Notes indexes
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_class_id ON notes(class_id);
CREATE INDEX idx_notes_is_pinned ON notes(is_pinned);

-- Flashcard Deck indexes
CREATE INDEX idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX idx_flashcard_decks_parent_deck_id ON flashcard_decks(parent_deck_id);
CREATE INDEX idx_flashcard_decks_sort_order ON flashcard_decks(sort_order);

-- Flashcards indexes
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX idx_flashcards_class_id ON flashcards(class_id);
CREATE INDEX idx_flashcards_card_type ON flashcards(card_type);
CREATE INDEX idx_flashcards_maturity_level ON flashcards(maturity_level);
CREATE INDEX idx_flashcards_last_reviewed ON flashcards(last_reviewed);

-- Flashcard Reviews indexes
CREATE INDEX idx_flashcard_reviews_user_id ON flashcard_reviews(user_id);
CREATE INDEX idx_flashcard_reviews_flashcard_id ON flashcard_reviews(flashcard_id);
CREATE INDEX idx_flashcard_reviews_deck_id ON flashcard_reviews(deck_id);
CREATE INDEX idx_flashcard_reviews_review_date ON flashcard_reviews(review_date);
CREATE INDEX idx_flashcard_reviews_user_date ON flashcard_reviews(user_id, review_date);

-- Mood/Journal indexes
CREATE INDEX idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX idx_mood_entries_date ON mood_entries(date_entry);
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(date_entry);

-- Pomodoro Sessions indexes
CREATE INDEX idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX idx_pomodoro_sessions_completed_at ON pomodoro_sessions(completed_at);

-- Habits indexes
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_is_active ON habits(is_active);

-- Boards indexes
CREATE INDEX idx_boards_user_id ON boards(user_id);
CREATE INDEX idx_boards_position ON boards(position);
CREATE INDEX idx_boards_is_archived ON boards(is_archived);

-- Lists indexes
CREATE INDEX idx_todo_lists_board_id ON todo_lists(board_id);
CREATE INDEX idx_todo_lists_position ON todo_lists(position);

-- Cards indexes
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_list_id ON cards(list_id);
CREATE INDEX idx_cards_position ON cards(position);
CREATE INDEX idx_cards_due_date ON cards(due_date);
CREATE INDEX idx_cards_is_completed ON cards(is_completed);

-- Checklists indexes
CREATE INDEX idx_checklists_card_id ON checklists(card_id);
CREATE INDEX idx_checklists_position ON checklists(position);

-- Labels indexes
CREATE INDEX idx_labels_user_id ON labels(user_id);

-- Attachments indexes
CREATE INDEX idx_attachments_card_id ON attachments(card_id);

-- Quick Tasks indexes
CREATE INDEX idx_quick_tasks_user_id ON quick_tasks(user_id);
CREATE INDEX idx_quick_tasks_completed ON quick_tasks(completed);

-- AI Summaries indexes
CREATE INDEX idx_ai_summaries_user_id ON ai_summaries(user_id);

-- User Preferences indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- ================================================================
-- 7. TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcard_decks_updated_at BEFORE UPDATE ON flashcard_decks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quick_tasks_updated_at BEFORE UPDATE ON quick_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 8. VIEWS FOR ANALYTICS (PostgreSQL version)
-- ================================================================

-- Daily Review Statistics View
CREATE OR REPLACE VIEW v_daily_review_stats AS
SELECT 
    user_id,
    DATE(review_date) AS review_day,
    COUNT(*) AS total_reviews,
    SUM(CASE WHEN was_correct THEN 1 ELSE 0 END) AS correct_reviews,
    SUM(CASE WHEN NOT was_correct THEN 1 ELSE 0 END) AS incorrect_reviews,
    ROUND(AVG(CASE WHEN was_correct THEN 100 ELSE 0 END)::numeric, 2) AS success_rate,
    AVG(time_spent) AS avg_time_spent,
    COUNT(DISTINCT flashcard_id) AS unique_cards_reviewed
FROM flashcard_reviews
GROUP BY user_id, DATE(review_date);

-- Deck Statistics View
CREATE OR REPLACE VIEW v_deck_stats AS
SELECT 
    fd.id AS deck_id,
    fd.user_id,
    fd.name AS deck_name,
    COUNT(f.id) AS total_cards,
    SUM(CASE WHEN f.maturity_level = 'new' THEN 1 ELSE 0 END) AS new_cards,
    SUM(CASE WHEN f.maturity_level = 'learning' THEN 1 ELSE 0 END) AS learning_cards,
    SUM(CASE WHEN f.maturity_level = 'young' THEN 1 ELSE 0 END) AS young_cards,
    SUM(CASE WHEN f.maturity_level = 'mature' THEN 1 ELSE 0 END) AS mature_cards,
    AVG(f.ease_factor) AS avg_ease_factor,
    AVG(f.interval_days) AS avg_interval
FROM flashcard_decks fd
LEFT JOIN flashcards f ON fd.id = f.deck_id
GROUP BY fd.id, fd.user_id, fd.name;

-- Retention Curve View (30-day window)
CREATE OR REPLACE VIEW v_retention_curve AS
SELECT 
    f.user_id,
    f.deck_id,
    (CURRENT_DATE - DATE(r.review_date)) AS days_ago,
    COUNT(*) AS reviews_count,
    SUM(CASE WHEN r.was_correct THEN 1 ELSE 0 END) AS correct_count,
    ROUND(AVG(CASE WHEN r.was_correct THEN 100 ELSE 0 END)::numeric, 2) AS retention_rate
FROM flashcards f
INNER JOIN flashcard_reviews r ON f.id = r.flashcard_id
WHERE r.review_date >= (NOW() - INTERVAL '30 days')
GROUP BY f.user_id, f.deck_id, (CURRENT_DATE - DATE(r.review_date));

-- ================================================================
-- 9. ROW LEVEL SECURITY (RLS) - DISABLED FOR FIREBASE AUTH
-- ================================================================
-- Since we're using Firebase Auth (not Supabase Auth), we disable RLS
-- and enforce authorization in application code by filtering on user_id

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks DISABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards DISABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
ALTER TABLE boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE todo_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE checklists DISABLE ROW LEVEL SECURITY;
ALTER TABLE labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE card_labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE quick_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- 10. VERIFICATION QUERIES
-- ================================================================

-- Verify all tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Count total indexes
SELECT COUNT(*) as total_indexes
FROM pg_indexes 
WHERE schemaname = 'public';
