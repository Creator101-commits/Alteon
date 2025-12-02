import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Calendar } from "lucide-react";
import { useAuth } from "./AuthContext";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: "assignment" | "event" | "class" | "personal";
  color: string;
  location?: string;
  attendees?: string[];
  isAllDay?: boolean;
  assignmentId?: string; // Link to assignment if this event is for an assignment
}

interface CalendarContextType {
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, "id">) => string;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
  addAssignmentToCalendar: (assignment: any) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
};

// Helper to serialize events for localStorage (Date objects to ISO strings)
const serializeEvents = (events: CalendarEvent[]): string => {
  return JSON.stringify(events.map(event => ({
    ...event,
    startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
    endTime: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime,
  })));
};

// Helper to deserialize events from localStorage (ISO strings to Date objects)
const deserializeEvents = (data: string): CalendarEvent[] => {
  try {
    const parsed = JSON.parse(data);
    return parsed.map((event: any) => ({
      ...event,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
    }));
  } catch (e) {
    console.error('Failed to parse calendar events from localStorage:', e);
    return [];
  }
};

export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load events from localStorage on mount
  useEffect(() => {
    if (user?.uid) {
      const storageKey = `calendar_events_${user.uid}`;
      const savedEvents = localStorage.getItem(storageKey);
      if (savedEvents) {
        const loadedEvents = deserializeEvents(savedEvents);
        setEvents(loadedEvents);
      }
      setIsInitialized(true);
    } else {
      // Clear events when user logs out
      setEvents([]);
      setIsInitialized(false);
    }
  }, [user?.uid]);

  // Save events to localStorage whenever they change
  useEffect(() => {
    if (user?.uid && isInitialized) {
      const storageKey = `calendar_events_${user.uid}`;
      localStorage.setItem(storageKey, serializeEvents(events));
    }
  }, [events, user?.uid, isInitialized]);

  const addEvent = (event: Omit<CalendarEvent, "id">): string => {
    const id = Date.now().toString();
    const newEvent = { ...event, id };
    setEvents(prev => [...prev, newEvent]);
    return id;
  };

  const updateEvent = (id: string, eventUpdate: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(event => 
      event.id === id ? { ...event, ...eventUpdate } : event
    ));
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(event => event.id !== id));
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  const addAssignmentToCalendar = (assignment: any) => {
    // Check if assignment already has a calendar event
    const existingEvent = events.find(event => event.assignmentId === assignment.id);
    if (existingEvent) return;

    // Create calendar event for the assignment
    const dueTime = new Date(assignment.dueDate);
    const eventId = addEvent({
      title: `� ${assignment.title}`,
      description: `Assignment due for ${assignment.className}\n\n${assignment.description || ''}`,
      startTime: dueTime,
      endTime: new Date(dueTime.getTime() + 60 * 60 * 1000), // 1 hour duration
      type: "assignment",
      color: assignment.classColor || "bg-red-500",
      assignmentId: assignment.id,
    });

    return eventId;
  };

  return (
    <CalendarContext.Provider 
      value={{
        events,
        addEvent,
        updateEvent,
        deleteEvent,
        getEventsForDate,
        addAssignmentToCalendar,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};
