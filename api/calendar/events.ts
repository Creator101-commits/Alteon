import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const userId = req.headers['x-user-id'] as string;
  const googleToken = req.headers['x-google-token'] as string;

  if (!userId || !googleToken) {
    return res.status(401).json({ message: 'Missing user ID or Google token' });
  }

  try {
    // Create OAuth2 client with the provided token
    const auth = new google.auth.OAuth2(
      process.env.VITE_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    auth.setCredentials({
      access_token: googleToken,
    });

    // Create calendar API client
    const calendar = google.calendar({ version: 'v3', auth });

    // Fetch events from the primary calendar
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: twoWeeksFromNow.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    // Transform events to match expected format
    const transformedEvents = events.map((event: any) => ({
      id: event.id,
      summary: event.summary || 'No Title',
      description: event.description || '',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      location: event.location,
      attendees: event.attendees?.map((a: any) => a.email) || [],
      htmlLink: event.htmlLink,
      colorId: event.colorId,
    }));

    return res.status(200).json(transformedEvents);
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);

    if (error.code === 401) {
      return res.status(401).json({ message: 'Token expired or invalid' });
    }

    return res.status(500).json({ 
      message: 'Failed to fetch calendar events',
      error: error.message 
    });
  }
}
