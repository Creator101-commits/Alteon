import { useAuth } from '@/contexts/AuthContext';

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status: string;
  created: string;
  updated: string;
  htmlLink: string;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: string;
  backgroundColor?: string;
}

export class GoogleCalendarService {
  private accessToken: string;
  private baseUrl = 'https://www.googleapis.com/calendar/v3';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Google Calendar API Error: ${response.status} - ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // Get all calendars
  async getCalendars(): Promise<GoogleCalendar[]> {
    const response = await this.makeRequest('/users/me/calendarList');
    return response.items || [];
  }

  // Get events from a specific calendar
  async getEvents(calendarId: string = 'primary', options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: string;
  } = {}): Promise<GoogleCalendarEvent[]> {
    const params = new URLSearchParams({
      calendarId,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500', // Get more events by default
      ...options,
    } as Record<string, string>);

    const response = await this.makeRequest(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
    return response.items || [];
  }

  // Get all events from all calendars
  async getAllEvents(options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  } = {}): Promise<{ calendar: GoogleCalendar; events: GoogleCalendarEvent[] }[]> {
    const calendars = await this.getCalendars();
    const results = [];

    for (const calendar of calendars) {
      try {
        const events = await this.getEvents(calendar.id, options);
        results.push({ calendar, events });
      } catch (error) {
        console.warn(`Failed to fetch events from calendar ${calendar.summary}:`, error);
        // Continue with other calendars even if one fails
        results.push({ calendar, events: [] });
      }
    }

    return results;
  }

  // Create a new event
  async createEvent(calendarId: string = 'primary', event: {
    summary: string;
    description?: string;
    start: {
      dateTime?: string;
      date?: string;
      timeZone?: string;
    };
    end: {
      dateTime?: string;
      date?: string;
      timeZone?: string;
    };
    location?: string;
    attendees?: Array<{ email: string }>;
  }): Promise<GoogleCalendarEvent> {
    return this.makeRequest(`/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  // Update an existing event
  async updateEvent(calendarId: string = 'primary', eventId: string, event: Partial<{
    summary: string;
    description?: string;
    start: {
      dateTime?: string;
      date?: string;
      timeZone?: string;
    };
    end: {
      dateTime?: string;
      date?: string;
      timeZone?: string;
    };
    location?: string;
    attendees?: Array<{ email: string }>;
  }>): Promise<GoogleCalendarEvent> {
    return this.makeRequest(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    });
  }

  // Delete an event
  async deleteEvent(calendarId: string = 'primary', eventId: string): Promise<void> {
    await this.makeRequest(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // Watch for changes (webhook setup)
  async watchEvents(calendarId: string = 'primary', webhookUrl: string): Promise<any> {
    return this.makeRequest(`/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
      method: 'POST',
      body: JSON.stringify({
        id: `watch-${Date.now()}`,
        type: 'web_hook',
        address: webhookUrl,
      }),
    });
  }
}

// Helper function to sync Google Calendar data during login
export async function syncGoogleCalendarOnLogin(accessToken: string, userId: string): Promise<{
  calendars: GoogleCalendar[];
  events: GoogleCalendarEvent[];
}> {
  const calendarService = new GoogleCalendarService(accessToken);
  
  try {
    // Get events from the last 30 days and next 365 days
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 365);

    const calendarData = await calendarService.getAllEvents({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    });

    const calendars = calendarData.map(data => data.calendar);
    const allEvents = calendarData.flatMap(data => 
      data.events.map(event => ({
        ...event,
        calendarId: data.calendar.id,
        calendarName: data.calendar.summary,
      }))
    );

    // NOTE: We intentionally DO NOT sync calendar events to database as assignments
    // Calendar events are kept separate and only cached in localStorage
    console.log(` Fetched ${allEvents.length} calendar events (cache only, not synced to DB)`);

    // Store in localStorage for immediate access (cache only)
    localStorage.setItem(`google_calendars_${userId}`, JSON.stringify(calendars));
    localStorage.setItem(`google_events_${userId}`, JSON.stringify(allEvents));
    localStorage.setItem(`google_calendar_last_sync_${userId}`, new Date().toISOString());

    return {
      calendars,
      events: allEvents,
    };
  } catch (error) {
    console.error('Failed to sync Google Calendar data on login:', error);
    throw error;
  }
}

// Helper to get cached calendar data
export function getCachedCalendarData(userId: string) {
  const calendars = localStorage.getItem(`google_calendars_${userId}`);
  const events = localStorage.getItem(`google_events_${userId}`);
  const lastSync = localStorage.getItem(`google_calendar_last_sync_${userId}`);

  return {
    calendars: calendars ? JSON.parse(calendars) : [],
    events: events ? JSON.parse(events) : [],
    lastSync: lastSync ? new Date(lastSync) : null,
  };
}

// Helper to check if we need to refresh calendar data
export function shouldRefreshCalendarData(userId: string, maxAgeMinutes: number = 60): boolean {
  const lastSync = localStorage.getItem(`google_calendar_last_sync_${userId}`);
  if (!lastSync) return true;

  const lastSyncTime = new Date(lastSync);
  const now = new Date();
  const ageMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);

  return ageMinutes > maxAgeMinutes;
}
