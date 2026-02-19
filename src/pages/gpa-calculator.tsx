/**
 * GPA Calculator Page — slim orchestrator.
 *
 * Logic lives in useGPACalculator(); UI in sub-components under ./gpa-calculator/.
 */
import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, GraduationCap, RefreshCw, Loader2, Settings, ChevronRight, Info } from 'lucide-react';

import { useGPACalculator } from './gpa-calculator/useGPACalculator';
import { LevelBreakdownCards } from './gpa-calculator/LevelBreakdownCards';
import { CycleCard } from './gpa-calculator/CycleCard';
import { GPAInfoFooter } from './gpa-calculator/GPAInfoFooter';

export default function GPACalculator() {
  const [, setLocation] = useLocation();
  const gpa = useGPACalculator();

  // ─── Not connected state ──────────────────────────────────────────────────
  if (!gpa.isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto py-8 px-6">
          <Card className="border-dashed">
            <CardHeader className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4 mx-auto">
                <Calculator className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">HAC Not Connected</CardTitle>
              <CardDescription className="max-w-md mx-auto">
                Connect your Home Access Center account in settings to calculate your GPA.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-12">
              <Button onClick={() => setLocation('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Go to Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Main layout ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">GPA Calculator</h1>
            <p className="text-sm text-muted-foreground">
              Calculate your cumulative GPA with course-level adjustments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation('/hac-grades')}>
              <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
              HAC Grades
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                gpa.refreshGrades();
                gpa.fetchReportCard();
              }}
              disabled={gpa.isLoading}
            >
              {gpa.isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Settings Row */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="gpa-scale" className="text-sm">Scale:</Label>
                <Select value={gpa.gpaScale} onValueChange={(v) => gpa.setGpaScale(v as any)}>
                  <SelectTrigger id="gpa-scale" className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texas_6">Texas 6.0</SelectItem>
                    <SelectItem value="standard_4">Standard 4.0</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                Click "Exclude" to remove a course from GPA calculation
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Level Breakdown */}
        <LevelBreakdownCards gpaStats={gpa.gpaStats} />

        {/* Course list */}
        {gpa.isLoading && gpa.courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading courses...</p>
            </CardContent>
          </Card>
        ) : gpa.courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GraduationCap className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No course data available</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try refreshing or check your HAC connection
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(gpa.coursesByCycle).map(([cycle, cycleCourses]) => (
              <CycleCard
                key={cycle}
                cycle={cycle}
                courses={cycleCourses}
                onToggleExclusion={gpa.toggleExclusion}
                onToggleCycleExclusion={gpa.toggleCycleExclusion}
                onChangeLevel={gpa.changeCourseLevel}
              />
            ))}
          </div>
        )}

        <GPAInfoFooter />
      </div>
    </div>
  );
}
