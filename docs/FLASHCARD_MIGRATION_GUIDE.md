# Flashcard System Enhancement Migration Guide

##  Overview
This guide covers the migration to an enhanced flashcard system with:
- ** Decks & Subdecks** - Organize flashcards into folders and subfolders
- ** Advanced Statistics** - Track retention curves, daily reviews, and maturation
- ** Cloze Deletion Cards** - Fill-in-the-blank style cards for better learning

##  What's New

### 1. Decks & Subdecks
- Organize flashcards into named decks (like folders)
- Create subdecks for hierarchical organization
- Example: Biology → Cell Biology → Mitochondria
- Drag-and-drop reordering
- Color coding for visual organization

### 2. Enhanced Statistics
- **Daily Reviews**: Track cards reviewed per day
- **Success Rates**: Monitor correct vs incorrect answers
- **Retention Curves**: See how well you remember over time
- **Maturity Levels**: Cards progress from new → learning → young → mature
- **Ease Factor**: Adaptive difficulty based on performance
- **Review Intervals**: Spaced repetition scheduling

### 3. Cloze Deletion Cards
- Fill-in-the-blank style learning
- Multiple cloze deletions per card
- Example: "The capital of {{c1::France}} is {{c2::Paris}}"
- AI can generate multiple cloze cards from a single note

##  Database Schema Changes

### New Tables

#### `flashcard_decks`
```sql
- id: VARCHAR2(255) - Primary key
- user_id: VARCHAR2(255) - User reference
- name: CLOB - Deck name
- description: CLOB - Optional description
- parent_deck_id: VARCHAR2(255) - For subdecks (self-referencing)
- color: VARCHAR2(50) - Color for visual organization
- sort_order: NUMBER(10) - Display order
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `flashcards` (Enhanced)
New fields added:
```sql
- deck_id: VARCHAR2(255) - Link to deck
- card_type: VARCHAR2(50) - 'basic' or 'cloze'
- cloze_text: CLOB - Original text with cloze markers
- cloze_index: NUMBER(3) - Which cloze to show (1, 2, 3...)
- correct_count: NUMBER(10) - Times answered correctly
- incorrect_count: NUMBER(10) - Times answered incorrectly
- ease_factor: NUMBER(10) - Spaced repetition factor (250 = 2.5)
- interval_days: NUMBER(10) - Days until next review
- maturity_level: VARCHAR2(50) - new/learning/young/mature
- updated_at: TIMESTAMP
```

#### `flashcard_reviews`
Detailed review history for statistics:
```sql
- id: VARCHAR2(255) - Primary key
- user_id: VARCHAR2(255) - User reference
- flashcard_id: VARCHAR2(255) - Card reference
- deck_id: VARCHAR2(255) - Deck reference
- was_correct: NUMBER(1) - 1 = correct, 0 = incorrect
- time_spent: NUMBER(10) - Seconds spent
- review_date: TIMESTAMP - When reviewed
- ease_factor: NUMBER(10) - Factor at review time
- interval_days: NUMBER(10) - Interval at review time
- created_at: TIMESTAMP
```

### Statistical Views

#### `v_daily_review_stats`
Daily aggregate statistics per user

#### `v_deck_stats`
Card counts and averages per deck

#### `v_retention_curve`
30-day retention rates for analysis

##  Migration Steps

### Prerequisites
1. **Backup your data!**
   ```sql
   -- The migration script creates a backup automatically
   -- but it's good to have your own
   CREATE TABLE my_flashcards_backup AS SELECT * FROM flashcards;
   ```

2. Connect to your Oracle Cloud Database

### Step 1: Run the Migration Script
```bash
# Connect to Oracle Cloud
sqlplus username/password@connection_string

# Run the migration
@server/migrations/flashcard_enhancements.sql
```

### Step 2: Verify Migration
```sql
-- Check tables were created
SELECT table_name FROM user_tables 
WHERE table_name IN ('FLASHCARD_DECKS', 'FLASHCARDS', 'FLASHCARD_REVIEWS')
ORDER BY table_name;

-- Check data was migrated
SELECT 
    'Backup Count' as source, COUNT(*) as count FROM flashcards_backup
UNION ALL
SELECT 
    'Current Count' as source, COUNT(*) as count FROM flashcards;

-- Should show same counts if migration successful

-- Check default decks were created
SELECT user_id, name, COUNT(*) 
FROM flashcard_decks 
GROUP BY user_id, name;
```

### Step 3: Update Application Code
The migration is backward compatible, but to use new features:

1. Update imports in your code:
```typescript
import { 
  FlashcardDeck, 
  InsertFlashcardDeck,
  FlashcardReview,
  InsertFlashcardReview 
} from "@shared/schema";
```

2. Backend routes will handle new fields automatically

3. UI components will be enhanced to show deck organization

##  Using the New Statistics

### Daily Review Statistics
```sql
SELECT * FROM v_daily_review_stats 
WHERE user_id = 'your_user_id'
AND review_day >= SYSDATE - 7
ORDER BY review_day DESC;
```

### Deck Performance
```sql
SELECT * FROM v_deck_stats 
WHERE user_id = 'your_user_id'
ORDER BY deck_name;
```

### Retention Curve (Last 30 Days)
```sql
SELECT * FROM v_retention_curve 
WHERE user_id = 'your_user_id'
ORDER BY days_ago;
```

##  Cloze Card Format

### Creating Cloze Cards
```
Original text: "The capital of France is Paris"

Cloze format: "The capital of {{c1::France}} is {{c2::Paris}}"

This creates 2 cards:
Card 1: "The capital of [...] is Paris" → Answer: France
Card 2: "The capital of France is [...]" → Answer: Paris
```

### AI Generation
The AI will automatically detect and create cloze cards when appropriate:
```typescript
// Input: "Mitochondria are the powerhouse of the cell"
// AI generates:
{
  cardType: "cloze",
  clozeText: "{{c1::Mitochondria}} are the {{c2::powerhouse}} of the {{c3::cell}}",
  // Creates 3 separate review cards
}
```

##  Maturity Progression

Cards automatically progress through maturity levels:

1. **New** (0 reviews)
   - Just created
   - Shown frequently

2. **Learning** (1-4 reviews)
   - Being learned
   - Intervals: 1d → 2d → 3d → 5d

3. **Young** (5-14 reviews)
   - Partially mastered
   - Intervals: 1w → 2w → 3w

4. **Mature** (15+ reviews)
   - Well learned
   - Intervals: 1m → 2m → 3m+
   - Ease factor adjusts based on performance

##  Spaced Repetition Algorithm

### Ease Factor
- Starts at 2.5 (250 in database, scaled by 100)
- Increases when you answer correctly
- Decreases when you answer incorrectly
- Range: 1.3 to 3.5

### Interval Calculation
```
If correct:
  new_interval = old_interval * ease_factor

If incorrect:
  new_interval = 1 day (reset)
  ease_factor -= 0.2
```

##  Deck Organization Best Practices

1. **Top-Level Decks**: Main subjects
   - Biology, Chemistry, History, etc.

2. **Subdecks**: Specific topics
   - Biology → Cell Biology → Organelles
   - History → US History → Civil War

3. **Color Coding**:
   - Red (#ef4444): Urgent/Important
   - Blue (#3b82f6): Regular study
   - Green (#22c55e): Mastered/Review
   - Yellow (#eab308): In progress

##  Troubleshooting

### Issue: Migration fails
```sql
-- Check for constraint violations
SELECT * FROM user_constraints 
WHERE status = 'DISABLED';

-- Re-enable if needed
ALTER TABLE flashcards ENABLE CONSTRAINT fk_flashcard_deck;
```

### Issue: Data not migrated
```sql
-- Check backup table
SELECT COUNT(*) FROM flashcards_backup;

-- Rerun migration INSERT statement
-- (see migration script step 4)
```

### Issue: Views not created
```sql
-- Check for errors
SELECT * FROM user_errors 
WHERE name LIKE 'V_%';

-- Recreate view manually
-- (see migration script step 8)
```

##  Support

For issues or questions:
1. Check the migration verification queries
2. Review Oracle Cloud Database logs
3. Consult `ORACLE_CONNECTION_GUIDE.md`
4. Check application logs for API errors

##  Security Notes

- All foreign key constraints include `ON DELETE CASCADE` or `ON DELETE SET NULL`
- Indexes created for optimal query performance
- Views use user_id filtering for data isolation
- No sensitive data stored in new tables

##  Performance Considerations

### Indexes
The migration creates indexes on:
- user_id (all tables)
- deck_id, parent_deck_id
- review_date, flashcard_id
- maturity_level, card_type

### Optimization Tips
1. Use deck filtering to reduce query load
2. Limit retention curve queries to 30 days
3. Archive old review records after 90 days (optional)
4. Use materialized views for complex statistics (advanced)

##  Rollback Plan

If you need to rollback:
```sql
-- 1. Drop new tables
DROP TABLE flashcard_reviews;
DROP TABLE flashcard_decks CASCADE CONSTRAINTS;

-- 2. Restore from backup
DROP TABLE flashcards;
CREATE TABLE flashcards AS SELECT * FROM flashcards_backup;

-- 3. Recreate original constraints
-- (Use your original schema definition)
```

##  Post-Migration Checklist

- [ ] All tables created successfully
- [ ] Data migrated (counts match)
- [ ] Default decks created for each user
- [ ] Indexes created
- [ ] Views created and accessible
- [ ] Triggers enabled
- [ ] Application connects successfully
- [ ] Can create new flashcards
- [ ] Can create new decks
- [ ] Statistics display correctly
- [ ] Backup table can be dropped (after 7 days of testing)

---

**Migration Version**: 1.0.0  
**Date**: 2025  
**Database**: Oracle Cloud  
**Compatible With**: AlteonV1 v2.0+
