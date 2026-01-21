-- Migration: Create missing tables for mood_entries and journal_entries
-- Run this in your Supabase SQL Editor

-- Create mood_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 5),
  notes TEXT,
  entry_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create journal_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  content TEXT NOT NULL,
  entry_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON mood_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-run)
DROP POLICY IF EXISTS "Users can view their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can insert their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can update their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can delete their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can view their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON journal_entries;

-- Create RLS policies for mood_entries
CREATE POLICY "Users can view their own mood entries"
  ON mood_entries FOR SELECT
  USING (user_id = auth.uid()::varchar);

CREATE POLICY "Users can insert their own mood entries"
  ON mood_entries FOR INSERT
  WITH CHECK (user_id = auth.uid()::varchar);

CREATE POLICY "Users can update their own mood entries"
  ON mood_entries FOR UPDATE
  USING (user_id = auth.uid()::varchar);

CREATE POLICY "Users can delete their own mood entries"
  ON mood_entries FOR DELETE
  USING (user_id = auth.uid()::varchar);

-- Create RLS policies for journal_entries
CREATE POLICY "Users can view their own journal entries"
  ON journal_entries FOR SELECT
  USING (user_id = auth.uid()::varchar);

CREATE POLICY "Users can insert their own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (user_id = auth.uid()::varchar);

CREATE POLICY "Users can update their own journal entries"
  ON journal_entries FOR UPDATE
  USING (user_id = auth.uid()::varchar);

CREATE POLICY "Users can delete their own journal entries"
  ON journal_entries FOR DELETE
  USING (user_id = auth.uid()::varchar);

-- Grant access to authenticated users (if not using RLS or for service role)
-- This is often needed for Supabase client access
GRANT ALL ON mood_entries TO authenticated;
GRANT ALL ON journal_entries TO authenticated;
GRANT ALL ON mood_entries TO anon;
GRANT ALL ON journal_entries TO anon;
