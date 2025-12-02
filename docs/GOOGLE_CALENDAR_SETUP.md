#  Google Calendar Integration Setup Guide

##  Step-by-Step Setup Instructions

Since you've already enabled the Google Calendar API in Google Cloud Console, here are the remaining steps:

### 1 Get Your OAuth Credentials

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project** (the one where you enabled Calendar API)
3. **Navigate to**: APIs & Services → Credentials
4. **Click "Create Credentials"** → OAuth 2.0 Client IDs
5. **Application type**: Web application
6. **Name**: Alteon Calendar Integration
7. **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   http://localhost:3000
   https://your-domain.com (if you have a production domain)
   ```
8. **Authorized redirect URIs**:
   ```
   http://localhost:5173/auth/calendar/google
   http://localhost:3000/auth/calendar/google
   https://your-domain.com/auth/calendar/google (if you have production domain)
   ```

### 2 Get Client ID and Secret

After creating the OAuth client, you'll get:
- **Client ID**: Copy this value
- **Client Secret**: Copy this value (keep it secure!)

### 3 Update Your .env File

Replace the placeholders in your `.env` file:

```bash
# Google Calendar Integration
VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
```

**Example:**
```bash
VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz
```

### 4 Restart Your Server

After updating the .env file:

```powershell
# Stop the current server (Ctrl+C if running)
# Then restart:
cd "C:\Users\prave\OneDrive\Desktop\Dev\StudyPalReplitWeb-main\ProductivityHub\ProductivityHub"
$env:NODE_ENV="development"; $env:PORT="5000"; npx tsx server/index.ts
```

### 5 Test the Integration

1. **Open your app**: http://localhost:5173
2. **Go to Calendar page**
3. **Click "Integration"** dropdown in the top-right
4. **Select "Connect Google Calendar"**
5. **Complete OAuth flow** - you should be redirected to Google auth
6. **Grant permissions** for calendar access
7. **Get redirected back** to your app with success message

##  Troubleshooting

### Common Issues:

####  "OAuth Error: redirect_uri_mismatch"
**Solution**: Make sure your redirect URI in Google Cloud Console exactly matches:
```
http://localhost:5173/auth/calendar/google
```

####  "Client ID not found"
**Solution**: Check that:
1. You copied the Client ID correctly to `.env`
2. No extra spaces or quotes in the `.env` file
3. Server was restarted after updating `.env`

####  "Access denied"
**Solution**: Make sure you:
1. Grant all requested permissions during OAuth
2. Use the same Google account that has calendar access

####  "API not enabled"
**Solution**: In Google Cloud Console:
1. Go to APIs & Services → Enabled APIs
2. Make sure "Google Calendar API" is enabled
3. If not, click "+ ENABLE APIS AND SERVICES" and search for Calendar API

##  What You'll Get Once Setup

###  Working Features:
- **Calendar Sync**: View Google Calendar events in Alteon
- **Event Creation**: Create calendar events from within the app
- **Smart Scheduling**: AI will consider your existing calendar when suggesting study times
- **Two-way Sync**: Changes sync between Google Calendar and Alteon
- **Assignment Integration**: Link assignments to calendar events

###  Usage:
1. **Calendar Page**: View integrated events
2. **Smart Schedule**: Click "Generate Smart Schedule" for AI-optimized planning
3. **Assignment Tracking**: Automatically sync assignment due dates
4. **Study Sessions**: Schedule and track study sessions

##  Need Help?

If you need help getting your Google Client ID and Secret:

1. **Screenshot your Google Cloud Console** credentials page
2. **Copy the exact error message** if you get one during OAuth
3. **Check browser console** for any JavaScript errors (F12 → Console tab)

The integration should work seamlessly once the OAuth credentials are properly configured!
