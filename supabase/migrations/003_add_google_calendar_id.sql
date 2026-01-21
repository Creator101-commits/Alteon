-- Add missing columns to assignments table
-- These columns support Google Calendar/Classroom sync functionality

-- Add google_calendar_id column
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;

-- Add source column (manual, google_classroom, google_calendar)
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add sync_status column (synced, pending, failed)
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_google_calendar_id 
ON assignments(google_calendar_id) 
WHERE google_calendar_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_source 
ON assignments(source);

CREATE INDEX IF NOT EXISTS idx_assignments_sync_status 
ON assignments(sync_status);

-- Add comments for documentation
COMMENT ON COLUMN assignments.google_calendar_id IS 'Google Calendar event ID for assignments synced from Google Calendar';
COMMENT ON COLUMN assignments.source IS 'Source of the assignment: manual, google_classroom, or google_calendar';
COMMENT ON COLUMN assignments.sync_status IS 'Sync status: synced, pending, or failed';
