# Google Calendar Auto-Sync Integration

## Overview

Your Alteon app now automatically syncs Google Calendar data when users sign in with Google. No separate OAuth flow needed!

## How It Works

### 1. **Automatic Login Integration**
- When users sign in with Google, the app automatically requests Calendar permissions
- Required scopes are added to the Google authentication:
  - `https://www.googleapis.com/auth/calendar` - Full calendar access
  - `https://www.googleapis.com/auth/calendar.events` - Events read/write access

### 2. **Auto-Sync Process**
```typescript
// During Google sign-in:
1. User grants Google Calendar permissions
2. App receives access token with calendar scopes  
3. Calendar data is automatically synced (past 30 days + next 365 days)
4. Data is cached locally for offline access
5. User's hasGoogleCalendar flag is set to true
```

### 3. **Data Storage**
- **Firestore**: User profile with `hasGoogleCalendar: true`
- **LocalStorage**: Cached calendar events and calendars
- **Access Token**: Stored securely for API calls

## Required Google Cloud Console Setup

### Authorized Redirect URIs
Add these to your Google OAuth Client:
```
http://localhost:3000/auth/calendar/google  (development)
http://localhost:5173/auth/calendar/google  (Vite dev)
https://yourdomain.com/auth/calendar/google  (production)
```

### OAuth Consent Screen
- Add Calendar scopes to your consent screen
- Ensure your app is verified for calendar access

## Implementation Details

### Key Files Created/Updated

1. **`/lib/google-calendar-service.ts`**
   - Full Google Calendar API wrapper
   - CRUD operations for events
   - Bulk sync functionality

2. **`/hooks/useGoogleCalendarSync.ts`**  
   - React hook for calendar management
   - Auto-refresh stale data
   - Create/update/delete events

3. **`/lib/firebase.ts`** (Updated)
   - Added calendar scopes to GoogleAuthProvider
   - Auto-sync calendar data during login
   - Enhanced user profile with calendar flags

4. **`/contexts/AuthContext.tsx`** (Updated)
   - Added `hasGoogleCalendar` status
   - Enhanced user authentication state

5. **`/hooks/useCalendarIntegration.ts`** (Updated)
   - Simplified to use existing Google login
   - No separate OAuth flow needed

## Usage Examples

### In Components
```typescript
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';

function CalendarComponent() {
  const { 
    events,           // All calendar events
    calendars,        // Available calendars
    isConnected,      // Connection status  
    createEvent,      // Create new event
    syncCalendarData  // Manual refresh
  } = useGoogleCalendarSync();

  // Events are automatically loaded and kept in sync
}
```

### Creating Events
```typescript
const newEvent = await createEvent({
  title: "Study Session",
  description: "Math homework",
  startTime: new Date("2025-09-02T14:00:00"),
  endTime: new Date("2025-09-02T15:00:00"),
  location: "Library"
});
```

## Benefits

 **Seamless UX**: No separate calendar connection needed
 **Automatic Sync**: Data synced during login
 **Offline Access**: Events cached locally
 **Real-time Updates**: Auto-refresh stale data
 **Bi-directional**: Create/edit events in Google Calendar
 **Multi-calendar**: Supports all user's Google calendars

## Calendar Button Behavior

### Before Google Sign-in
- "Connect Google Calendar" → Shows message to sign in with Google first

### After Google Sign-in  
- "Connect Google Calendar" → Triggers manual sync of existing calendar data
- Shows sync status and event count

## Data Sync Strategy

### Initial Sync (Login)
- Past 30 days of events
- Next 365 days of events  
- All accessible calendars

### Auto-Refresh
- Refreshes if data is >60 minutes old
- Triggered when user opens calendar
- Manual sync available

### Event Management
- Create → Immediately syncs to Google
- Update → Updates in Google + refreshes local data
- Delete → Removes from Google + refreshes local data

## Error Handling

- **No Google Login**: Prompts to sign in with Google
- **Expired Token**: Handles token refresh automatically
- **API Errors**: Graceful fallback with user notifications
- **Network Issues**: Uses cached data when offline

This integration provides a seamless calendar experience where users get automatic calendar sync just by signing in with Google!
