/**
 * Month view — grid of day cells showing events.
 */
import React from 'react';
import { format, isSameMonth, isSameDay, isToday } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { CalendarEvent } from '@/contexts/CalendarContext';
import { WEEK_DAY_LABELS } from './types';

interface MonthViewProps {
  calendarDays: Date[];
  currentDate: Date;
  selectedDate: Date;
  getAllEventsForDate: (date: Date) => CalendarEvent[];
  onSelectDate: (date: Date) => void;
}

export function MonthView({
  calendarDays,
  currentDate,
  selectedDate,
  getAllEventsForDate,
  onSelectDate,
}: MonthViewProps) {
  return (
    <Card className="flex-1 overflow-hidden bg-card border-border">
      <CardContent className="p-0 bg-card h-full flex flex-col">
        {/* Header Row */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEK_DAY_LABELS.map((day) => (
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
                  !isCurrentMonth
                    ? 'bg-muted/20 text-muted-foreground'
                    : 'bg-card text-foreground'
                } ${isSelected ? 'bg-primary/10' : ''}`}
                onClick={() => onSelectDate(day)}
              >
                <div className="space-y-1">
                  <div
                    className={`text-sm font-medium ${
                      isTodayDate
                        ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center'
                        : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs px-1 py-0.5 rounded text-white truncate ${event.color}`}
                        title={`${event.title} ${
                          event.isAllDay
                            ? ''
                            : `at ${format(new Date(event.startTime), 'h:mm a')}`
                        }`}
                      >
                        {event.isAllDay ? (
                          event.title
                        ) : (
                          <>
                            <Clock className="inline h-2 w-2 mr-1" />
                            {format(new Date(event.startTime), 'h:mm a')} {event.title}
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
  );
}
