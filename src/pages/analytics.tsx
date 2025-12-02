import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsCharts } from "@/components/charts/AnalyticsCharts";
import { useGamification } from "@/hooks/useGamification";
import { usePerformanceOptimization } from "@/hooks/usePerformanceOptimization";
import {
  TrendingUp,
  Target,
  Clock,
  CheckCircle,
  Calendar,
  Zap,
  BookOpen,
  Brain,
  Trophy,
  Star,
  Activity,
  Download,
  BarChart3,
} from "lucide-react";

export default function Analytics() {
  const { 
    userStats, 
    unlockedAchievements,
    leaderboard,
    calculateLevel 
  } = useGamification();
  
  const { 
    metrics,
    generatePerformanceReport,
    startMonitoring,
    isMonitoring 
  } = usePerformanceOptimization();

  // Mock analytics data - in real app, this would come from Firebase
  const stats = {
    totalTasks: 156,
    completedTasks: 124,
    completionRate: 79.5,
    currentStreak: 12,
    longestStreak: 23,
    totalStudyTime: 145, // hours
    averageSessionTime: 45, // minutes
    pomodoroSessions: 89,
    flashcardsReviewed: 234,
    moodAverage: 4.2,
  };

  const weeklyGoals = [
    { name: "Complete 15 assignments", current: 12, target: 15, color: "bg-blue-500" },
    { name: "Study 25 hours", current: 18, target: 25, color: "bg-green-500" },
    { name: "Review 50 flashcards", current: 45, target: 50, color: "bg-purple-500" },
    { name: "Maintain mood > 4.0", current: 4.2, target: 4.0, color: "bg-yellow-500" },
  ];

  const recentAchievements = [
    {
      title: "Week Warrior",
      description: "Completed all assignments this week",
      icon: Target,
      color: "text-green-500",
      date: "2 days ago",
    },
    {
      title: "Pomodoro Master",
      description: "Completed 50 Pomodoro sessions",
      icon: Clock,
      color: "text-red-500",
      date: "1 week ago",
    },
    {
      title: "Study Streak",
      description: "10-day study streak",
      icon: Zap,
      color: "text-yellow-500",
      date: "2 weeks ago",
    },
    {
      title: "Flashcard Pro",
      description: "Reviewed 200+ flashcards",
      icon: Brain,
      color: "text-purple-500",
      date: "3 weeks ago",
    },
  ];

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <TrendingUp className="h-8 w-8 mr-3 text-primary" />
            Analytics & Insights
          </h1>
          <p className="text-muted-foreground">
            Track your productivity, study patterns, and academic progress
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              if (isMonitoring) {
                const report = generatePerformanceReport();
                console.log('Performance Report:', report);
              } else {
                startMonitoring();
              }
            }}
          >
            <Activity className="h-4 w-4 mr-2" />
            {isMonitoring ? 'Generate Report' : 'Start Monitoring'}
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              const data = {
                userStats,
                achievements: unlockedAchievements,
                metrics,
                exportedAt: new Date().toISOString(),
              };
              
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              
              const link = document.createElement('a');
              link.href = url;
              link.download = `studysync-analytics-${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold text-green-500">{stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {stats.completedTasks}/{stats.totalTasks} tasks
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Study Streak</p>
                <p className="text-2xl font-bold text-primary">{stats.currentStreak}</p>
                <p className="text-xs text-muted-foreground">
                  Best: {stats.longestStreak} days
                </p>
              </div>
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Study Time</p>
                <p className="text-2xl font-bold text-blue-500">{stats.totalStudyTime}h</p>
                <p className="text-xs text-muted-foreground">
                  Avg: {stats.averageSessionTime}min/session
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mood Score</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.moodAverage}/5</p>
                <p className="text-xs text-muted-foreground">
                  This month average
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="productivity" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="productivity">Productivity</TabsTrigger>
              <TabsTrigger value="study-time">Study Time</TabsTrigger>
              <TabsTrigger value="mood">Mood Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="productivity">
              <AnalyticsCharts type="productivity" />
            </TabsContent>

            <TabsContent value="study-time">
              <AnalyticsCharts type="study-time" />
            </TabsContent>

            <TabsContent value="mood">
              <AnalyticsCharts type="mood" />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Weekly Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Weekly Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyGoals.map((goal, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{goal.name}</span>
                      <span className="text-muted-foreground">
                        {goal.current}/{goal.target}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`${goal.color} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${getProgressPercentage(goal.current, goal.target)}%` }}
                      />
                    </div>
                    {goal.current >= goal.target && (
                      <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200">
                        Completed!
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAchievements.map((achievement, index) => {
                  const Icon = achievement.icon;
                  return (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                      <div className={`w-8 h-8 rounded-full bg-background flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${achievement.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{achievement.title}</p>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{achievement.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Study Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Study Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pomodoro Sessions</span>
                  <span className="font-medium">{stats.pomodoroSessions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Flashcards Reviewed</span>
                  <span className="font-medium">{stats.flashcardsReviewed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Average Session</span>
                  <span className="font-medium">{stats.averageSessionTime} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Best Streak</span>
                  <span className="font-medium">{stats.longestStreak} days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
