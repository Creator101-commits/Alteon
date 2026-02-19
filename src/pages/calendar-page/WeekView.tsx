/**
 * Week view — 7-day time-grid with hour rows and event cards.
 */
import React from 'react';
import { format, isToday } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarEvent } from '@/contexts/CalendarContext';
import { WeeklyEventCard } from './WeeklyEventCard';
import { HOURS, HOUR_HEIGHT, WEEK_DAY_LABELS } from './types';

interface WeekViewProps {
  weekDays: Date[];
  getEventsForDayInWeek: (day: Date) => CalendarEvent[];
  getAllDayEventsForDay: (day: Date) => CalendarEvent[];
  getEventStyle: (event: CalendarEvent) => { top: string; height: string };
  onSelectDate: (date: Date) => void;
}

export function WeekView({
  weekDays,
  getEventsForDayInWeek,
  getAllDayEventsForDay,
  getEventStyle,
  onSelectDate,
}: WeekViewProps) {
  return (
    <Card className="flex-1 overflow-hidden bg-card border-border">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Day Headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/30">
          <div className="p-2 border-r border-border" />
          {weekDays.map((day, index) => {
            const isTodayDate = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`p-2 text-center border-r border-border last:border-r-0 ${
                  isTodayDate ? 'bg-primary/10' : ''
                }`}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {WEEK_DAY_LABELS[index]}
                </div>
                <div
                  className={`text-2xl font-semibold mt-1 ${
                    isTodayDate
                      ? 'bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center mx-auto'
                      : 'text-foreground'
                  }`}
                >
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day events row */}
        {weekDays.some((day) => getAllDayEventsForDay(day).length > 0) && (
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/10">
            <div className="p-2 text-xs text-muted-foreground border-r border-border flex items-center justify-center">
              All day
            </div>
            {weekDays.map((day) => {
              const allDayEvents = getAllDayEventsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className="p-1 border-r border-border last:border-r-0 min-h-8"
                >
                  {allDayEvents.map((event) => (
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
                    {format(new Date().setHours(hour, 0), 'h a')}
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((day) => {
              const dayEvents = getEventsForDayInWeek(day);
              const isTodayDate = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`relative border-r border-border last:border-r-0 ${
                    isTodayDate ? 'bg-primary/5' : ''
                  }`}
                >
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-border"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    />
                  ))}
                  {dayEvents.map((event) => (
                    <WeeklyEventCard
                      key={event.id}
                      event={event}
                      style={getEventStyle(event)}
                      onSelect={onSelectDate}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
