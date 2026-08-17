import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@/contexts/CalendarContext';
import {
  calendarDayKey,
  groupCalendarEventsByDay,
} from '@/pages/calendar-page/calendar-utils';

const event = (id: string, startTime: Date): CalendarEvent => ({
  id,
  title: id,
  startTime,
  endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
  type: 'event',
  color: 'bg-blue-500',
});

describe('calendar event grouping', () => {
  it('groups events by local calendar day in one pass', () => {
    const first = event('first', new Date(2025, 0, 5, 9));
    const second = event('second', new Date(2025, 0, 5, 14));
    const nextDay = event('next-day', new Date(2025, 0, 6, 9));

    const grouped = groupCalendarEventsByDay([first, second, nextDay]);

    expect(grouped.get(calendarDayKey(first.startTime))).toEqual([first, second]);
    expect(grouped.get(calendarDayKey(nextDay.startTime))).toEqual([nextDay]);
  });

  it('handles a large calendar workload within the performance budget', () => {
    const events = Array.from({ length: 10_000 }, (_, index) => {
      const startTime = new Date(2025, 0, 1 + (index % 180), index % 24);
      return event(`event-${index}`, startTime);
    });

    groupCalendarEventsByDay(events);
    const startedAt = performance.now();
    const grouped = groupCalendarEventsByDay(events);
    const duration = performance.now() - startedAt;
    const groupedEventCount = [...grouped.values()].reduce(
      (count, dayEvents) => count + dayEvents.length,
      0,
    );

    expect(groupedEventCount).toBe(events.length);
    expect(duration).toBeLessThan(1000);
  });
});
