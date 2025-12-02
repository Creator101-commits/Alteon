import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  RefreshCw
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  getHours,
  getMinutes,
  differenceInMinutes
} from "date-fns";
import { useCalendar, CalendarEvent } from "@/contexts/CalendarContext";
import { useActivity } from "@/contexts/ActivityContext";
import { useSmartScheduling } from "@/hooks/useSmartScheduling";
import { useGoogleCalendarSync } from "@/hooks/useGoogleCalendarSync";
import { useGoogleClassroom } from "@/hooks/useGoogleClassroom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Constants for the weekly calendar
const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 7; // 7 AM
const END_HOUR = 22; // 10 PM
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

type ViewMode = "month" | "week" | "day";

export default function Calendar() {
  const { user, userData, hasGoogleCalendar } = useAuth();
  const { events, addEvent, getEventsForDate } = useCalendar();
  const { addActivity } = useActivity();
  const { generateOptimalSchedule, saveScheduleToCalendar } = useSmartScheduling();
  const {
    events: googleEvents,
    calendars: googleCalendars,
    isConnected: isGoogleConnected,
    isLoading: isCalendarLoading,
    error: calendarError,
    syncCalendarData,
    createEvent: createGoogleEvent,
    lastSync
  } = useGoogleCalendarSync();
  const { syncClassroomData } = useGoogleClassroom();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startTime: undefined as Date | undefined,
    endTime: undefined as Date | undefined,
    type: "event" as const,
    location: "",
    isAllDay: false,
  });

  // Merge local events with Google Calendar events
  const getAllEvents = () => {
    const localEvents = events;
    
    // Convert Google Calendar events to local format
    const convertedGoogleEvents: CalendarEvent[] = googleEvents.map(googleEvent => {
      // Ensure dates are valid Date objects
      const startTime = googleEvent.startTime instanceof Date 
        ? googleEvent.startTime 
        : new Date(googleEvent.startTime);
      const endTime = googleEvent.endTime instanceof Date 
        ? googleEvent.endTime 
        : new Date(googleEvent.endTime);

      return {
        id: googleEvent.id,
        title: googleEvent.title,
        start: startTime,
        end: endTime,
        startTime: startTime, // For backward compatibility with calendar display
        endTime: endTime,     // For backward compatibility with calendar display
        description: googleEvent.description,
        location: googleEvent.location,
        isAllDay: false, // We'll determine this from the dates
        priority: 'medium' as const,
        category: 'meeting' as const,
        color: 'bg-blue-500', // Google events in blue
        type: 'event' as const,
        source: 'google' as const,
        googleEventId: googleEvent.googleEventId,
        calendarName: googleEvent.calendarName,
      };
    }).filter(event => 
      // Only include events with valid dates
      event.startTime instanceof Date && !isNaN(event.startTime.getTime()) &&
      event.endTime instanceof Date && !isNaN(event.endTime.getTime())
    );

    return [...localEvents, ...convertedGoogleEvents];
  };

  // Get events for a specific date (including Google events)
  const getAllEventsForDate = (date: Date) => {
    const allEvents = getAllEvents();
    return allEvents.filter(event => {
      const eventDate = event.startTime;
      return eventDate && isSameDay(new Date(eventDate), date);
    });
  };

  // Get the week's days starting from Sunday
  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const currentWeekDays = getWeekDays();

  // Calculate event position and height for weekly view
  const getEventStyle = (event: CalendarEvent) => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    const startHour = getHours(startTime);
    const startMinute = getMinutes(startTime);
    const durationMinutes = differenceInMinutes(endTime, startTime);
    
    // Calculate top position relative to START_HOUR
    const topOffset = (startHour - START_HOUR) * HOUR_HEIGHT + (startMinute / 60) * HOUR_HEIGHT;
    const height = (durationMinutes / 60) * HOUR_HEIGHT;
    
    return {
      top: `${topOffset}px`,
      height: `${Math.max(height, 20)}px`, // Minimum height of 20px
    };
  };

  // Get events for a specific day in the week (non all-day)
  const getEventsForDayInWeek = (day: Date) => {
    return getAllEventsForDate(day).filter(event => !event.isAllDay);
  };

  // Get all-day events for a specific day
  const getAllDayEventsForDay = (day: Date) => {
    return getAllEventsForDate(day).filter(event => event.isAllDay);
  };

  // Get calendar grid days (for month view)
  const getCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  };

  // Navigation functions
  const goToPrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Get header title based on view mode
  const getHeaderTitle = () => {
    if (viewMode === "month") {
      return format(currentDate, "MMMM yyyy");
    } else if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (start.getMonth() === end.getMonth()) {
        return format(start, "MMMM yyyy");
      }
      return `${format(start, "MMM")} - ${format(end, "MMM yyyy")}`;
    } else {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }
  };

  // Add new event
  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startTime) return;

    const startTime = newEvent.startTime;
    const endTime = newEvent.endTime || new Date(startTime.getTime() + 60 * 60 * 1000);

    let eventId: string | undefined;

    // If Google Calendar is connected, add ONLY to Google Calendar
    // Otherwise, add to local calendar
    if (isGoogleConnected) {
      try {
        const googleEvent = await createGoogleEvent({
          title: newEvent.title,
          description: newEvent.description,
          startTime,
          endTime,
          location: newEvent.location,
        });
        
        if (googleEvent) {
          eventId = googleEvent.id;
          toast({
            title: "Event Created",
            description: "Event added to Google Calendar",
          });
        } else {
          throw new Error('Failed to create Google event');
        }
      } catch (error) {
        console.warn('Failed to create Google Calendar event, adding to local calendar:', error);
        // Fallback to local calendar if Google fails
        eventId = addEvent({
          title: newEvent.title,
          description: newEvent.description,
          startTime,
          endTime,
          type: newEvent.type,
          color: getColorForType(newEvent.type),
          location: newEvent.location,
          isAllDay: newEvent.isAllDay,
        });
        toast({
          title: "Event Created Locally",
          description: "Failed to sync with Google Calendar, saved locally instead",
          variant: "destructive"
        });
      }
    } else {
      // No Google Calendar, add to local calendar only
      eventId = addEvent({
        title: newEvent.title,
        description: newEvent.description,
        startTime,
        endTime,
        type: newEvent.type,
        color: getColorForType(newEvent.type),
        location: newEvent.location,
        isAllDay: newEvent.isAllDay,
      });
      toast({
        title: "Event Created",
        description: "Event added to local calendar",
      });
    }

    // Add activity for event creation
    if (eventId) {
      addActivity({
        label: `Created event: ${newEvent.title}`,
        icon: CalendarIcon,
        tone: "text-green-500",
        type: "calendar",
        relatedId: eventId,
        route: "/calendar"
      });
    }

    setIsEventDialogOpen(false);
    setNewEvent({
      title: "",
      description: "",
      startTime: undefined,
      endTime: undefined,
      type: "event",
      location: "",
      isAllDay: false,
    });
  };

  // Handle sync of both Google Classroom and Google Calendar
  const handleSync = async () => {
    if (!user) return;

    setIsSyncing(true);
    try {
      // Sync both Google Classroom assignments and Google Calendar events
      await Promise.all([
        syncClassroomData(),
        syncCalendarData()
      ]);

      toast({
        title: "Sync Complete",
        description: `Synced ${googleEvents.length} calendar events and assignments`,
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Could not sync data. Please check your Google account connection.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case "assignment": return "bg-red-500";
      case "class": return "bg-blue-500";
      case "event": return "bg-green-500";
      case "personal": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const weekDayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const calendarDays = getCalendarDays();

  // Event card component for weekly view
  const WeeklyEventCard = ({ event }: { event: CalendarEvent }) => {
    const style = getEventStyle(event);
    
    return (
      <div
        className={`absolute left-1 right-1 ${event.color} rounded-lg p-2 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-md`}
        style={style}
        onClick={() => setSelectedDate(new Date(event.startTime))}
      >
        <div className="text-xs text-white font-medium truncate">
          {format(new Date(event.startTime), "HH:mm")} - {format(new Date(event.endTime), "HH:mm")}
        </div>
        <div className="text-sm text-white font-semibold truncate mt-0.5">
          {event.title}
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col py-4 px-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: Month/Year */}
        <h2 className="text-2xl font-semibold text-foreground min-w-48">
          {getHeaderTitle()}
        </h2>

        {/* Right: Navigation + Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || isCalendarLoading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${(isSyncing || isCalendarLoading) ? 'animate-spin' : ''}`} />
            {isSyncing || isCalendarLoading ? 'Syncing...' : 'Sync'}
          </Button>
          <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium">Event Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter event title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter event description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="mt-2 min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="startTime" className="text-sm font-medium">Start Date & Time</Label>
                    <DateTimePicker
                      date={newEvent.startTime}
                      onDateChange={(date) => setNewEvent({ ...newEvent, startTime: date })}
                      placeholder="Pick start date & time"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime" className="text-sm font-medium">End Date & Time</Label>
                    <DateTimePicker
                      date={newEvent.endTime}
                      onDateChange={(date) => setNewEvent({ ...newEvent, endTime: date })}
                      placeholder="Pick end date & time"
                      disabled={!newEvent.startTime}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="type" className="text-sm font-medium">Event Type</Label>
                    <Select value={newEvent.type} onValueChange={(value: any) => setNewEvent({ ...newEvent, type: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="class">Class</SelectItem>
                        <SelectItem value="assignment">Assignment</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="location" className="text-sm font-medium">Location (Optional)</Label>
                    <Input
                      id="location"
                      placeholder="Event location"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <Button variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="gradient-bg" onClick={handleAddEvent}>
                    Add Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Weekly Calendar View */}
      {viewMode === "week" && (
        <Card className="flex-1 overflow-hidden bg-card border-border">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Day Headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/30">
              {/* Empty corner for time gutter */}
              <div className="p-2 border-r border-border" />
              {/* Day columns */}
              {currentWeekDays.map((day, index) => {
                const isTodayDate = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 text-center border-r border-border last:border-r-0 ${
                      isTodayDate ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      {weekDayLabels[index]}
                    </div>
                    <div
                      className={`text-2xl font-semibold mt-1 ${
                        isTodayDate
                          ? "bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center mx-auto"
                          : "text-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* All-day events row */}
            {currentWeekDays.some(day => getAllDayEventsForDay(day).length > 0) && (
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/10">
                <div className="p-2 text-xs text-muted-foreground border-r border-border flex items-center justify-center">
                  All day
                </div>
                {currentWeekDays.map((day) => {
                  const allDayEvents = getAllDayEventsForDay(day);
                  return (
                    <div key={day.toISOString()} className="p-1 border-r border-border last:border-r-0 min-h-8">
                      {allDayEvents.map(event => (
                        <div
                          key={event.id}
                          className={`${event.color} text-white text-xs px-2 py-1 rounded mb-1 truncate`}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Time Grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
                {/* Time Gutter */}
                <div className="border-r border-border">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-border flex items-start justify-end pr-2 pt-0"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    >
                      <span className="text-xs text-muted-foreground -translate-y-2">
                        {format(new Date().setHours(hour, 0), "h a")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {currentWeekDays.map((day) => {
                  const dayEvents = getEventsForDayInWeek(day);
                  const isTodayDate = isToday(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`relative border-r border-border last:border-r-0 ${
                        isTodayDate ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Hour grid lines */}
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="border-b border-border"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                        />
                      ))}

                      {/* Events */}
                      {dayEvents.map((event) => (
                        <WeeklyEventCard key={event.id} event={event} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month Calendar View */}
      {viewMode === "month" && (
        <Card className="flex-1 overflow-hidden bg-card border-border">
          <CardContent className="p-0 bg-card h-full flex flex-col">
            {/* Header Row */}
            <div className="grid grid-cols-7 border-b border-border">
              {weekDayLabels.map((day) => (
                <div
                  key={day}
                  className="p-4 text-center text-sm font-medium text-muted-foreground bg-muted/50"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 flex-1">
              {calendarDays.map((day) => {
                const dayEvents = getAllEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-24 p-2 border-r border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${
                      !isCurrentMonth ? "bg-muted/20 text-muted-foreground" : "bg-card text-foreground"
                    } ${isSelected ? "bg-primary/10" : ""}`}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="space-y-1">
                      <div className={`text-sm font-medium ${
                        isTodayDate 
                          ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center" 
                          : ""
                      }`}>
                        {format(day, "d")}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={`text-xs px-1 py-0.5 rounded text-white truncate ${event.color}`}
                            title={`${event.title} ${event.isAllDay ? "" : `at ${format(new Date(event.startTime), "h:mm a")}`}`}
                          >
                            {event.isAllDay ? (
                              event.title
                            ) : (
                              <>
                                <Clock className="inline h-2 w-2 mr-1" />
                                {format(new Date(event.startTime), "h:mm a")} {event.title}
                              </>
                            )}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day View */}
      {viewMode === "day" && (
        <Card className="flex-1 overflow-hidden bg-card border-border">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Day Header */}
            <div className="p-4 border-b border-border bg-muted/30 text-center">
              <div className="text-xs font-medium text-muted-foreground">
                {format(currentDate, "EEEE")}
              </div>
              <div
                className={`text-3xl font-semibold mt-1 ${
                  isToday(currentDate)
                    ? "bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                    : "text-foreground"
                }`}
              >
                {format(currentDate, "d")}
              </div>
            </div>

            {/* All-day events */}
            {getAllDayEventsForDay(currentDate).length > 0 && (
              <div className="p-2 border-b border-border bg-muted/10">
                <div className="text-xs text-muted-foreground mb-1">All day</div>
                {getAllDayEventsForDay(currentDate).map(event => (
                  <div
                    key={event.id}
                    className={`${event.color} text-white text-sm px-3 py-2 rounded mb-1`}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            )}

            {/* Time Grid for Day View */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-[60px_1fr] relative">
                {/* Time Gutter */}
                <div className="border-r border-border">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-border flex items-start justify-end pr-2"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    >
                      <span className="text-xs text-muted-foreground -translate-y-2">
                        {format(new Date().setHours(hour, 0), "h a")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day Column */}
                <div className={`relative ${isToday(currentDate) ? "bg-primary/5" : ""}`}>
                  {/* Hour grid lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-border"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Events */}
                  {getEventsForDayInWeek(currentDate).map((event) => (
                    <WeeklyEventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}