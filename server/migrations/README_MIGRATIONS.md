# Oracle Database Migration Files

##  Files Overview

### 1. `oracle_schema_updated.sql`  **USE THIS FOR FRESH INSTALL**
**Purpose:** Complete database schema for NEW installations  
**When to use:** First time setting up the database  
**What it does:**
- Creates ALL tables from scratch
- Includes enhanced flashcard system with decks, statistics, and cloze cards
- Sets up indexes, triggers, and views
- Ready to run on empty database

**Run this if:**
-  You're setting up the database for the first time
-  You don't have any existing flashcard data
-  You want the latest features from the start

### 2. `flashcard_enhancements.sql`  **USE THIS TO UPGRADE EXISTING DATA**
**Purpose:** Migration script for EXISTING databases  
**When to use:** You already have flashcards and want to upgrade  
**What it does:**
- Backs up existing flashcards automatically
- Drops and recreates flashcard tables with new schema
- Migrates all your existing data safely
- Creates default "Unsorted Cards" deck for existing flashcards
- Adds new tables (decks, reviews)
- Creates indexes, triggers, and views

**Run this if:**
-  You already have a working database with flashcards
-  You want to upgrade to the new flashcard system
-  You want to keep all your existing data

##  How to Run

### Fresh Installation:
```sql
-- Connect to Oracle Cloud
sqlplus username/password@connection_string

-- Run the complete schema
@server/migrations/oracle_schema_updated.sql

-- Verify tables created
SELECT table_name FROM user_tables ORDER BY table_name;
```

### Upgrading Existing Database:
```sql
-- Connect to Oracle Cloud
sqlplus username/password@connection_string

-- Run the migration (it will backup your data automatically)
@server/migrations/flashcard_enhancements.sql

-- Verify migration
SELECT 'Backup' as source, COUNT(*) FROM flashcards_backup
UNION ALL
SELECT 'Current' as source, COUNT(*) FROM flashcards;
```

##  What's New in Enhanced Flashcard System

### 1. **Decks & Subdecks**
Organize flashcards into folders and subfolders:
```
Biology/
├── Cell Biology/
│   ├── Mitochondria
│   └── Nucleus
└── Genetics/
```

### 2. **Cloze Deletion Cards**
Fill-in-the-blank style cards:
```
Original: "Mitochondria are the powerhouse of the cell"
Cloze: "{{c1::Mitochondria}} are the {{c2::powerhouse}} of the {{c3::cell}}"
→ Creates 3 separate review cards
```

### 3. **Comprehensive Statistics**
- Daily review counts and success rates
- Retention curves over time
- Card maturity progression (new → learning → young → mature)
- Per-deck analytics

### 4. **Spaced Repetition**
- Ease factor tracking (adaptive difficulty)
- Review interval scheduling
- Automatic maturity progression

##  New Tables Created

### `flashcard_decks`
- Organize cards into named decks
- Support for subdecks (hierarchical)
- Custom colors and sorting
- 36 characters ID (UUID)

### `flashcards` (Enhanced)
**New fields added:**
- `deck_id` - Link to deck
- `card_type` - 'basic' or 'cloze'
- `cloze_text` - For cloze cards
- `cloze_index` - Which cloze (1, 2, 3...)
- `correct_count` - Success tracking
- `incorrect_count` - Failure tracking
- `ease_factor` - Spaced repetition (default: 250)
- `interval_days` - Days until next review
- `maturity_level` - new/learning/young/mature
- `updated_at` - Last modification

### `flashcard_reviews`
- Complete review history
- Time spent per review
- Correctness tracking
- Historical ease factor and intervals

##  New Views Created

### `v_daily_review_stats`
Daily aggregated statistics per user:
- Total reviews
- Success rate
- Average time spent
- Unique cards reviewed

### `v_deck_stats`
Per-deck performance metrics:
- Total cards
- Cards by maturity level
- Average ease factor
- Average interval

### `v_retention_curve`
30-day retention analysis:
- Retention rate over time
- Review counts by day
- Success rate trends

##  Triggers Added

### `trg_deck_update`
Automatically updates `updated_at` timestamp on deck modifications

### `trg_flashcard_update`
Automatically updates `updated_at` timestamp on flashcard modifications

##  Verification Queries

After running either script, verify with:

```sql
-- Check all tables exist
SELECT table_name FROM user_tables 
WHERE table_name IN (
    'USERS', 'CLASSES', 'NOTES', 'ASSIGNMENTS',
    'FLASHCARD_DECKS', 'FLASHCARDS', 'FLASHCARD_REVIEWS',
    'MOOD_ENTRIES', 'JOURNAL_ENTRIES', 'POMODORO_SESSIONS',
    'AI_SUMMARIES', 'USER_PREFERENCES'
)
ORDER BY table_name;

-- Check flashcard tables specifically
SELECT table_name FROM user_tables 
WHERE table_name IN ('FLASHCARD_DECKS', 'FLASHCARDS', 'FLASHCARD_REVIEWS')
ORDER BY table_name;

-- Check views created
SELECT view_name FROM user_views
WHERE view_name LIKE 'V_%STATS' OR view_name LIKE 'V_RETENTION%'
ORDER BY view_name;

-- Check triggers
SELECT trigger_name FROM user_triggers
WHERE trigger_name LIKE 'TRG_%'
ORDER BY trigger_name;
```

##  Safety Features

### `flashcard_enhancements.sql` includes:
-  Automatic backup before migration
-  Data verification queries
-  Foreign key constraints preserved
-  Default deck creation for orphaned cards
-  Maturity level calculation based on review count
-  Rollback instructions in migration guide

##  Notes

### Column Naming:
- Oracle uses UPPERCASE for column names
- Application code uses camelCase
- Automatic mapping in storage layer

### ID Format:
- Uses VARCHAR2(36) for UUIDs
- Compatible with randomUUID() in Node.js
- SYS_GUID() for Oracle-generated IDs

### CLOB vs VARCHAR2:
- CLOB used for: content, descriptions, preferences
- VARCHAR2 used for: names, emails, short strings

### Foreign Keys:
- ON DELETE CASCADE: Child records deleted with parent
- ON DELETE SET NULL: Child records kept, reference cleared

##  Troubleshooting

### Error: "Table already exists"
- You're running the wrong script
- Use `flashcard_enhancements.sql` instead

### Error: "Cannot drop table"
- Other tables reference it
- Check foreign key constraints
- Use CASCADE CONSTRAINTS in DROP statement

### Error: "Insufficient privileges"
- Contact your DBA
- Ensure you have CREATE TABLE, CREATE VIEW, CREATE TRIGGER permissions

### Data not migrated
- Check `flashcards_backup` table exists
- Run verification queries in migration script
- See troubleshooting section in FLASHCARD_MIGRATION_GUIDE.md

##  Additional Documentation

- `FLASHCARD_MIGRATION_GUIDE.md` - Detailed migration instructions
- `FLASHCARD_ENHANCEMENTS.md` - Implementation roadmap
- `BACKEND_IMPLEMENTATION_COMPLETE.md` - Backend API documentation

##  Post-Migration Checklist

- [ ] All tables created successfully
- [ ] All indexes created
- [ ] All views accessible
- [ ] All triggers enabled
- [ ] Data migrated (if upgrade)
- [ ] Application connects successfully
- [ ] Can create/read flashcards
- [ ] Can create/read decks
- [ ] Statistics display correctly
- [ ] Backup table can be dropped (after 7 days)

---

**Need Help?** Check the full migration guide at `docs/FLASHCARD_MIGRATION_GUIDE.md`
