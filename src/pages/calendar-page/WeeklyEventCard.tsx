/**
 * Event card rendered inside a time-grid column (used in both week and day views).
 */
import React from 'react';
import { format } from 'date-fns';
import { CalendarEvent } from '@/contexts/CalendarContext';

interface WeeklyEventCardProps {
  event: CalendarEvent;
  style: { top: string; height: string };
  onSelect: (date: Date) => void;
}

export function WeeklyEventCard({ event, style, onSelect }: WeeklyEventCardProps) {
  return (
    <div
      className={`absolute left-1 right-1 ${event.color} rounded-lg p-2 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-md`}
      style={style}
      onClick={() => onSelect(new Date(event.startTime))}
    >
      <div className="text-xs text-white font-medium truncate">
        {format(new Date(event.startTime), 'HH:mm')} -{' '}
        {format(new Date(event.endTime), 'HH:mm')}
      </div>
      <div className="text-sm text-white font-semibold truncate mt-0.5">
        {event.title}
      </div>
    </div>
  );
}
