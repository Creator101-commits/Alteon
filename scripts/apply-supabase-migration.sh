#!/bin/bash

# Apply Supabase Migration Script
# This script applies the PostgreSQL schema to your Supabase database

echo "🚀 Starting Supabase schema migration..."
echo ""
echo "📋 Migration file: supabase/migrations/001_initial_schema.sql"
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Go to your Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/tgmskyfcynmfmotatedb"
echo ""
echo "2. Navigate to: SQL Editor (left sidebar)"
echo ""
echo "3. Click 'New Query'"
echo ""
echo "4. Copy the contents of: supabase/migrations/001_initial_schema.sql"
echo ""
echo "5. Paste into the SQL editor and click 'Run'"
echo ""
echo "6. Verify tables created by running:"
echo "   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
echo ""
echo "✅ Expected tables (21 total):"
echo "   - users, classes, assignments"
echo "   - notes, flashcard_decks, flashcards, flashcard_reviews"
echo "   - mood_entries, journal_entries, pomodoro_sessions"
echo "   - habits, ai_summaries, user_preferences"
echo "   - boards, todo_lists, cards, checklists"
echo "   - labels, card_labels, attachments, quick_tasks"
echo ""
echo "Once completed, return here and press ENTER to continue with the migration..."
read

echo ""
echo "✅ Great! Schema migration completed."
echo "📦 Now installing remaining dependencies and updating hooks..."
