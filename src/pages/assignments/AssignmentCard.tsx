/**
 * Single assignment card — status badges, due date, action buttons.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, Users, ExternalLink, Trash2, Check } from 'lucide-react';
import { getAssignmentStatus, getPriorityColor, formatDueDate } from './types';

interface Course {
  id: string;
  name: string;
}

interface AssignmentCardProps {
  assignment: any;
  courses: Course[];
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function AssignmentCard({
  assignment,
  courses,
  onComplete,
  onDelete,
}: AssignmentCardProps) {
  const status = getAssignmentStatus(assignment);
  const StatusIcon = status.icon;

  const course = courses.find((c) => c.id === assignment.classId);
  const courseName = course?.name || (assignment.classId ? 'Unknown Course' : 'No Class');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight mb-2">
              {assignment.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{courseName}</span>
              {assignment.isCustom && !assignment.classId && (
                <Badge variant="secondary" className="text-xs">
                  Personal
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Badge variant={status.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>

            {assignment.isCustom && (
              <Badge
                variant="outline"
                className="text-blue-600 border-blue-200 bg-blue-50"
              >
                Custom
              </Badge>
            )}

            {assignment.priority && assignment.priority !== 'none' && (
              <Badge
                variant="outline"
                className={`capitalize ${getPriorityColor(assignment.priority)}`}
              >
                {assignment.priority} Priority
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {assignment.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {assignment.description}
          </p>
        )}

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {assignment.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Due: {formatDueDate(assignment.dueDate)}</span>
              </div>
            )}
            {!assignment.dueDate && assignment.isCustom && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>No due date set</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await onComplete(assignment.id);
                window.location.reload();
              }}
              className="flex items-center gap-2 hover:bg-green-50 hover:text-green-600 hover:border-green-300"
              title="Mark as complete and remove"
            >
              <Check className="h-4 w-4" />
              Complete
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await onDelete(assignment.id);
                window.location.reload();
              }}
              className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              title="Delete assignment"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>

            {assignment.alternateLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(assignment.alternateLink, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Classroom
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
