/**
 * CycleCard — collapsible card for one grading cycle with all its courses.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';
import type { CourseGPAEntry, CourseLevel } from './types';
import { CourseRow } from './CourseRow';

interface CycleCardProps {
  cycle: string;
  courses: CourseGPAEntry[];
  onToggleExclusion: (id: string) => void;
  onToggleCycleExclusion: (cycle: string, exclude: boolean) => void;
  onChangeLevel: (id: string, level: CourseLevel) => void;
}

export function CycleCard({
  cycle,
  courses,
  onToggleExclusion,
  onToggleCycleExclusion,
  onChangeLevel,
}: CycleCardProps) {
  const included = courses.filter((c) => !c.excluded);
  const allExcluded = included.length === 0;
  const allIncluded = included.length === courses.length;
  const cycleGPA = included.length > 0 ? included.reduce((s, c) => s + c.gpaPoints, 0) / included.length : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{cycle}</CardTitle>
            <Badge variant="outline" className="font-bold text-primary border-primary/50">
              GPA: {cycleGPA.toFixed(2)}
            </Badge>
            <Badge variant="secondary">
              {included.length} / {courses.length} included
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onToggleCycleExclusion(cycle, true)}
              disabled={allExcluded}
            >
              <EyeOff className="h-3 w-3 mr-1" />
              Exclude All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onToggleCycleExclusion(cycle, false)}
              disabled={allIncluded}
            >
              <Eye className="h-3 w-3 mr-1" />
              Include All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {courses.map((course) => (
            <CourseRow
              key={course.id}
              course={course}
              onToggleExclusion={onToggleExclusion}
              onChangeLevel={onChangeLevel}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
