/**
 * Memoized List Item Components
 * 
 * These components are wrapped with React.memo to prevent unnecessary re-renders
 * when parent components update. Use useCallback for all event handlers passed
 * to these components.
 * 
 * Issue #11: React.memo on list components for performance optimization
 */

import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Users,
  Trash2,
  Edit2,
  Flag,
  CheckCircle2,
  Circle,
  Flame,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';


// ============================================================================
// TODO ITEM
// ============================================================================

type TodoStatus = 'pending' | 'in-progress' | 'completed';

interface TodoItemProps {
  todo: {
    id: string;
    title: string;
    description?: string;
    status: TodoStatus;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string | null;
    completedAt?: string | null;
  };
  onToggleComplete: (id: string) => void;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onEdit: (todo: any) => void;
  onDelete: (id: string) => void;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
}

export const TodoItem = memo(function TodoItem({
  todo,
  onToggleComplete,
  onStatusChange,
  onEdit,
  onDelete,
  getPriorityColor,
  getStatusColor,
}: TodoItemProps) {
  const handleToggle = useCallback(() => {
    onToggleComplete(todo.id);
  }, [onToggleComplete, todo.id]);

  const handleStatusChange = useCallback((value: TodoStatus) => {
    onStatusChange(todo.id, value);
  }, [onStatusChange, todo.id]);

  const handleEdit = useCallback(() => {
    onEdit(todo);
  }, [onEdit, todo]);

  const handleDelete = useCallback(() => {
    onDelete(todo.id);
  }, [onDelete, todo.id]);

  return (
    <Card className={todo.status === 'completed' ? 'opacity-60' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Checkbox
            checked={todo.status === 'completed'}
            onCheckedChange={handleToggle}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h3 className={`font-medium ${todo.status === 'completed' ? 'line-through' : ''}`}>
                {todo.title}
              </h3>
              <div className="flex items-center gap-2">
                <Badge className={getPriorityColor(todo.priority)}>
                  <Flag className="h-3 w-3 mr-1" />
                  {todo.priority}
                </Badge>
                <Badge className={getStatusColor(todo.status)}>
                  {todo.status}
                </Badge>
              </div>
            </div>
            
            {todo.description && (
              <p className="text-sm text-muted-foreground mb-3">
                {todo.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {todo.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due: {format(new Date(todo.dueDate), 'MMM d, yyyy')}
                </div>
              )}
              {todo.completedAt && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed: {format(new Date(todo.completedAt), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={todo.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// HABIT CARD
// ============================================================================

interface HabitCardProps {
  habit: {
    id: string;
    name: string;
    description?: string;
    color: string;
    category: string;
    streak: number;
    targetCount: number;
    completions: Record<string, number>;
  };
  today: string;
  progress: number;
  completed: boolean;
  onToggle: (habitId: string, date: string) => void;
  onDelete: (habitId: string) => void;
}

export const HabitCard = memo(function HabitCard({
  habit,
  today,
  progress,
  completed,
  onToggle,
  onDelete,
}: HabitCardProps) {
  const handleToggle = useCallback(() => {
    onToggle(habit.id, today);
  }, [onToggle, habit.id, today]);

  const handleDelete = useCallback(() => {
    onDelete(habit.id);
  }, [onDelete, habit.id]);

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: habit.color }}
            />
            <div>
              <h3 className="font-medium">{habit.name}</h3>
              {habit.description && (
                <p className="text-sm text-muted-foreground">{habit.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {habit.category}
                </Badge>
                {habit.streak > 0 && (
                  <div className="flex items-center gap-1 text-xs text-orange-600">
                    <Flame className="h-3 w-3" />
                    {habit.streak} day streak
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                {habit.completions[today] || 0} / {habit.targetCount}
              </div>
              <Progress value={progress} className="w-20 mt-1" />
            </div>

            <Button
              variant={completed ? "default" : "outline"}
              size="sm"
              onClick={handleToggle}
              className="flex items-center gap-2"
            >
              {completed ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              {completed ? 'Done' : 'Mark'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Habit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// CLASS CARD
// ============================================================================

interface ClassCardProps {
  course: {
    id: number | string;
    name: string;
    section?: string | null;
    description?: string | null;
    teacherName?: string | null;
    createdAt?: Date | string | null;
    alternateLink?: string | null;
  };
  onDelete: (course: any) => void;
  isDeleting: number | string | null;
}

export const ClassCard = memo(function ClassCard({
  course,
  onDelete,
  isDeleting,
}: ClassCardProps) {
  const handleDelete = useCallback(() => {
    onDelete(course);
  }, [onDelete, course]);

  const handleOpenLink = useCallback(() => {
    if (course.alternateLink) {
      window.open(course.alternateLink, '_blank');
    }
  }, [course.alternateLink]);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg leading-tight">
            {course.name}
          </CardTitle>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting === course.id}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              {isDeleting === course.id ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
        {course.section && (
          <p className="text-sm text-muted-foreground">{course.section}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {course.description}
          </p>
        )}

        <Separator />

        <div className="space-y-3">
          {course.teacherName && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Teacher: {course.teacherName}</span>
            </div>
          )}

          {course.createdAt && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Created: {format(new Date(course.createdAt), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {course.alternateLink && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-4"
            onClick={handleOpenLink}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Classroom
          </Button>
        )}
      </CardContent>
    </Card>
  );
});


