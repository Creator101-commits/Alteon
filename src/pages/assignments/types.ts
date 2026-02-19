/**
 * Shared types and helper utilities for the Assignments page.
 */
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

export interface AssignmentStatus {
  label: string;
  variant: 'default' | 'destructive' | 'secondary';
  icon: typeof CheckCircle;
}

export interface NewAssignment {
  title: string;
  description: string;
  dueDateTime: Date | undefined;
  classId: string;
  priority: 'low' | 'medium' | 'high';
}

export const EMPTY_ASSIGNMENT: NewAssignment = {
  title: '',
  description: '',
  dueDateTime: undefined,
  classId: 'none',
  priority: 'medium',
};

export function getAssignmentStatus(assignment: any): AssignmentStatus {
  if (assignment.status === 'TURNED_IN' || assignment.status === 'completed') {
    return { label: 'Submitted', variant: 'default', icon: CheckCircle };
  }
  if (assignment.status === 'LATE') {
    return { label: 'Late', variant: 'destructive', icon: AlertCircle };
  }

  // Check if overdue
  if (assignment.dueDate) {
    try {
      const dueDate = new Date(assignment.dueDate);
      if (!isNaN(dueDate.getTime()) && dueDate < new Date()) {
        return { label: 'Overdue', variant: 'destructive', icon: AlertCircle };
      }
    } catch {
      console.warn('Error parsing due date for status check:', assignment.dueDate);
    }
  }

  return { label: 'To Do', variant: 'secondary', icon: Clock };
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'text-red-600 border-red-200 bg-red-50';
    case 'medium':
      return 'text-yellow-600 border-yellow-200 bg-yellow-50';
    case 'low':
      return 'text-green-600 border-green-200 bg-green-50';
    default:
      return 'text-gray-600 border-gray-200 bg-gray-50';
  }
}

export function formatDueDate(dueDate: string): string {
  try {
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) {
      console.warn('Invalid due date:', dueDate);
      return dueDate;
    }
    const formattedDate = d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${formattedDate} at ${formattedTime}`;
  } catch (error) {
    console.error('Error formatting due date:', error, dueDate);
    return dueDate;
  }
}
