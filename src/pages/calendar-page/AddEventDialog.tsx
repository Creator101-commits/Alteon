/**
 * Dialog for creating a new calendar event.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import type { NewEventData } from './types';

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newEvent: NewEventData;
  onFieldChange: (event: NewEventData) => void;
  onSubmit: () => void;
}

export function AddEventDialog({
  open,
  onOpenChange,
  newEvent,
  onFieldChange,
  onSubmit,
}: AddEventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gradient-bg">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
          <DialogDescription>
            Create a new calendar event with date, time, and optional details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <div>
            <Label htmlFor="title" className="text-sm font-medium">
              Event Title
            </Label>
            <Input
              id="title"
              placeholder="Enter event title"
              value={newEvent.title}
              onChange={(e) => onFieldChange({ ...newEvent, title: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Enter event description"
              value={newEvent.description}
              onChange={(e) =>
                onFieldChange({ ...newEvent, description: e.target.value })
              }
              className="mt-2 min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label htmlFor="startTime" className="text-sm font-medium">
                Start Date &amp; Time
              </Label>
              <DateTimePicker
                date={newEvent.startTime}
                onDateChange={(date) =>
                  onFieldChange({ ...newEvent, startTime: date })
                }
                placeholder="Pick start date & time"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="endTime" className="text-sm font-medium">
                End Date &amp; Time
              </Label>
              <DateTimePicker
                date={newEvent.endTime}
                onDateChange={(date) =>
                  onFieldChange({ ...newEvent, endTime: date })
                }
                placeholder="Pick end date & time"
                disabled={!newEvent.startTime}
                className="mt-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label htmlFor="type" className="text-sm font-medium">
                Event Type
              </Label>
              <Select
                value={newEvent.type}
                onValueChange={(value: any) =>
                  onFieldChange({ ...newEvent, type: value })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location" className="text-sm font-medium">
                Location (Optional)
              </Label>
              <Input
                id="location"
                placeholder="Event location"
                value={newEvent.location}
                onChange={(e) =>
                  onFieldChange({ ...newEvent, location: e.target.value })
                }
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="gradient-bg" onClick={onSubmit}>
              Add Event
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
