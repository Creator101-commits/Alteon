-- Oracle Cloud Autonomous Database Schema Creation Script
-- Run this script in Oracle SQL Developer or SQL*Plus after connecting to your database
-- 
-- LATEST VERSION: Enhanced Flashcard System
-- Includes: Decks/Subdecks, Cloze Cards, Statistics, Spaced Repetition
-- 
-- This is the COMPLETE schema for a fresh database installation.
-- If you have existing data, use flashcard_enhancements.sql migration instead.
--
-- Updated: January 2025

-- Drop bell schedule table if it exists
DROP TABLE bell_schedule CASCADE CONSTRAINTS;

-- Create Users table
CREATE TABLE users (
    id VARCHAR2(36) PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    email VARCHAR2(255) UNIQUE NOT NULL,
    first_name VARCHAR2(255),
    last_name VARCHAR2(255),
    avatar VARCHAR2(500),
    google_id VARCHAR2(255),
    google_access_token CLOB,
    google_refresh_token CLOB,
    preferences CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Classes table
CREATE TABLE classes (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    section VARCHAR2(100),
    color VARCHAR2(7),
    google_classroom_id VARCHAR2(255),
    description CLOB,
    teacher_name VARCHAR2(255),
    teacher_email VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Notes table
CREATE TABLE notes (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    class_id VARCHAR2(36),
    title VARCHAR2(500) NOT NULL,
    content CLOB NOT NULL,
    category VARCHAR2(100),
    tags VARCHAR2(1000),
    is_pinned NUMBER(1) DEFAULT 0,
    color VARCHAR2(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

-- Create Assignments table
CREATE TABLE assignments (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    class_id VARCHAR2(36),
    title VARCHAR2(500) NOT NULL,
    description CLOB,
    due_date TIMESTAMP,
    priority VARCHAR2(20),
    status VARCHAR2(20),
    google_classroom_id VARCHAR2(255),
    is_custom NUMBER(1) DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

-- Create Flashcard Decks table (for organizing flashcards into folders/subfolders)
CREATE TABLE flashcard_decks (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    description CLOB,
    parent_deck_id VARCHAR2(36), -- For subdecks (self-referencing)
    color VARCHAR2(50) DEFAULT '#3b82f6',
    sort_order NUMBER(10) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE
);

-- Create Enhanced Flashcards table (with decks, cloze support, and spaced repetition)
CREATE TABLE flashcards (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    deck_id VARCHAR2(36), -- Link to deck
    class_id VARCHAR2(36),
    card_type VARCHAR2(50) DEFAULT 'basic', -- Card types: basic, cloze
    front CLOB NOT NULL,
    back CLOB NOT NULL,
    cloze_text CLOB, -- For cloze deletion cards (fill-in-the-blank)
    cloze_index NUMBER(3), -- Which cloze to show (1, 2, 3, etc.)
    difficulty VARCHAR2(50) DEFAULT 'medium', -- Difficulty levels: easy, medium, hard
    last_reviewed TIMESTAMP,
    review_count NUMBER(10) DEFAULT 0,
    correct_count NUMBER(10) DEFAULT 0,
    incorrect_count NUMBER(10) DEFAULT 0,
    ease_factor NUMBER(10) DEFAULT 250, -- For spaced repetition (250 = 2.5 * 100)
    interval_days NUMBER(10) DEFAULT 0, -- Days until next review
    maturity_level VARCHAR2(50) DEFAULT 'new', -- Maturity levels: new, learning, young, mature
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE SET NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

-- Create Flashcard Reviews table (for detailed statistics tracking)
CREATE TABLE flashcard_reviews (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    flashcard_id VARCHAR2(36) NOT NULL,
    deck_id VARCHAR2(36),
    was_correct NUMBER(1) NOT NULL, -- 1 = correct, 0 = incorrect
    time_spent NUMBER(10), -- Seconds spent on review
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ease_factor NUMBER(10), -- Ease factor at time of review
    interval_days NUMBER(10), -- Interval at time of review
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE,
    FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE SET NULL
);

-- Create Mood Entries table
CREATE TABLE mood_entries (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    mood NUMBER NOT NULL,
    notes CLOB,
    date_entry TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Journal Entries table
CREATE TABLE journal_entries (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    content CLOB NOT NULL,
    date_entry TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Pomodoro Sessions table
CREATE TABLE pomodoro_sessions (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    duration NUMBER NOT NULL,
    type VARCHAR2(20),
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create AI Summaries table
CREATE TABLE ai_summaries (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    title VARCHAR2(500) NOT NULL,
    summary_content CLOB NOT NULL,
    summary_type VARCHAR2(50),
    original_content CLOB,
    file_type VARCHAR2(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create User Preferences table
CREATE TABLE user_preferences (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    theme VARCHAR2(10) DEFAULT 'dark',
    color_scheme CLOB,
    typography CLOB,
    layout CLOB,
    workspace CLOB,
    features CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_class_id ON notes(class_id);
CREATE INDEX idx_classes_user_id ON classes(user_id);
CREATE INDEX idx_assignments_user_id ON assignments(user_id);
CREATE INDEX idx_assignments_class_id ON assignments(class_id);

-- Flashcard Deck indexes
CREATE INDEX idx_deck_user ON flashcard_decks(user_id);
CREATE INDEX idx_deck_parent ON flashcard_decks(parent_deck_id);
CREATE INDEX idx_deck_sort ON flashcard_decks(sort_order);

-- Flashcard indexes
CREATE INDEX idx_flashcard_user ON flashcards(user_id);
CREATE INDEX idx_flashcard_deck ON flashcards(deck_id);
CREATE INDEX idx_flashcard_class ON flashcards(class_id);
CREATE INDEX idx_flashcard_type ON flashcards(card_type);
CREATE INDEX idx_flashcard_maturity ON flashcards(maturity_level);
CREATE INDEX idx_flashcard_last_reviewed ON flashcards(last_reviewed);

-- Flashcard Review indexes
CREATE INDEX idx_review_user ON flashcard_reviews(user_id);
CREATE INDEX idx_review_flashcard ON flashcard_reviews(flashcard_id);
CREATE INDEX idx_review_deck ON flashcard_reviews(deck_id);
CREATE INDEX idx_review_date ON flashcard_reviews(review_date);
CREATE INDEX idx_review_user_date ON flashcard_reviews(user_id, review_date);

CREATE INDEX idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX idx_ai_summaries_user_id ON ai_summaries(user_id);

-- Create triggers for auto-update timestamps
CREATE OR REPLACE TRIGGER trg_deck_update
BEFORE UPDATE ON flashcard_decks
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_flashcard_update
BEFORE UPDATE ON flashcards
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Create views for flashcard statistics
-- Daily Review Statistics View
CREATE OR REPLACE VIEW v_daily_review_stats AS
SELECT 
    user_id,
    TRUNC(review_date) AS review_day,
    COUNT(*) AS total_reviews,
    SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) AS correct_reviews,
    SUM(CASE WHEN was_correct = 0 THEN 1 ELSE 0 END) AS incorrect_reviews,
    ROUND(AVG(CASE WHEN was_correct = 1 THEN 100 ELSE 0 END), 2) AS success_rate,
    AVG(time_spent) AS avg_time_spent,
    COUNT(DISTINCT flashcard_id) AS unique_cards_reviewed
FROM flashcard_reviews
GROUP BY user_id, TRUNC(review_date);

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
    TRUNC(SYSDATE) - TRUNC(r.review_date) AS days_ago,
    COUNT(*) AS reviews_count,
    SUM(CASE WHEN r.was_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
    ROUND(AVG(CASE WHEN r.was_correct = 1 THEN 100 ELSE 0 END), 2) AS retention_rate
FROM flashcards f
INNER JOIN flashcard_reviews r ON f.id = r.flashcard_id
WHERE r.review_date >= (SYSDATE - 30)
GROUP BY f.user_id, f.deck_id, (TRUNC(SYSDATE) - TRUNC(r.review_date));

COMMIT;
