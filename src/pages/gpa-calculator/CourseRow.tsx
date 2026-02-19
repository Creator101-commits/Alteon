/**
 * CourseRow — a single course line inside a cycle card.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type CourseLevel,
  type CourseGPAEntry,
  getGradeColor,
  getLevelBadgeColor,
} from './types';

interface CourseRowProps {
  course: CourseGPAEntry;
  onToggleExclusion: (id: string) => void;
  onChangeLevel: (id: string, level: CourseLevel) => void;
}

export function CourseRow({ course, onToggleExclusion, onChangeLevel }: CourseRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-all relative',
        course.excluded
          ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
          : 'bg-card hover:bg-muted/50',
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button
          variant={course.excluded ? 'outline' : 'ghost'}
          size="sm"
          className={cn(
            'h-7 text-xs shrink-0',
            course.excluded
              ? 'text-muted-foreground border-dashed'
              : 'text-destructive hover:text-destructive hover:bg-destructive/10',
          )}
          onClick={() => onToggleExclusion(course.id)}
        >
          {course.excluded ? (
            <>
              <Eye className="h-3 w-3 mr-1" />
              Include
            </>
          ) : (
            <>
              <EyeOff className="h-3 w-3 mr-1" />
              Exclude
            </>
          )}
        </Button>

        <div className="flex-1 min-w-0 relative">
          {course.excluded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <X className="h-8 w-8 text-destructive/60" strokeWidth={3} />
            </div>
          )}
          <p className={cn('font-medium text-sm truncate', course.excluded && 'text-muted-foreground')}>
            {course.courseName}
          </p>
          <p className="text-xs text-muted-foreground">{course.courseCode}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={course.level}
          onValueChange={(v) => onChangeLevel(course.id, v as CourseLevel)}
        >
          <SelectTrigger className={cn('w-[100px] h-7 text-xs', getLevelBadgeColor(course.level))}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="pre-ap">Pre-AP</SelectItem>
            <SelectItem value="ap">AP</SelectItem>
            <SelectItem value="dual-credit">Dual Credit</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-right w-16">
          <p className={cn('font-bold text-sm', getGradeColor(course.grade))}>
            {course.grade.toFixed(2)}%
          </p>
          <p className="text-xs text-muted-foreground">{course.gpaPoints.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
