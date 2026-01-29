-- Migration: Sync flashcards table with schema and remove references to dropped tables
-- Add missing columns to flashcards table

ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS cloze_text TEXT,
ADD COLUMN IF NOT EXISTS cloze_index INTEGER,
ADD COLUMN IF NOT EXISTS ease_factor INTEGER DEFAULT 250,
ADD COLUMN IF NOT EXISTS interval INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS maturity_level TEXT DEFAULT 'new';
