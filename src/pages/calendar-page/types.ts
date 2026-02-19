/**
 * Shared types, constants, and utility functions for the Calendar page.
 */
import { CalendarEvent } from '@/contexts/CalendarContext';

export type ViewMode = 'month' | 'week' | 'day';

// Constants for the time-grid views
export const HOUR_HEIGHT = 60; // pixels per hour
export const START_HOUR = 7; // 7 AM
export const END_HOUR = 22; // 10 PM
export const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

export const WEEK_DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function getColorForType(type: string): string {
  switch (type) {
    case 'assignment':
      return 'bg-red-500';
    case 'class':
      return 'bg-blue-500';
    case 'event':
      return 'bg-green-500';
    case 'personal':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
}

export interface NewEventData {
  title: string;
  description: string;
  startTime: Date | undefined;
  endTime: Date | undefined;
  type: 'event';
  location: string;
  isAllDay: boolean;
}

export const EMPTY_EVENT: NewEventData = {
  title: '',
  description: '',
  startTime: undefined,
  endTime: undefined,
  type: 'event',
  location: '',
  isAllDay: false,
};
