import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { syncGoogleCalendarOnLogin } from '@/lib/google-calendar-service';

interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  description?: string;
  location?: string;
  source: 'google' | 'outlook' | 'local';
  externalId?: string;
}

interface CalendarIntegration {
  provider: 'google' | 'outlook';
  accessToken?: string;
  refreshToken?: string;
  isConnected: boolean;
}

export const useCalendarIntegration = () => {
  const { user, userData, hasGoogleCalendar } = useAuth();
  const { toast } = useToast();
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    const checkConnections = () => {
      const providers = [];
      if (hasGoogleCalendar) {
        providers.push('google');
      }
      if (localStorage.getItem('outlook_calendar_access_token')) {
        providers.push('outlook');
      }
      setConnectedProviders(providers);
    };

    checkConnections();
  }, [hasGoogleCalendar]);

  const connectGoogleCalendar = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Check if user has Google Calendar access through their Google login
      if (userData?.hasGoogleCalendar && userData?.googleAccessToken && user?.uid) {
        // User already has Google Calendar access, just sync the data
        try {
          const result = await syncGoogleCalendarOnLogin(userData.googleAccessToken, user.uid);
          setConnectedProviders(prev => [...new Set([...prev, 'google'])]);
          toast({
            title: "Connected!",
            description: `Synced ${result.calendars.length} calendars and ${result.events.length} events`,
          });
          return true;
        } catch (syncError) {
          throw syncError;
        }
      } else {
        // User needs to sign in with Google first
        toast({
          title: "Sign In Required",
          description: "Please sign in with Google to access Calendar integration. Google Calendar data will be automatically synced when you sign in.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to sync Google Calendar. Please try signing in with Google again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const connectOutlookCalendar = async (): Promise<boolean> => {
    try {
      // Microsoft Graph API OAuth
      const scope = 'https://graph.microsoft.com/calendars.read https://graph.microsoft.com/calendars.readwrite';
      
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${import.meta.env.VITE_MICROSOFT_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(window.location.origin + '/auth/calendar/outlook')}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_mode=query`;

      window.location.href = authUrl;
      return true;
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Outlook Calendar.",
        variant: "destructive"
      });
      return false;
    }
  };

  const fetchGoogleCalendarEvents = async (accessToken: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
    try {
      const timeMin = startDate.toISOString();
      const timeMax = endDate.toISOString();
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Google Calendar events');
      }

      const data = await response.json();
      
      return data.items.map((event: any) => ({
        id: `google_${event.id}`,
        title: event.summary || 'Untitled Event',
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        description: event.description,
        location: event.location,
        source: 'google' as const,
        externalId: event.id
      }));
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      throw error;
    }
  };

  const fetchOutlookCalendarEvents = async (accessToken: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
    try {
      const startDateTime = startDate.toISOString();
      const endDateTime = endDate.toISOString();
      
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendar/events?` +
        `$filter=start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'&` +
        `$orderby=start/dateTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Outlook Calendar events');
      }

      const data = await response.json();
      
      return data.value.map((event: any) => ({
        id: `outlook_${event.id}`,
        title: event.subject || 'Untitled Event',
        start: event.start.dateTime,
        end: event.end.dateTime,
        description: event.body?.content,
        location: event.location?.displayName,
        source: 'outlook' as const,
        externalId: event.id
      }));
    } catch (error) {
      console.error('Error fetching Outlook Calendar events:', error);
      throw error;
    }
  };

  const exportToGoogleCalendar = async (events: CalendarEvent[], accessToken: string): Promise<boolean> => {
    try {
      const promises = events.map(async (event) => {
        const googleEvent = {
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.start,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: event.end,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          location: event.location
        };

        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(googleEvent)
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to create event: ${event.title}`);
        }

        return response.json();
      });

      await Promise.all(promises);
      
      toast({
        title: "Export Successful",
        description: `Exported ${events.length} events to Google Calendar.`,
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export events to Google Calendar.",
        variant: "destructive"
      });
      return false;
    }
  };

  const syncCalendarEvents = async (integration: CalendarIntegration, startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
    if (!integration.accessToken) {
      throw new Error('No access token available');
    }

    let events: CalendarEvent[] = [];
    
    if (integration.provider === 'google') {
      events = await fetchGoogleCalendarEvents(integration.accessToken, startDate, endDate);
    } else if (integration.provider === 'outlook') {
      events = await fetchOutlookCalendarEvents(integration.accessToken, startDate, endDate);
    }

    // Save to localStorage for offline access
    if (user?.uid) {
      const storageKey = `external_calendar_events_${user.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(events));
    }

    return events;
  };

  const getStoredIntegrations = (): CalendarIntegration[] => {
    if (!user?.uid) return [];
    
    const stored = localStorage.getItem(`calendar_integrations_${user.uid}`);
    return stored ? JSON.parse(stored) : [];
  };

  const saveIntegration = (integration: CalendarIntegration) => {
    if (!user?.uid) return;
    
    const integrations = getStoredIntegrations();
    const updated = integrations.filter(i => i.provider !== integration.provider);
    updated.push(integration);
    
    localStorage.setItem(`calendar_integrations_${user.uid}`, JSON.stringify(updated));
  };

  const removeIntegration = (provider: 'google' | 'outlook') => {
    if (!user?.uid) return;
    
    const integrations = getStoredIntegrations();
    const updated = integrations.filter(i => i.provider !== provider);
    
    localStorage.setItem(`calendar_integrations_${user.uid}`, JSON.stringify(updated));
    
    toast({
      title: "Integration Removed",
      description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Calendar has been disconnected.`,
    });
  };

  return {
    // Connection functions
    connectGoogleCalendar,
    connectOutlookCalendar,
    
    // Data sync
    syncCalendarEvents,
    exportToGoogleCalendar,
    
    // Storage functions
    getStoredIntegrations,
    saveIntegration,
    removeIntegration,
    
    // State
    connectedProviders,
    isLoading,
    
    // Helper functions
    isGoogleConnected: connectedProviders.includes('google'),
    isOutlookConnected: connectedProviders.includes('outlook'),
  };
};
