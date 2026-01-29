-- Migration: Add user settings, stats, and achievements to Supabase
-- This moves data from localStorage to the database for better cross-device sync

-- Add new JSONB columns to users table for settings
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS dashboard_widgets JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS gpa_excluded_courses JSONB DEFAULT '[]'::jsonb;

-- Add navigation_style to preferences (if preferences column exists, update it)
-- Note: preferences is already JSONB, navigation_style will be stored inside it

-- Add original_list_id to cards table for tracking where cards came from before completion
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS original_list_id UUID REFERENCES todo_lists(id) ON DELETE SET NULL;

-- Create user_stats table for gamification stats
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_tasks_completed INTEGER DEFAULT 0,
  total_study_minutes INTEGER DEFAULT 0,
  total_assignments_completed INTEGER DEFAULT 0,
  total_notes_created INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_original_list_id ON cards(original_list_id);

-- Add RLS policies for user_stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (auth.uid()::text = user_id OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id = current_setting('app.current_user_id', true));

-- Add RLS policies for user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid()::text = user_id OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own achievements" ON user_achievements
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id = current_setting('app.current_user_id', true));
