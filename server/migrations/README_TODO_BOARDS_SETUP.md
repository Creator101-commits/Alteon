# To-Do Board Database Setup Instructions

## Quick Start

1. **Open Oracle SQL Console** (SQL Developer, SQLcl, or Oracle Cloud console)

2. **Connect to your database** with your credentials

3. **Run the migration script:**
   - Open file: `server/migrations/todo_boards_schema.sql`
   - Execute the entire file in your SQL console
   - Wait for "Statement processed" confirmation

4. **Verify tables were created:**
   ```sql
   SELECT table_name FROM user_tables 
   WHERE table_name IN ('BOARDS', 'TODO_LISTS', 'CARDS', 'CHECKLISTS', 'LABELS', 'CARD_LABELS', 'ATTACHMENTS');
   ```
   You should see 7 tables listed.

5. **Restart your Alteon server** (if it's running)

6. **Test the To-Do Board:**
   - Navigate to `/todo-list` in your app
   - Create a new board
   - Add lists and cards

## Troubleshooting

### If you get "table already exists" errors:
This means you previously tried to create the tables. Drop them first:
```sql
DROP TABLE attachments CASCADE CONSTRAINTS;
DROP TABLE card_labels CASCADE CONSTRAINTS;
DROP TABLE checklists CASCADE CONSTRAINTS;
DROP TABLE cards CASCADE CONSTRAINTS;
DROP TABLE labels CASCADE CONSTRAINTS;
DROP TABLE todo_lists CASCADE CONSTRAINTS;
DROP TABLE boards CASCADE CONSTRAINTS;
DROP SEQUENCE board_position_seq;
DROP SEQUENCE list_position_seq;
DROP SEQUENCE card_position_seq;
```

Then run the migration script again.

### If you get "foreign key constraint" errors:
Make sure the `users` table exists (it should from Alteon's main schema).

## What Gets Created

- **boards** - Your kanban boards
- **todo_lists** - Columns within boards
- **cards** - Individual tasks
- **checklists** - Subtasks within cards
- **labels** - Tags for cards
- **card_labels** - Links cards to labels
- **attachments** - File attachments (future feature)

## Default Labels

The script creates 7 system labels:
- High Priority (red)
- Medium Priority (orange)  
- Low Priority (green)
- Reading (blue)
- Practice (purple)
- Project (pink)
- Exam Prep (rose)

You can create custom labels from the UI after setup.
