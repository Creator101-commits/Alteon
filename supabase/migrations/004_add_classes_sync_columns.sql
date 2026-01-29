-- Add missing columns to classes table
-- These columns support Google Classroom sync functionality

-- Add source column (manual, google_classroom)
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add sync_status column (synced, pending, failed)
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_classes_source 
ON classes(source);

CREATE INDEX IF NOT EXISTS idx_classes_sync_status 
ON classes(sync_status);

-- Add comments for documentation
COMMENT ON COLUMN classes.source IS 'Source of the class: manual or google_classroom';
COMMENT ON COLUMN classes.sync_status IS 'Sync status: synced, pending, or failed';
