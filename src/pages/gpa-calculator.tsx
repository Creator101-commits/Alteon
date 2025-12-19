/**
 * GPA Calculator Page
 * Calculate cumulative GPA including past years with course exclusion
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useHAC } from '@/contexts/HACContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  GraduationCap, 
  RefreshCw, 
  Loader2, 
  Settings,
  TrendingUp,
  Award,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// GPA Scale types
type CourseLevel = 'regular' | 'pre-ap' | 'ap' | 'dual-credit';

interface GPAScale {
  regular: number;
  'pre-ap': number;
  ap: number;
  'dual-credit': number;
}

// Texas standard GPA scale (6.0 scale)
const GPA_SCALES: { [key: string]: GPAScale } = {
  texas_6: {
    regular: 5.0,
    'pre-ap': 5.5,
    ap: 6.0,
    'dual-credit': 6.0,
  },
  standard_4: {
    regular: 4.0,
    'pre-ap': 4.5,
    ap: 5.0,
    'dual-credit': 5.0,
  },
};

interface CourseGPAEntry {
  id: string;
  courseName: string;
  courseCode: string;
  grade: number;
  level: CourseLevel;
  credits: number;
  gpaPoints: number;
  excluded: boolean;
  cycle?: string;
  year?: string;
}

interface YearData {
  year: string;
  cycles: {
    cycleName: string;
    courses: CourseGPAEntry[];
  }[];
}

function detectCourseLevel(courseName: string, courseCode: string): CourseLevel {
  const nameUpper = courseName.toUpperCase();
  const codeUpper = courseCode.toUpperCase();
  const combined = nameUpper + ' ' + codeUpper;
  
  // AP courses - check multiple patterns
  if (combined.includes('AP ') || 
      combined.includes('A.P.') || 
      combined.includes(' AP') ||
      /\bAP\b/.test(combined) ||  // AP as whole word
      combined.includes('ADVANCED PLACEMENT')) {
    return 'ap';
  }
  
  // Dual Credit / College courses
  if (combined.includes('DUAL CREDIT') || 
      combined.includes('DUAL-CREDIT') || 
      combined.includes('DUALCREDIT') ||
      combined.includes('DC ') ||
      combined.includes(' DC') ||
      /\bDC\b/.test(combined) ||
      combined.includes('COLLEGE ') ||
      combined.includes('ONRAMPS') ||
      combined.includes('ON RAMPS') ||
      combined.includes('ON-RAMPS')) {
    return 'dual-credit';
  }
  
  // Pre-AP / Honors / GT / Advanced courses
  if (combined.includes('PRE-AP') || 
      combined.includes('PRE AP') || 
      combined.includes('PREAP') ||
      combined.includes('PAP ') ||
      combined.includes(' PAP') ||
      /\bPAP\b/.test(combined) ||
      combined.includes('HONORS') ||
      combined.includes('HONOR ') ||
      combined.includes(' GT ') ||
      combined.includes(' GT') ||
      /\bGT\b/.test(combined) ||
      combined.includes('GIFTED') ||
      combined.includes('ADVANCED ') ||
      combined.includes(' ADV ') ||
      combined.includes('ACCELERATED') ||
      combined.includes('IB ') ||  // International Baccalaureate (treated as advanced)
      /\bIB\b/.test(combined)) {
    return 'pre-ap';
  }
  
  return 'regular';
}

/**
 * Leander ISD GPA Calculation (Exact Percentage Based)
 * 
 * GPA decreases by 0.1 for each percentage point below 100.
 * 
 * Level III (AP/Dual Credit): 100=6.0, 99=5.9, 98=5.8... 95=5.5, 90=5.0, 70=3.0
 * Level II (Pre-AP/Advanced): 100=5.5, 99=5.4, 98=5.3... 95=5.0, 90=4.5, 70=2.5
 * Level I (Regular/On-Level): 100=5.0, 99=4.9, 98=4.8... 95=4.5, 90=4.0, 70=2.0
 * Below 70 = 0.0 for all levels
 * 
 * Formula: GPA = maxGPA - (100 - grade) × 0.1
 */
function calculateGPA(grade: number, level: CourseLevel, scale: GPAScale): number {
  // Below 70 is failing = 0 GPA
  if (grade < 70) {
    return 0;
  }
  
  // Cap grade at 100
  const cappedGrade = Math.min(grade, 100);
  
  // Get max GPA for this course level (AP=6.0, Pre-AP=5.5, Regular=5.0)
  const maxGPA = scale[level];
  
  // GPA = maxGPA - (100 - grade) × 0.1
  // e.g., 95 in AP: 6.0 - (100-95) × 0.1 = 6.0 - 0.5 = 5.5
  // e.g., 95 in Pre-AP: 5.5 - (100-95) × 0.1 = 5.5 - 0.5 = 5.0
  // e.g., 95 in Regular: 5.0 - (100-95) × 0.1 = 5.0 - 0.5 = 4.5
  const gpa = maxGPA - (100 - cappedGrade) * 0.1;
  
  return Math.round(gpa * 10) / 10; // Round to 1 decimal place
}

function getGradeColor(grade: number): string {
  if (grade >= 90) return 'text-green-600 dark:text-green-400';
  if (grade >= 80) return 'text-blue-600 dark:text-blue-400';
  if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getLevelBadgeColor(level: CourseLevel): string {
  switch (level) {
    case 'ap': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'dual-credit': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'pre-ap': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
}

function getLevelLabel(level: CourseLevel): string {
  switch (level) {
    case 'ap': return 'AP';
    case 'dual-credit': return 'Dual Credit';
    case 'pre-ap': return 'Pre-AP/Honors';
    default: return 'Regular';
  }
}

export default function GPACalculator() {
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
  const [gpaScale, setGpaScale] = useState<'texas_6' | 'standard_4'>('texas_6');
  const [courses, setCourses] = useState<CourseGPAEntry[]>([]);
  const [showExcluded, setShowExcluded] = useState(true);
  const [activeTab, setActiveTab] = useState('calculator');

  // Load excluded courses from localStorage
  const getExcludedCourses = (): Set<string> => {
    try {
      const saved = localStorage.getItem('gpa-excluded-courses');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  };

  // Save excluded courses to localStorage
  const saveExcludedCourses = (excludedNames: Set<string>) => {
    try {
      localStorage.setItem('gpa-excluded-courses', JSON.stringify([...excludedNames]));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Load courses from HAC data
  useEffect(() => {
    if (!reportCard && isConnected) {
      fetchReportCard();
    }
  }, [isConnected, reportCard, fetchReportCard]);

  // Process report card data into course entries
  useEffect(() => {
    if (reportCard) {
      const excludedNames = getExcludedCourses();
      const processedCourses: CourseGPAEntry[] = [];
      
      reportCard.cycles.forEach((cycle, cycleIdx) => {
        cycle.courses.forEach((course, courseIdx) => {
          const level = detectCourseLevel(course.course, course.courseCode);
          const gpaPoints = calculateGPA(course.grade, level, GPA_SCALES[gpaScale]);
          
          processedCourses.push({
            id: `${cycleIdx}-${courseIdx}`,
            courseName: course.course,
            courseCode: course.courseCode,
            grade: course.grade,
            level,
            credits: 1, // Default 1 credit per course
            gpaPoints,
            excluded: excludedNames.has(course.course), // Apply saved exclusion
            cycle: cycle.cycleName,
          });
        });
      });
      
      setCourses(processedCourses);
    }
  }, [reportCard, gpaScale]);

  // Also include current grades if available
  useEffect(() => {
    if (gradesData && courses.length === 0) {
      const excludedNames = getExcludedCourses();
      const currentCourses: CourseGPAEntry[] = gradesData.grades
        .filter(g => g.numericGrade !== null)
        .map((course, idx) => {
          const level = detectCourseLevel(course.name, course.courseId || '');
          const gpaPoints = calculateGPA(course.numericGrade!, level, GPA_SCALES[gpaScale]);
          
          return {
            id: `current-${idx}`,
            courseName: course.name,
            courseCode: course.courseId || '',
            grade: course.numericGrade!,
            level,
            credits: 1,
            gpaPoints,
            excluded: excludedNames.has(course.name), // Apply saved exclusion
            cycle: 'Current',
          };
        });
      
      setCourses(prev => {
        const existingIds = new Set(prev.map(c => c.courseName + c.cycle));
        const newCourses = currentCourses.filter(c => !existingIds.has(c.courseName + c.cycle));
        return [...prev, ...newCourses];
      });
    }
  }, [gradesData, gpaScale]);

  // Recalculate GPA points when scale changes
  useEffect(() => {
    setCourses(prev => prev.map(course => ({
      ...course,
      gpaPoints: calculateGPA(course.grade, course.level, GPA_SCALES[gpaScale])
    })));
  }, [gpaScale]);

  // Toggle course exclusion - excludes ALL instances of this course across all cycles
  const toggleExclusion = (courseId: string) => {
    setCourses(prev => {
      // Find the course being toggled
      const targetCourse = prev.find(c => c.id === courseId);
      if (!targetCourse) return prev;
      
      const newExcludedState = !targetCourse.excluded;
      const courseName = targetCourse.courseName;
      
      // Update localStorage
      const excludedNames = getExcludedCourses();
      if (newExcludedState) {
        excludedNames.add(courseName);
      } else {
        excludedNames.delete(courseName);
      }
      saveExcludedCourses(excludedNames);
      
      // Toggle all courses with the same name across all cycles
      return prev.map(course => 
        course.courseName === courseName 
          ? { ...course, excluded: newExcludedState }
          : course
      );
    });
  };

  // Exclude/Include all courses in a cycle
  const toggleCycleExclusion = (cycleName: string, exclude: boolean) => {
    setCourses(prev => {
      // Get course names in this cycle
      const cycleCoursesNames = prev
        .filter(c => c.cycle === cycleName)
        .map(c => c.courseName);
      
      // Update localStorage
      const excludedNames = getExcludedCourses();
      cycleCoursesNames.forEach(name => {
        if (exclude) {
          excludedNames.add(name);
        } else {
          excludedNames.delete(name);
        }
      });
      saveExcludedCourses(excludedNames);
      
      return prev.map(course => 
        course.cycle === cycleName 
          ? { ...course, excluded: exclude }
          : course
      );
    });
  };

  // Change course level
  const changeCourseLevel = (courseId: string, level: CourseLevel) => {
    setCourses(prev => prev.map(course => 
      course.id === courseId 
        ? { 
            ...course, 
            level, 
            gpaPoints: calculateGPA(course.grade, level, GPA_SCALES[gpaScale])
          }
        : course
    ));
  };

  // Calculate cumulative GPA
  const gpaStats = useMemo(() => {
    const includedCourses = courses.filter(c => !c.excluded);
    const excludedCourses = courses.filter(c => c.excluded);
    
    if (includedCourses.length === 0) {
      return {
        cumulativeGPA: 0,
        totalCredits: 0,
        totalGPAPoints: 0,
        includedCount: 0,
        excludedCount: excludedCourses.length,
        byLevel: {
          regular: { count: 0, avgGPA: 0 },
          'pre-ap': { count: 0, avgGPA: 0 },
          ap: { count: 0, avgGPA: 0 },
          'dual-credit': { count: 0, avgGPA: 0 },
        },
        averageGrade: 0,
      };
    }
    
    const totalCredits = includedCourses.reduce((sum, c) => sum + c.credits, 0);
    const totalGPAPoints = includedCourses.reduce((sum, c) => sum + (c.gpaPoints * c.credits), 0);
    const cumulativeGPA = totalGPAPoints / totalCredits;
    const averageGrade = includedCourses.reduce((sum, c) => sum + c.grade, 0) / includedCourses.length;
    
    // Stats by level
    const byLevel: { [key in CourseLevel]: { count: number; avgGPA: number } } = {
      regular: { count: 0, avgGPA: 0 },
      'pre-ap': { count: 0, avgGPA: 0 },
      ap: { count: 0, avgGPA: 0 },
      'dual-credit': { count: 0, avgGPA: 0 },
    };
    
    const levelGroups: { [key in CourseLevel]: number[] } = {
      regular: [],
      'pre-ap': [],
      ap: [],
      'dual-credit': [],
    };
    
    includedCourses.forEach(c => {
      levelGroups[c.level].push(c.gpaPoints);
    });
    
    Object.keys(levelGroups).forEach(level => {
      const arr = levelGroups[level as CourseLevel];
      byLevel[level as CourseLevel] = {
        count: arr.length,
        avgGPA: arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
      };
    });
    
    return {
      cumulativeGPA,
      totalCredits,
      totalGPAPoints,
      includedCount: includedCourses.length,
      excludedCount: excludedCourses.length,
      byLevel,
      averageGrade,
    };
  }, [courses]);

  // Group courses by cycle
  const coursesByCycle = useMemo(() => {
    const grouped: { [cycle: string]: CourseGPAEntry[] } = {};
    courses.forEach(course => {
      const key = course.cycle || 'Unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(course);
    });
    return grouped;
  }, [courses]);

  if (!isConnected) {
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              GPA Calculator
            </h1>
            <p className="text-sm text-muted-foreground">
              Calculate your cumulative GPA with course-level adjustments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => setLocation('/hac-grades')}
            >
              <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
              HAC Grades
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                refreshGrades();
                fetchReportCard();
              }}
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

        {/* Settings Row */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="gpa-scale" className="text-sm">Scale:</Label>
                  <Select value={gpaScale} onValueChange={(v) => setGpaScale(v as any)}>
                    <SelectTrigger id="gpa-scale" className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="texas_6">Texas 6.0</SelectItem>
                      <SelectItem value="standard_4">Standard 4.0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                Click "Exclude" to remove a course from GPA calculation
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Level Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {(['ap', 'dual-credit', 'pre-ap', 'regular'] as CourseLevel[]).map(level => (
            <Card key={level} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={cn("text-xs", getLevelBadgeColor(level))}>
                    {getLevelLabel(level)}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">
                  {gpaStats.byLevel[level].count}
                </div>
                <div className="text-xs text-muted-foreground">
                  Avg: {gpaStats.byLevel[level].avgGPA.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading courses...</p>
            </CardContent>
          </Card>
        ) : courses.length === 0 ? (
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
          /* Courses by Cycle */
          <div className="space-y-6">
            {Object.entries(coursesByCycle).map(([cycle, cycleCourses]) => {
              const includedCourses = cycleCourses.filter(c => !c.excluded);
              const includedCount = includedCourses.length;
              const allExcluded = includedCount === 0;
              const allIncluded = includedCount === cycleCourses.length;
              
              // Calculate per-cycle GPA
              const cycleGPA = includedCount > 0
                ? includedCourses.reduce((sum, c) => sum + c.gpaPoints, 0) / includedCount
                : 0;
              
              return (
              <Card key={cycle}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{cycle}</CardTitle>
                      <Badge variant="outline" className="font-bold text-primary border-primary/50">
                        GPA: {cycleGPA.toFixed(2)}
                      </Badge>
                      <Badge variant="secondary">
                        {includedCount} / {cycleCourses.length} included
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleCycleExclusion(cycle, true)}
                        disabled={allExcluded}
                      >
                        <EyeOff className="h-3 w-3 mr-1" />
                        Exclude All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleCycleExclusion(cycle, false)}
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
                    {cycleCourses
                      .map((course) => (
                        <div 
                          key={course.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-all relative",
                            course.excluded 
                              ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50" 
                              : "bg-card hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Button
                              variant={course.excluded ? "outline" : "ghost"}
                              size="sm"
                              className={cn(
                                "h-7 text-xs shrink-0",
                                course.excluded 
                                  ? "text-muted-foreground border-dashed"
                                  : "text-destructive hover:text-destructive hover:bg-destructive/10"
                              )}
                              onClick={() => toggleExclusion(course.id)}
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
                              <p className={cn(
                                "font-medium text-sm truncate",
                                course.excluded && "text-muted-foreground"
                              )}>
                                {course.courseName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {course.courseCode}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Select 
                              value={course.level}
                              onValueChange={(v) => changeCourseLevel(course.id, v as CourseLevel)}
                            >
                              <SelectTrigger 
                                className={cn("w-[100px] h-7 text-xs", getLevelBadgeColor(course.level))}
                              >
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
                              <p className={cn("font-bold text-sm", getGradeColor(course.grade))}>
                                {course.grade}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {course.gpaPoints.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}

        {/* Footer Info */}
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
      </div>
    </div>
  );
}
