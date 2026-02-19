/**
 * GPAInfoFooter — formula explanation card at the bottom.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

export function GPAInfoFooter() {
  return (
    <Card className="mt-6 bg-muted/50">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">How GPA is calculated (Leander ISD):</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>GPA decreases by 0.1 for each percentage point below 100</li>
              <li>Formula: GPA = Max GPA - (100 - Grade) × 0.1</li>
              <li>Below 70 = 0.0 GPA (failing)</li>
            </ul>
            <p className="mt-2 text-xs">
              <strong>Max GPA by Level:</strong> AP/Dual Credit = 6.0 | Pre-AP/Honors = 5.5 | Regular = 5.0
            </p>
            <p className="mt-1 text-xs">
              <strong>Examples:</strong> 95 in AP = 5.5 | 95 in Pre-AP = 5.0 | 95 in Regular = 4.5
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
