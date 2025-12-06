-- Performance Indexes Migration
-- Critical indexes for query performance on foreign keys
-- Run this migration to improve query speed on large datasets
-- For Oracle: These use standard Oracle syntax

-- Assignments indexes (some may already exist)
CREATE INDEX idx_assignments_user_id ON assignments(user_id);
CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
CREATE INDEX idx_assignments_status ON assignments(status);

-- Classes indexes
CREATE INDEX idx_classes_user_id ON classes(user_id);

-- Flashcard indexes (CORRECTED table/column names)
CREATE INDEX idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);

-- Todo Boards indexes
CREATE INDEX idx_boards_user_id ON boards(user_id);
CREATE INDEX idx_todo_lists_board_id ON todo_lists(board_id);
CREATE INDEX idx_cards_list_id ON cards(list_id);

-- Notes indexes
CREATE INDEX idx_notes_user_id ON notes(user_id);

-- Mood & Journal indexes
CREATE INDEX idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);

-- Flashcard Reviews indexes
CREATE INDEX idx_flashcard_reviews_user_id ON flashcard_reviews(user_id);
CREATE INDEX idx_flashcard_reviews_flashcard_id ON flashcard_reviews(flashcard_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_assignments_user_status ON assignments(user_id, status);
CREATE INDEX idx_assignments_class_due ON assignments(class_id, due_date);
CREATE INDEX idx_flashcards_deck_maturity ON flashcards(deck_id, maturity_level);
CREATE INDEX idx_cards_list_position ON cards(list_id, position);
