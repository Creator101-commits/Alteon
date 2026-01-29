-- Drop unused wellbeing tables and user streak columns
-- Date: January 22, 2026

-- Drop tables that are not being used
DROP TABLE IF EXISTS mood_entries CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS pomodoro_sessions CASCADE;

-- Drop user streak columns (if they were added)
ALTER TABLE users DROP COLUMN IF EXISTS daily_streak;
ALTER TABLE users DROP COLUMN IF EXISTS last_streak_date;
