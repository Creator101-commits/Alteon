import type { CalendarEvent } from '@/contexts/CalendarContext';

export function calendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function groupCalendarEventsByDay(events: CalendarEvent[]) {
  const grouped = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const key = calendarDayKey(new Date(event.startTime));
    const dayEvents = grouped.get(key);

    if (dayEvents) {
      dayEvents.push(event);
    } else {
      grouped.set(key, [event]);
    }
  }

  return grouped;
}
