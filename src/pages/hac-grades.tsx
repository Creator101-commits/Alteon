/**
 * HAC Grades Page
 * Displays grades from Home Access Center
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useHAC } from '@/contexts/HACContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  RefreshCw, 
  Loader2, 
  AlertCircle,
  Settings,
  Calculator
} from 'lucide-react';

// All 6 cycles for Leander ISD (matching format from scraper: "Cycle 1", "Cycle 2", etc.)
const ALL_CYCLES = ['Cycle 1', 'Cycle 2', 'Cycle 3', 'Cycle 4', 'Cycle 5', 'Cycle 6'];

// Helper to extract cycle number from "Cycle X" format
const getCycleNumber = (cycleName: string): number => {
  const match = cycleName.match(/Cycle (\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// Grades data interface (same as in context)
interface HACGradesData {
  grades: {
    courseId: string;
    name: string;
    grade: string;
    numericGrade: number | null;
    gpa: number | null;
    assignments: {
      dateDue: string;
      dateAssigned: string;
      name: string;
      category: string;
      score: string;
    }[];
  }[];
  overallAverage: number;
  highlightedCourse: any;
}

export default function HACGrades() {
  const { 
    isConnected, 
    isLoading, 
    gradesData, 
    reportCard,
    refreshGrades, 
    fetchReportCard,
    error 
  } = useHAC();
  const [, setLocation] = useLocation();
  const [selectedCycle, setSelectedCycle] = useState<string>('');

  // Fetch report card on mount to get cycle data
  useEffect(() => {
    if (isConnected && !reportCard) {
      fetchReportCard();
    }
  }, [isConnected, reportCard, fetchReportCard]);

  // Determine the actual current cycle
  // The report card only has FINALIZED cycles, but gradesData has the CURRENT cycle's grades
  // We need to figure out which cycle is actually current
  const currentCycleName = useMemo(() => {
    // If we have gradesData, it represents the current active cycle
    // We need to determine which cycle number that is
    // The current cycle is one more than the last finalized cycle in report card
    if (reportCard && reportCard.cycles.length > 0) {
      const lastFinalizedCycle = reportCard.cycles[reportCard.cycles.length - 1]?.cycleName || '';
      // Extract the number from "Cycle X" and add 1
      const match = lastFinalizedCycle.match(/Cycle (\d+)/);
      if (match) {
        const lastCycleNum = parseInt(match[1], 10);
        const currentCycleNum = lastCycleNum + 1;
        if (currentCycleNum <= 6) {
          return `Cycle ${currentCycleNum}`;
        }
      }
      // If we're at the end, the last finalized IS current
      return lastFinalizedCycle;
    }
    // If no report card data but we have grades, assume Cycle 1
    if (gradesData) {
      return 'Cycle 1';
    }
    return '';
  }, [reportCard, gradesData]);

  // Set default to the current cycle when determined
  useEffect(() => {
    if (currentCycleName && !selectedCycle) {
      setSelectedCycle(currentCycleName);
    }
  }, [currentCycleName, selectedCycle]);



  // Get cycle data for a given cycle name (report card data)
  const getCycleData = (cycleName: string) => {
    return reportCard?.cycles.find(c => c.cycleName === cycleName);
  };

  // Check if the selected cycle is the current active cycle (uses gradesData)
  const isCurrentActiveCycle = (cycleName: string) => {
    return cycleName === currentCycleName;
  };

  // Redirect to settings if not connected
  useEffect(() => {
    if (!isConnected && !isLoading) {
      // Give a moment for auto-login to complete
      const timer = setTimeout(() => {
        if (!isConnected) {
          setLocation('/settings');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isLoading, setLocation]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto py-8 px-6">
          <Card className="border-dashed">
            <CardHeader className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4 mx-auto">
                <GraduationCap className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">HAC Not Connected</CardTitle>
              <CardDescription className="max-w-md mx-auto">
                Connect your Home Access Center account in settings to view your grades.
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              HAC Grades
            </h1>
            <p className="text-sm text-muted-foreground">
              Your grades from Home Access Center
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => setLocation('/gpa-calculator')}
            >
              <Calculator className="h-4 w-4 mr-2" />
              GPA Calculator
            </Button>
            <Button 
              variant="outline" 
              onClick={() => refreshGrades()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cycle Tabs - Always show all 6 cycles */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {ALL_CYCLES.map((cycleName) => {
            const cycleData = getCycleData(cycleName);
            const hasReportCardData = cycleData && cycleData.courses.length > 0;
            const isCurrentCycle = cycleName === currentCycleName;
            // Has data if: report card has it, OR it's current cycle with gradesData
            const hasData = hasReportCardData || (isCurrentCycle && gradesData);
            
            return (
              <button
                key={cycleName}
                onClick={() => setSelectedCycle(cycleName)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCycle === cycleName
                    ? 'bg-primary text-primary-foreground'
                    : hasData 
                      ? 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      : 'bg-muted/40 hover:bg-muted/50 text-muted-foreground/50'
                }`}
              >
                {cycleName}
              </button>
            );
          })}
        </div>

        {/* Current Cycle Indicator */}
        {selectedCycle && (
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedCycle} Grades
            </h2>
            {selectedCycle === currentCycleName && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                Current
              </span>
            )}
          </div>
        )}

        {/* Course List */}
        <div className="space-y-2">
          {(isLoading && !reportCard && !gradesData) ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading grades...</p>
              </CardContent>
            </Card>
          ) : (() => {
            // Check if this is the current cycle
            const isCurrentCycle = selectedCycle === currentCycleName;
            
            // For current cycle: use gradesData (has assignments)
            // For past cycles: use report card data (summary grades only)
            if (isCurrentCycle && gradesData && gradesData.grades.length > 0) {
              // Display current cycle with assignments
              return gradesData.grades.map((course) => (
                <div
                  key={course.courseId}
                  onClick={() => setLocation(`/course-grades/${encodeURIComponent(course.courseId)}`)}
                  className="flex items-center justify-between p-4 rounded-lg bg-card border hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{course.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {course.courseId} • {course.assignments.length} assignments
                    </p>
                  </div>
                  <div className={`text-xl font-bold px-3 py-1 rounded-lg ${
                    course.numericGrade !== null && course.numericGrade >= 90 
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                      : course.numericGrade !== null && course.numericGrade >= 80 
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : course.numericGrade !== null && course.numericGrade >= 70
                      ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                      : 'bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {course.grade}
                  </div>
                </div>
              ));
            }
            
            // For past cycles, show report card data (summary only, no assignments)
            const cycleData = getCycleData(selectedCycle);
            if (cycleData && cycleData.courses.length > 0) {
              return cycleData.courses.map((course, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-lg bg-card border opacity-90"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{course.course}</p>
                    <p className="text-xs text-muted-foreground">{course.courseCode} • Finalized</p>
                  </div>
                  <div className={`text-xl font-bold px-3 py-1 rounded-lg ${
                    course.grade >= 90 
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                      : course.grade >= 80 
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : course.grade >= 70
                      ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                      : 'bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {course.grade.toFixed(0)}
                  </div>
                </div>
              ));
            }
            
            // No data for this cycle
            return (
              <Card>
                  <CardContent className="py-12 text-center">
                    <div className="text-muted-foreground/50">
                      <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No grades available for {selectedCycle}</p>
                      <p className="text-sm mt-1">Grades will appear here once they are posted.</p>
                    </div>
                  </CardContent>
                </Card>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
