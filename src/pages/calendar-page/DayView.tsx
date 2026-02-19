/**
 * Day view — single-day time-grid with hour rows and event cards.
 */
import React from 'react';
import { format, isToday } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarEvent } from '@/contexts/CalendarContext';
import { WeeklyEventCard } from './WeeklyEventCard';
import { HOURS, HOUR_HEIGHT } from './types';

interface DayViewProps {
  currentDate: Date;
  getEventsForDay: (day: Date) => CalendarEvent[];
  getAllDayEventsForDay: (day: Date) => CalendarEvent[];
  getEventStyle: (event: CalendarEvent) => { top: string; height: string };
  onSelectDate: (date: Date) => void;
}

export function DayView({
  currentDate,
  getEventsForDay,
  getAllDayEventsForDay,
  getEventStyle,
  onSelectDate,
}: DayViewProps) {
  const allDayEvents = getAllDayEventsForDay(currentDate);
  const timedEvents = getEventsForDay(currentDate);

  return (
    <Card className="flex-1 overflow-hidden bg-card border-border">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Day Header */}
        <div className="p-4 border-b border-border bg-muted/30 text-center">
          <div className="text-xs font-medium text-muted-foreground">
            {format(currentDate, 'EEEE')}
          </div>
          <div
            className={`text-3xl font-semibold mt-1 ${
              isToday(currentDate)
                ? 'bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center mx-auto'
                : 'text-foreground'
            }`}
          >
            {format(currentDate, 'd')}
          </div>
        </div>

        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="p-2 border-b border-border bg-muted/10">
            <div className="text-xs text-muted-foreground mb-1">All day</div>
            {allDayEvents.map((event) => (
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
                    {format(new Date().setHours(hour, 0), 'h a')}
                  </span>
                </div>
              ))}
            </div>

            {/* Day Column */}
            <div className={`relative ${isToday(currentDate) ? 'bg-primary/5' : ''}`}>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-border"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                />
              ))}
              {timedEvents.map((event) => (
                <WeeklyEventCard
                  key={event.id}
                  event={event}
                  style={getEventStyle(event)}
                  onSelect={onSelectDate}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
