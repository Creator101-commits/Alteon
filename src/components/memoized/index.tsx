/**
 * Memoized List Item Components
 * 
 * These components are wrapped with React.memo to prevent unnecessary re-renders
 * when parent components update. Use useCallback for all event handlers passed
 * to these components.
 * 
 * Issue #11: React.memo on list components for performance optimization
 */

import React, { memo, useCallback } from 'react';
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
  BookOpen,
  Pin,
  Edit3,
  MoreHorizontal,
  Clock,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// ASSIGNMENT CARD
// ============================================================================

interface AssignmentCardProps {
  assignment: {
    id: number;
    title: string;
    description?: string | null;
    dueDate?: Date | string | null;
    status: string;
    priority?: string | null;
    classId?: number | null;
    isCustom?: boolean;
  };
  courseName: string;
  status: {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: React.ElementType;
  };
  onEdit?: (assignment: any) => void;
  onDelete?: (id: number) => void;
  getPriorityColor: (priority: string) => string;
}

export const AssignmentCard = memo(function AssignmentCard({
  assignment,
  courseName,
  status,
  onEdit,
  onDelete,
  getPriorityColor,
}: AssignmentCardProps) {
  const StatusIcon = status.icon;

  const formatDueDate = useCallback((date: Date | string) => {
    try {
      const dueDate = new Date(date);
      if (isNaN(dueDate.getTime())) return 'Invalid date';
      return format(dueDate, 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  }, []);

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
                <Badge variant="secondary" className="text-xs">Personal</Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Badge variant={status.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            
            {assignment.isCustom && (
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

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

// ============================================================================
// NOTE CARD
// ============================================================================

interface NoteCardProps {
  note: {
    id: string | number;
    title: string;
    content: string;
    category?: string | null;
    classId?: string | number | null;
    isPinned?: boolean;
    updatedAt?: Date | string;
    createdAt?: Date | string;
  };
  className?: string;
  onOpen: (note: any) => void;
  onTogglePin: (note: any) => void;
  onDelete: (id: string | number) => void;
  stripHtmlTags: (html: string) => string;
}

export const NoteCard = memo(function NoteCard({
  note,
  className,
  onOpen,
  onTogglePin,
  onDelete,
  stripHtmlTags,
}: NoteCardProps) {
  const handleClick = useCallback(() => {
    onOpen(note);
  }, [onOpen, note]);

  const handleTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin(note);
  }, [onTogglePin, note]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
  }, [onDelete, note.id]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen(note);
  }, [onOpen, note]);

  return (
    <Card 
      className="group border border-border/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 cursor-pointer relative bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm hover:from-card/80 hover:to-card/60 hover:scale-[1.02] overflow-hidden"
      onClick={handleClick}
    >
      <CardHeader className="pb-3 px-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start gap-2">
              {note.isPinned && (
                <div className="flex-shrink-0 mt-1">
                  <Pin className="h-4 w-4 text-amber-500 fill-amber-500" />
                </div>
              )}
              <h3 className="font-bold text-foreground text-xl leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-200">
                {note.title || "Untitled Note"}
              </h3>
            </div>
            
            <div className="flex items-center flex-wrap gap-2">
              {note.category && (
                <Badge 
                  variant="secondary" 
                  className="text-xs font-semibold px-3 py-1.5 bg-gradient-to-r from-primary/15 to-primary/10 text-primary border border-primary/20 rounded-full shadow-sm"
                >
                  {note.category}
                </Badge>
              )}
              {className && (
                <Badge 
                  variant="outline" 
                  className="text-xs font-medium px-3 py-1.5 border-border/60 bg-muted/30 text-muted-foreground rounded-full hover:bg-muted/50 transition-colors"
                >
                  <BookOpen className="h-3 w-3 mr-1.5 flex-shrink-0" />
                  {className}
                </Badge>
              )}
            </div>
          </div>         
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-accent/60 text-muted-foreground hover:text-foreground h-9 w-9 p-0 rounded-full"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover/95 backdrop-blur-sm border-border/50 shadow-xl" align="end">
              <DropdownMenuItem 
                onClick={handleEdit}
                className="hover:bg-accent/50 focus:bg-accent/50 cursor-pointer"
              >
                <Edit3 className="h-4 w-4 mr-3" />
                Edit Note
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleTogglePin}
                className="hover:bg-accent/50 focus:bg-accent/50 cursor-pointer"
              >
                <Pin className="h-4 w-4 mr-3" />
                {note.isPinned ? "Unpin Note" : "Pin Note"}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-3" />
                Delete Note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="px-6 pb-6 pt-0">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed font-medium">
            {stripHtmlTags(note.content) || "No content available..."}
          </p>
          
          <div className="pt-4 border-t border-border/40">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {new Date(note.updatedAt || note.createdAt || new Date()).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-medium">Click to edit</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Export all components
// ============================================================================

export default {
  AssignmentCard,
  TodoItem,
  HabitCard,
  ClassCard,
  NoteCard,
};
