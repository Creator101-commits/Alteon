/**
 * LevelBreakdownCards — four small stat cards (AP, Dual Credit, Pre-AP, Regular).
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type CourseLevel, type GPAStats, getLevelBadgeColor, getLevelLabel } from './types';

interface LevelBreakdownCardsProps {
  gpaStats: GPAStats;
}

const LEVELS: CourseLevel[] = ['ap', 'dual-credit', 'pre-ap', 'regular'];

export function LevelBreakdownCards({ gpaStats }: LevelBreakdownCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {LEVELS.map((level) => (
        <Card key={level} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn('text-xs', getLevelBadgeColor(level))}>
                {getLevelLabel(level)}
              </Badge>
            </div>
            <div className="text-2xl font-bold">{gpaStats.byLevel[level].count}</div>
            <div className="text-xs text-muted-foreground">
              Avg: {gpaStats.byLevel[level].avgGPA.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
