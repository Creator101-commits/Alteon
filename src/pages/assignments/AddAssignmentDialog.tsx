/**
 * Dialog for creating a new assignment.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Plus } from 'lucide-react';
import type { NewAssignment } from './types';

interface Course {
  id: string;
  name: string;
}

interface AddAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newAssignment: NewAssignment;
  onFieldChange: React.Dispatch<React.SetStateAction<NewAssignment>>;
  courses: Course[];
  isAddingAssignment: boolean;
  onSubmit: () => void;
}

export function AddAssignmentDialog({
  open,
  onOpenChange,
  newAssignment,
  onFieldChange,
  courses,
  isAddingAssignment,
  onSubmit,
}: AddAssignmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="text-sm">
          <Plus className="h-3 w-3 mr-1" />
          Add Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
          <DialogDescription>
            Add a new assignment with a title, description, due date, and priority level.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter assignment title..."
              value={newAssignment.title}
              onChange={(e) =>
                onFieldChange((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter assignment description..."
              value={newAssignment.description}
              onChange={(e) =>
                onFieldChange((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2 col-span-2">
              <Label>Due Date &amp; Time</Label>
              <DateTimePicker
                date={newAssignment.dueDateTime}
                onDateChange={(date) =>
                  onFieldChange((prev) => ({ ...prev, dueDateTime: date }))
                }
                placeholder="Select due date and time"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="class">Class</Label>
              <Select
                value={newAssignment.classId}
                onValueChange={(value) =>
                  onFieldChange((prev) => ({ ...prev, classId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a class (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Class</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newAssignment.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') =>
                  onFieldChange((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={isAddingAssignment}>
              {isAddingAssignment ? 'Creating...' : 'Create Assignment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
