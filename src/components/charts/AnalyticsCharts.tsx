import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsChartsProps {
  type: "productivity" | "study-time" | "mood";
}

export const AnalyticsCharts = ({ type }: AnalyticsChartsProps) => {
  // Mock data - in real app, this would come from Firebase analytics
  const productivityData = [
    { date: "Jan 1", completed: 85, pending: 15, overdue: 0 },
    { date: "Jan 2", completed: 75, pending: 20, overdue: 5 },
    { date: "Jan 3", completed: 90, pending: 10, overdue: 0 },
    { date: "Jan 4", completed: 80, pending: 15, overdue: 5 },
    { date: "Jan 5", completed: 95, pending: 5, overdue: 0 },
    { date: "Jan 6", completed: 70, pending: 25, overdue: 5 },
    { date: "Jan 7", completed: 88, pending: 12, overdue: 0 },
  ];

  const studyTimeData = [
    { date: "Mon", pomodoro: 120, flashcards: 45, reading: 90 },
    { date: "Tue", pomodoro: 100, flashcards: 60, reading: 75 },
    { date: "Wed", pomodoro: 140, flashcards: 30, reading: 110 },
    { date: "Thu", pomodoro: 90, flashcards: 50, reading: 85 },
    { date: "Fri", pomodoro: 110, flashcards: 40, reading: 95 },
    { date: "Sat", pomodoro: 80, flashcards: 70, reading: 120 },
    { date: "Sun", pomodoro: 60, flashcards: 35, reading: 60 },
  ];

  const moodData = [
    { date: "Week 1", mood: 4.2, energy: 3.8, focus: 4.0 },
    { date: "Week 2", mood: 3.9, energy: 4.1, focus: 3.7 },
    { date: "Week 3", mood: 4.5, energy: 4.3, focus: 4.2 },
    { date: "Week 4", mood: 4.1, energy: 3.9, focus: 4.1 },
  ];

  const taskDistribution = [
    { name: "Completed", value: 124, color: "#10b981" },
    { name: "In Progress", value: 18, color: "#f59e0b" },
    { name: "Overdue", value: 8, color: "#ef4444" },
    { name: "Not Started", value: 6, color: "#6b7280" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="capitalize">{entry.dataKey}:</span>
              <span className="font-medium">
                {type === "mood" ? entry.value.toFixed(1) : entry.value}
                {type === "study-time" ? " min" : type === "mood" ? "/5" : "%"}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (type === "productivity") {
    return (
      <div className="space-y-6">
        {/* Task Completion Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Task Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={productivityData}>
                <defs>
                  <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(207, 90%, 54%)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(207, 90%, 54%)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(207, 90%, 54%)"
                  fillOpacity={1}
                  fill="url(#completedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={taskDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {taskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="space-y-3">
                {taskDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === "study-time") {
    return (
      <div className="space-y-6">
        {/* Weekly Study Time */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Study Time Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={studyTimeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pomodoro" stackId="a" fill="hsl(207, 90%, 54%)" name="Pomodoro" />
                <Bar dataKey="flashcards" stackId="a" fill="hsl(142, 71%, 45%)" name="Flashcards" />
                <Bar dataKey="reading" stackId="a" fill="hsl(262, 83%, 58%)" name="Reading" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Study Time Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Study Time Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={studyTimeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="pomodoro"
                  stroke="hsl(207, 90%, 54%)"
                  strokeWidth={3}
                  name="Pomodoro"
                />
                <Line
                  type="monotone"
                  dataKey="flashcards"
                  stroke="hsl(142, 71%, 45%)"
                  strokeWidth={3}
                  name="Flashcards"
                />
                <Line
                  type="monotone"
                  dataKey="reading"
                  stroke="hsl(262, 83%, 58%)"
                  strokeWidth={3}
                  name="Reading"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === "mood") {
    return (
      <div className="space-y-6">
        {/* Mood Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Mood & Wellbeing Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={moodData}>
                <defs>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(207, 90%, 54%)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(207, 90%, 54%)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-muted-foreground" />
                <YAxis domain={[0, 5]} className="text-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="mood"
                  stackId="1"
                  stroke="hsl(45, 93%, 47%)"
                  fill="url(#moodGradient)"
                  name="Mood"
                />
                <Area
                  type="monotone"
                  dataKey="energy"
                  stackId="2"
                  stroke="hsl(142, 71%, 45%)"
                  fill="url(#energyGradient)"
                  name="Energy"
                />
                <Area
                  type="monotone"
                  dataKey="focus"
                  stackId="3"
                  stroke="hsl(207, 90%, 54%)"
                  fill="url(#focusGradient)"
                  name="Focus"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Mood Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Average Scores This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Mood</span>
                  <span className="font-medium">4.2/5</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: "84%" }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Energy</span>
                  <span className="font-medium">4.0/5</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: "80%" }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Focus</span>
                  <span className="font-medium">4.0/5</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: "80%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};
