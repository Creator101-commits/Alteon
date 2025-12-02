import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleCalendarService, getCachedCalendarData, shouldRefreshCalendarData, syncGoogleCalendarOnLogin } from '@/lib/google-calendar-service';
import { refreshGoogleToken } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    status?: string;
  }>;
  calendarId?: string;
  calendarName?: string;
  isGoogleEvent: boolean;
  googleEventId?: string;
  status: 'confirmed' | 'cancelled' | 'tentative';
  htmlLink?: string;
}

interface Calendar {
  id: string;
  name: string;
  description?: string;
  isPrimary?: boolean;
  backgroundColor?: string;
  isGoogleCalendar: boolean;
}

export const useGoogleCalendarSync = () => {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSyncedRef = useRef(false);

  // Transform Google events to our format
  const transformEvents = useCallback((googleEvents: any[]): CalendarEvent[] => {
    return googleEvents.map((googleEvent: any) => ({
      id: `google-${googleEvent.id}`,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description,
      startTime: new Date(googleEvent.start?.dateTime || googleEvent.start?.date),
      endTime: new Date(googleEvent.end?.dateTime || googleEvent.end?.date),
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map((attendee: any) => ({
        email: attendee.email,
        name: attendee.displayName,
        status: attendee.responseStatus,
      })),
      calendarId: googleEvent.calendarId,
      calendarName: googleEvent.calendarName,
      isGoogleEvent: true,
      googleEventId: googleEvent.id,
      status: googleEvent.status || 'confirmed',
      htmlLink: googleEvent.htmlLink,
    }));
  }, []);

  // Transform calendars to our format
  const transformCalendars = useCallback((googleCalendars: any[]): Calendar[] => {
    return googleCalendars.map((googleCal: any) => ({
      id: googleCal.id,
      name: googleCal.summary,
      description: googleCal.description,
      isPrimary: googleCal.primary,
      backgroundColor: googleCal.backgroundColor,
      isGoogleCalendar: true,
    }));
  }, []);

  // Load cached calendar data
  const loadCachedData = useCallback(() => {
    if (!user?.uid) return false;

    const cached = getCachedCalendarData(user.uid);
    
    if (cached.events.length > 0 || cached.calendars.length > 0) {
      setEvents(transformEvents(cached.events));
      setCalendars(transformCalendars(cached.calendars));
      setLastSync(cached.lastSync);
      setError(null);
      return true;
    }
    return false;
  }, [user?.uid, transformEvents, transformCalendars]);

  // Fetch calendar data from backend API
  const fetchCalendarData = useCallback(async (showToast: boolean = false, retryWithRefresh: boolean = true, overrideToken?: string) => {
    const tokenToUse = overrideToken || userData?.googleAccessToken;
    
    if (!tokenToUse || !user?.uid) {
      setError('No Google Calendar access');
      return false;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/calendar/events', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
          'x-google-token': tokenToUse,
        },
      });

      // If 401, try to refresh the token and retry once
      if (response.status === 401 && retryWithRefresh) {
        console.log(' Token expired, attempting refresh...');
        const refreshResult = await refreshGoogleToken(user.uid);
        
        if (refreshResult?.accessToken) {
          console.log(' Token refreshed, retrying calendar fetch with new token...');
          // Retry with new token - but don't retry again to avoid infinite loop
          setIsLoading(false);
          return fetchCalendarData(showToast, false, refreshResult.accessToken);
        } else {
          throw new Error('Failed to refresh Google token. Please sign in again.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch calendar events');
      }

      const data = await response.json();
      
      // Cache the data
      localStorage.setItem(`google_calendars_${user.uid}`, JSON.stringify(data.calendars));
      localStorage.setItem(`google_events_${user.uid}`, JSON.stringify(data.events));
      localStorage.setItem(`google_calendar_last_sync_${user.uid}`, data.syncedAt);

      // Update state
      setEvents(transformEvents(data.events));
      setCalendars(transformCalendars(data.calendars));
      setLastSync(new Date(data.syncedAt));

      if (showToast) {
        toast({
          title: "Calendar Synced",
          description: `Synced ${data.calendars.length} calendars and ${data.events.length} events`,
        });
      }

      console.log(` Calendar synced: ${data.events.length} events`);
      return true;
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
      setError((error as Error).message);
      
      if (showToast) {
        toast({
          title: "Sync Failed",
          description: (error as Error).message || "Failed to sync calendar data",
          variant: "destructive"
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userData?.googleAccessToken, user?.uid, transformEvents, transformCalendars, toast]);

  // Manual sync function
  const syncCalendarData = useCallback(async () => {
    return fetchCalendarData(true);
  }, [fetchCalendarData]);

  // Check if user has Google Calendar access and load data
  useEffect(() => {
    if (userData?.hasGoogleCalendar && userData?.googleAccessToken) {
      setIsConnected(true);
      
      // First load cached data immediately
      const hasCached = loadCachedData();
      
      // Then auto-sync if needed (and we haven't already synced this session)
      if (!hasSyncedRef.current) {
        hasSyncedRef.current = true;
        
        // If no cached data or cache is stale, fetch fresh data
        if (!hasCached || shouldRefreshCalendarData(user?.uid || '', 30)) {
          console.log(' Auto-syncing calendar data...');
          fetchCalendarData(false);
        }
      }
    } else {
      setIsConnected(false);
      setEvents([]);
      setCalendars([]);
    }
  }, [userData?.hasGoogleCalendar, userData?.googleAccessToken, user?.uid, loadCachedData, fetchCalendarData]);

  // Create a new event in Google Calendar
  const createEvent = useCallback(async (event: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    calendarId?: string;
  }, retryWithRefresh: boolean = true, overrideToken?: string) => {
    const tokenToUse = overrideToken || userData?.googleAccessToken;
    
    if (!tokenToUse || !user?.uid) {
      toast({
        title: "Not Connected",
        description: "Please connect your Google Calendar first.",
        variant: "destructive"
      });
      return null;
    }

    try {
      const calendarService = new GoogleCalendarService(tokenToUse);
      
      const googleEvent = await calendarService.createEvent(event.calendarId || 'primary', {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        location: event.location,
      });

      // Refresh data after creating
      await syncCalendarData();

      toast({
        title: "Event Created",
        description: `"${event.title}" has been added to your Google Calendar`,
      });

      return googleEvent;
    } catch (error: any) {
      console.error('Failed to create calendar event:', error);
      
      // Check if it's a 401 error and try to refresh token
      if (retryWithRefresh && error.message?.includes('401')) {
        console.log(' Token expired during event creation, attempting refresh...');
        const refreshResult = await refreshGoogleToken(user.uid);
        
        if (refreshResult?.accessToken) {
          console.log(' Token refreshed, retrying event creation with new token...');
          // Retry with the new refreshed token
          return createEvent(event, false, refreshResult.accessToken);
        }
      }
      
      toast({
        title: "Failed to Create Event",
        description: "Could not create the event in Google Calendar. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [userData?.googleAccessToken, user?.uid, syncCalendarData, toast]);

  // Update an existing event
  const updateEvent = useCallback(async (eventId: string, updates: {
    title?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
    location?: string;
  }) => {
    if (!userData?.googleAccessToken) return false;

    try {
      const event = events.find(e => e.id === eventId || e.googleEventId === eventId);
      if (!event?.googleEventId || !event?.calendarId) return false;

      const calendarService = new GoogleCalendarService(userData.googleAccessToken);

      const updateData: any = {};
      if (updates.title) updateData.summary = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.startTime) {
        updateData.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
      if (updates.endTime) {
        updateData.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
      if (updates.location !== undefined) updateData.location = updates.location;

      await calendarService.updateEvent(event.calendarId, event.googleEventId, updateData);

      // Refresh data after updating
      await syncCalendarData();

      toast({
        title: "Event Updated",
        description: "The event has been updated in Google Calendar",
      });

      return true;
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      toast({
        title: "Failed to Update Event",
        description: "Could not update the event in Google Calendar",
        variant: "destructive"
      });
      return false;
    }
  }, [userData?.googleAccessToken, events, syncCalendarData, toast]);

  // Delete an event
  const deleteEvent = useCallback(async (eventId: string) => {
    if (!userData?.googleAccessToken) return false;

    try {
      const event = events.find(e => e.id === eventId || e.googleEventId === eventId);
      if (!event?.googleEventId || !event?.calendarId) return false;

      const calendarService = new GoogleCalendarService(userData.googleAccessToken);
      await calendarService.deleteEvent(event.calendarId, event.googleEventId);

      // Refresh data after deleting
      await syncCalendarData();

      toast({
        title: "Event Deleted",
        description: "The event has been removed from Google Calendar",
      });

      return true;
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      toast({
        title: "Failed to Delete Event",
        description: "Could not delete the event from Google Calendar",
        variant: "destructive"
      });
      return false;
    }
  }, [userData?.googleAccessToken, events, syncCalendarData, toast]);

  return {
    // Data
    events,
    calendars,
    lastSync,
    isConnected,
    isLoading,
    error,
    
    // Actions
    syncCalendarData,
    createEvent,
    updateEvent,
    deleteEvent,
    
    // Utility
    needsSync: user?.uid ? shouldRefreshCalendarData(user.uid, 30) : false,
  };
};
