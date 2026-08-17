/** Custom hook for calendar state, navigation, and event helpers. */
import { useMemo, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  getHours,
  getMinutes,
  differenceInMinutes,
} from 'date-fns';
import { useCalendar, type CalendarEvent } from '@/contexts/CalendarContext';
import { useToast } from '@/hooks/use-toast';

import {
  type ViewMode,
  type NewEventData,
  EMPTY_EVENT,
  HOUR_HEIGHT,
  START_HOUR,
  getColorForType,
} from './types';
import { calendarDayKey, groupCalendarEventsByDay } from './calendar-utils';

export { calendarDayKey, groupCalendarEventsByDay } from './calendar-utils';

export function useCalendarPage() {
  const { events, addEvent, isLoading: isCalendarLoading } = useCalendar();
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEventData>({ ...EMPTY_EVENT });

  // Group once per event-list change instead of scanning every event for every day cell.
  const eventsByDay = useMemo(() => groupCalendarEventsByDay(events), [events]);

  const getAllEventsForDate = (date: Date): CalendarEvent[] =>
    eventsByDay.get(calendarDayKey(date)) ?? [];

  const getEventsForDayInWeek = (day: Date) =>
    getAllEventsForDate(day).filter((event) => !event.isAllDay);

  const getAllDayEventsForDay = (day: Date) =>
    getAllEventsForDate(day).filter((event) => event.isAllDay);

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  };

  const getEventStyle = (event: CalendarEvent) => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    const startHour = getHours(startTime);
    const startMinute = getMinutes(startTime);
    const durationMinutes = differenceInMinutes(endTime, startTime);
    const topOffset =
      (startHour - START_HOUR) * HOUR_HEIGHT + (startMinute / 60) * HOUR_HEIGHT;
    const height = (durationMinutes / 60) * HOUR_HEIGHT;

    return {
      top: `${topOffset}px`,
      height: `${Math.max(height, 20)}px`,
    };
  };

  const goToPrevious = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const goToNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const getHeaderTitle = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (start.getMonth() === end.getMonth()) return format(start, 'MMMM yyyy');
      return `${format(start, 'MMM')} - ${format(end, 'MMM yyyy')}`;
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startTime) return;

    const startTime = newEvent.startTime;
    const endTime = newEvent.endTime || new Date(startTime.getTime() + 60 * 60 * 1000);

    try {
      await addEvent({
        title: newEvent.title,
        description: newEvent.description,
        startTime,
        endTime,
        type: newEvent.type,
        color: getColorForType(newEvent.type),
        location: newEvent.location,
        isAllDay: newEvent.isAllDay,
      });
      toast({ title: 'Event Created', description: 'Event saved successfully' });
    } catch (error) {
      console.error('Failed to create event:', error);
      toast({ title: 'Error', description: 'Failed to save event', variant: 'destructive' });
    }

    setIsEventDialogOpen(false);
    setNewEvent({ ...EMPTY_EVENT });
  };


  return {
    currentDate,
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    isEventDialogOpen,
    setIsEventDialogOpen,
    isCalendarLoading,
    newEvent,
    setNewEvent,
    getHeaderTitle,
    getWeekDays,
    getCalendarDays,
    getAllEventsForDate,
    getEventsForDayInWeek,
    getAllDayEventsForDay,
    getEventStyle,
    goToPrevious,
    goToNext,
    goToToday,
    handleAddEvent,
  };
}
