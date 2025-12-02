-- Add Google sync fields to classes table
ALTER TABLE classes ADD (
  source VARCHAR2(50) DEFAULT 'manual',
  sync_status VARCHAR2(50) DEFAULT 'synced'
);

-- Add Google sync fields to assignments table
ALTER TABLE assignments ADD (
  google_calendar_id VARCHAR2(255),
  source VARCHAR2(50) DEFAULT 'manual',
  sync_status VARCHAR2(50) DEFAULT 'synced'
);

-- Add comments for documentation
COMMENT ON COLUMN classes.source IS 'Data source: manual, google_classroom';
COMMENT ON COLUMN classes.sync_status IS 'Sync status: synced, pending, failed';
COMMENT ON COLUMN assignments.google_calendar_id IS 'Google Calendar event ID';
COMMENT ON COLUMN assignments.source IS 'Data source: manual, google_classroom, google_calendar';
COMMENT ON COLUMN assignments.sync_status IS 'Sync status: synced, pending, failed';
