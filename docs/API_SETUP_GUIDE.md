# Alteon API Setup Guide

## Required API Keys & Setup

###  Already Configured
- **Groq AI API** - Already working for AI chat and summarization

###  Optional Integrations (Choose what you need)

## 1. Google Calendar Integration
To enable Google Calendar sync in the Calendar page:

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Create a new project** or select existing one
3. **Enable Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. **Create OAuth 2.0 credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost:5173/auth/calendar/google`
5. **Copy Client ID** and add to `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
   ```

## 2. Microsoft Outlook Calendar
To enable Outlook Calendar sync:

1. **Go to Azure Portal**: https://portal.azure.com
2. **Register an app**:
   - Go to "Azure Active Directory" → "App registrations"
   - Click "New registration"
   - Name: "Alteon Calendar Integration"
   - Redirect URI: `http://localhost:5173/auth/calendar/outlook`
3. **Configure permissions**:
   - Go to "API permissions"
   - Add "Microsoft Graph" → "Calendars.Read", "Calendars.ReadWrite"
4. **Copy Application ID** and add to `.env`:
   ```
   VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
   ```

## 3. Quizlet Integration
To enable Quizlet flashcard import/export:

1. **Quizlet Developer**: https://quizlet.com/api/2.0/docs
2. **Create app** and get API credentials
3. Add to `.env`:
   ```
   VITE_QUIZLET_CLIENT_ID=your_quizlet_client_id_here
   VITE_QUIZLET_CLIENT_SECRET=your_quizlet_client_secret_here
   ```

## 4. Notion Integration
To enable Notion flashcard sync:

1. **Notion Developers**: https://developers.notion.com
2. **Create integration** with read/write permissions
3. Add to `.env`:
   ```
   VITE_NOTION_API_KEY=your_notion_integration_token_here
   ```

## 5. Anki Integration
For Anki desktop sync:

1. **Install AnkiConnect addon** in Anki desktop
2. **No API key needed** - works locally via HTTP

## 6. Firebase (Optional - for cloud sync)
If you want cloud data storage:

1. **Firebase Console**: https://console.firebase.google.com
2. **Create project** and enable Authentication, Firestore
3. Add configuration to `.env`:
   ```
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## Current .env Template
Your `.env` file should look like this:

```bash
# AI API ( Working)
VITE_GROQ_API_KEY=aowidjoaiwjdoaiwdjoaiwdji

# Google Calendar (Optional)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Microsoft Outlook (Optional)  
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id_here

# Flashcard Integrations (Optional)
VITE_QUIZLET_CLIENT_ID=your_quizlet_client_id_here
VITE_QUIZLET_CLIENT_SECRET=your_quizlet_client_secret_here
VITE_NOTION_API_KEY=your_notion_integration_token_here

# Firebase (Optional)
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Database (Optional)
DATABASE_URL=postgresql://username:password@localhost:5432/alteon
```

## What Works Right Now
-  **AI Chat & Summarization** - Fully functional
-  **Local features** - Notes, assignments, habits, pomodoro timer
-  **Gamification** - XP, levels, achievements
-  **Dashboard customization** - Drag & drop widgets
-  **Performance optimization** - Caching, lazy loading

## What Needs API Keys
-  **Calendar sync** - Google/Outlook integration
-  **Flashcard import** - Quizlet, Notion sync
-  **Cloud storage** - Firebase for data backup

The app works perfectly without these API keys - they just enable additional cloud integrations!
