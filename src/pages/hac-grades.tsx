/**
 * HAC Grades Page
 * Displays grades from Home Access Center
 */

import React, { useEffect, useState } from 'react';
import { useHAC } from '@/contexts/HACContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  GraduationCap, 
  RefreshCw, 
  Loader2, 
  ChevronDown,
  ChevronRight,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Settings,
  Award,
  Calculator
} from 'lucide-react';

function getGradeColor(grade: number | null): string {
  if (grade === null) return 'text-muted-foreground';
  if (grade >= 90) return 'text-green-600 dark:text-green-400';
  if (grade >= 80) return 'text-blue-600 dark:text-blue-400';
  if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getGradeBadgeVariant(grade: number | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (grade === null) return 'outline';
  if (grade >= 90) return 'default';
  if (grade >= 70) return 'secondary';
  return 'destructive';
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
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('current');

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

  // Fetch report card when tab changes
  useEffect(() => {
    if (activeTab === 'report-card' && !reportCard && isConnected) {
      fetchReportCard();
    }
  }, [activeTab, reportCard, isConnected, fetchReportCard]);

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

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

        {/* Stats Overview */}
        {gradesData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{gradesData.overallAverage.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Overall Average</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{gradesData.grades.length}</div>
                <p className="text-xs text-muted-foreground">Active Courses</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {gradesData.grades.filter(g => g.numericGrade !== null && g.numericGrade >= 90).length}
                </div>
                <p className="text-xs text-muted-foreground">A's</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {gradesData.grades.reduce((sum, g) => sum + g.assignments.length, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Assignments</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="current">Current Grades</TabsTrigger>
            <TabsTrigger value="report-card">Report Card</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            {isLoading && !gradesData ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading grades...</p>
                </CardContent>
              </Card>
            ) : gradesData ? (
              gradesData.grades.map((course) => (
                <Collapsible
                  key={course.courseId}
                  open={expandedCourses.has(course.courseId)}
                  onOpenChange={() => toggleCourse(course.courseId)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedCourses.has(course.courseId) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <CardTitle className="text-base">{course.name}</CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                <BookOpen className="h-3 w-3" />
                                {course.assignments.length} assignments
                                {course.gpa && (
                                  <>
                                    <span className="text-muted-foreground">•</span>
                                    <TrendingUp className="h-3 w-3" />
                                    GPA: {course.gpa.toFixed(2)}
                                  </>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getGradeColor(course.numericGrade)}`}>
                              {course.grade}
                            </div>
                            {course.numericGrade !== null && (
                              <Progress 
                                value={course.numericGrade} 
                                className="w-24 h-2 mt-2"
                              />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="border-t">
                        {course.assignments.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No assignments yet
                          </p>
                        ) : (
                          <div className="divide-y">
                            {course.assignments.map((assignment, idx) => (
                              <div 
                                key={idx} 
                                className="py-3 flex items-center justify-between"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {assignment.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {assignment.category} • Due: {assignment.dateDue}
                                  </p>
                                </div>
                                <Badge 
                                  variant={getGradeBadgeVariant(
                                    assignment.score === 'N/A' ? null : parseFloat(assignment.score)
                                  )}
                                  className="ml-4"
                                >
                                  {assignment.score}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            ) : null}
          </TabsContent>

          <TabsContent value="report-card" className="space-y-4">
            {isLoading && !reportCard ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading report card...</p>
                </CardContent>
              </Card>
            ) : reportCard ? (
              <>
                {/* Overall GPA */}
                <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Award className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Overall GPA</p>
                          <p className="text-3xl font-bold">{reportCard.overallGpa.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Cycles</p>
                        <p className="text-2xl font-bold">{reportCard.cycles.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cycles */}
                {reportCard.cycles.map((cycle, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{cycle.cycleName}</CardTitle>
                        <Badge variant="secondary">
                          GPA: {cycle.averageGpa.toFixed(2)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y">
                        {cycle.courses.map((course, cIdx) => (
                          <div 
                            key={cIdx}
                            className="py-3 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-medium text-sm">{course.course}</p>
                              <p className="text-xs text-muted-foreground">
                                {course.courseCode}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${getGradeColor(course.grade)}`}>
                                {course.grade}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                GPA: {course.gpa.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {reportCard.cycles.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">No report card data available</p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
