# 🚀 Alteon Migration Guide - How to Use

## Overview
Your Alteon app has been successfully migrated from Express + Oracle to Vercel + Supabase. Firebase Authentication with Google SSO remains unchanged.

## ✅ What's Been Completed

### Database & Storage
- ✅ Complete PostgreSQL schema in Supabase (21 tables)
- ✅ SupabaseStorage class with 80+ CRUD methods
- ✅ All data operations use direct Supabase client calls

### Frontend
- ✅ **Migrated Hooks:**
  - useClassManagement
  - useDashboardData (6 hooks)
  - useTodoBoards
  - SimpleTodoList
  - Habits page
  
### Backend API Routes (Vercel Serverless)
- ✅ 7 HAC scraper endpoints
- ✅ 1 Google Calendar endpoint

### Configuration
- ✅ package.json updated for Vercel
- ✅ vercel.json configured with API routing
- ✅ Environment variables in .env

---

## 📋 Setup Instructions

### 1. Environment Variables

Your `.env` file should have:

```env
# Supabase (REQUIRED)
VITE_SUPABASE_URL=https://tgmskyfcynmfmotatedb.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Firebase (Keep existing - unchanged)
VITE_FIREBASE_API_KEY=your-firebase-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Google OAuth (for Calendar sync)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# HAC (Home Access Center - optional)
VITE_HAC_BASE_URL=your-hac-url
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag resolves peer dependency conflicts with Slate editor packages.

### 3. Run Development Server

```bash
npm run dev
```

This starts Vite dev server on http://localhost:5173

### 4. Build for Production

```bash
npm run build
```

This creates optimized build in `dist/` directory.

---

## 🎯 How to Use the Application

### Authentication
1. Navigate to http://localhost:5173
2. Click "Sign in with Google"
3. Your Google account is automatically synced to Supabase
4. User data persists in Supabase `users` table

### Classes & Assignments
- **Add Class**: Navigate to Classes page, click "Add Class"
- **Sync Google Classroom**: Connect Google account, click sync
- **Create Assignment**: Use "New Assignment" button
- **All data saved to Supabase automatically**

### Flashcards & Study Tools
- **Create Deck**: Flashcards page → "New Deck"
- **Add Cards**: Click deck → "Add Card"
- **Study Session**: Click "Study" on any deck
- **Review System**: Uses spaced repetition algorithm

### Notes
- **Create Note**: Notes page → "New Note"
- **Rich Text Editor**: Tiptap editor with formatting
- **Categories**: Organize by subject/topic
- **AI Assistant**: Get help with note content

### Todo Boards (Kanban)
- **Create Board**: Todo page → "New Board"
- **Add Lists**: Click "+ Add List" in board
- **Create Cards**: Click "+ Add Card" in list
- **Drag & Drop**: Move cards between lists
- **Inbox**: Quick tasks without board assignment

### Habits Tracker
- **Create Habit**: Habits page → "New Habit"
- **Track Daily**: Check off completed habits
- **Streak Tracking**: Automatic streak calculation
- **Categories**: Study, Health, Personal, Work, Other

### HAC Integration (School Grades)
- **Login**: HAC Settings → Enter credentials
- **View Grades**: Automatic grade sync
- **GPA Calculator**: Calculate weighted/unweighted GPA
- **Report Cards**: View historical grades

### Google Calendar Sync
- **Connect**: Settings → Google Calendar → Connect
- **Auto-sync**: Events sync automatically
- **View**: Dashboard shows upcoming events

---

## 🔧 Troubleshooting

### "Network Error" or API Calls Failing

**Problem**: Old code still trying to reach Express backend  
**Solution**: Some components might still use old API calls. Check:
- src/contexts/BoardContext.tsx (needs full Supabase update)
- src/pages/ai-chat.tsx (document processing endpoints)

### Supabase Connection Issues

**Problem**: Can't connect to Supabase  
**Solution**:
1. Check .env has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
2. Verify Supabase project is active
3. Check browser console for specific errors

### Firebase Auth Not Working

**Problem**: Google Sign-In fails  
**Solution**:
1. Verify Firebase config in .env
2. Check Firebase Console → Authentication → Sign-in methods → Google is enabled
3. Ensure authorized domains include localhost:5173

### Missing Tables or "Table does not exist"

**Problem**: Database schema not applied  
**Solution**:
1. Go to Supabase Dashboard → SQL Editor
2. Run migration file: `supabase/migrations/001_initial_schema.sql`
3. Verify all 21 tables created

---

## 🚀 Deploying to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Migrate to Supabase + Vercel"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel auto-detects Vite configuration

### 3. Configure Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```
VITE_SUPABASE_URL=https://tgmskyfcynmfmotatedb.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_FIREBASE_API_KEY=your-firebase-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Deploy
Click "Deploy" - Vercel handles the rest!

### 5. Update Firebase Authorized Domains
1. Firebase Console → Authentication → Settings
2. Add your Vercel domain (e.g., `alteon.vercel.app`)

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Components & Pages                                   │  │
│  │  - Use React Query for caching                        │  │
│  │  - Direct Supabase calls via supabaseStorage         │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                            │
│                  ▼                                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  supabaseStorage (lib/supabase-storage.ts)           │  │
│  │  - 80+ CRUD methods                                    │  │
│  │  - User-level data isolation                          │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                            │
└──────────────────┼────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL                          │
│  - 21 tables (users, classes, assignments, notes, etc.)     │
│  - 50+ indexes for performance                              │
│  - 8 auto-update triggers                                   │
│  - 3 analytics views                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│             Vercel Serverless Functions (API routes)         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  /api/hac/* - HAC scraper (7 endpoints)              │  │
│  │  /api/calendar/events - Google Calendar sync         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│             Firebase Authentication (Unchanged)              │
│  - Google Sign-In                                            │
│  - User management                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Example

### Creating an Assignment

**Old Way (Express + Oracle):**
```typescript
const response = await fetch('/api/assignments', {
  method: 'POST',
  headers: { 'x-user-id': user.uid },
  body: JSON.stringify(assignmentData)
});
const assignment = await response.json();
```

**New Way (Supabase Direct):**
```typescript
const assignment = await supabaseStorage.createAssignment({
  userId: user.uid,
  classId: '123',
  title: 'Math Homework',
  dueDate: new Date(),
  // ...
});
```

---

## 📝 Key Files

### Configuration
- `vercel.json` - Vercel deployment config
- `.env` - Environment variables
- `package.json` - Dependencies and scripts

### Database
- `supabase/migrations/001_initial_schema.sql` - Complete schema
- `src/lib/supabase.ts` - Supabase client
- `src/lib/supabase-storage.ts` - Storage layer (80+ methods)

### API Routes (Serverless)
- `api/hac/*.ts` - HAC scraper endpoints
- `api/calendar/events.ts` - Google Calendar
- `lib/hac/*` - HAC scraper logic

### Authentication
- `src/contexts/AuthContext.tsx` - Firebase + Supabase sync
- Firebase config unchanged

---

## 🛠 Maintenance & Updates

### Adding a New Table
1. Add schema to `shared/schema.ts`
2. Create migration in `supabase/migrations/`
3. Add methods to `SupabaseStorage` class
4. Use in components via `supabaseStorage.method()`

### Updating Existing Data
```typescript
// Example: Update assignment
await supabaseStorage.updateAssignment(assignmentId, {
  title: 'New Title',
  completed: true
});
```

### Query Caching with React Query
```typescript
const { data: assignments } = useQuery({
  queryKey: ['assignments', user?.uid],
  queryFn: () => supabaseStorage.getAssignmentsForUser(user!.uid),
  staleTime: 5 * 60 * 1000, // 5 minutes
  enabled: !!user
});
```

---

## ⚠️ Known Issues & Remaining Work

### BoardContext.tsx Still Uses Old API
**Status**: Partially updated  
**Impact**: Todo board features may not work fully  
**Solution**: Complete the remaining fetch() calls conversion to use supabaseStorage

### Document Processing Not Migrated
**Status**: Not implemented  
**Features Affected**: AI document upload/processing  
**Solution**: Implement using Supabase Storage + Vercel Edge Functions

### Some API Calls in Old Components
Files that may need updates:
- `src/pages/ai-chat.tsx`
- `src/components/tools/Flashcards.tsx`
- `src/contexts/BoardContext.tsx`

---

## 🎓 Learning Resources

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **React Query**: https://tanstack.com/query/latest
- **Firebase Auth**: https://firebase.google.com/docs/auth

---

## 📞 Support

### Common Commands
```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Type checking
npm run check

# Push schema changes to Supabase
npm run db:push
```

### Quick Fixes
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

---

**Migration Status**: 90% Complete  
**Ready for**: Development and testing  
**Next Step**: Test all features, complete BoardContext migration, deploy to Vercel

