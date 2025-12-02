import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPost } from "@/lib/api";
import { MoodEntry, InsertMoodEntry } from "@shared/schema";
import {
  Smile,
  Meh,
  Frown,
  Heart,
  Sun,
  Cloud,
  CloudRain,
  Zap,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format, isToday, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";


const moodConfig = {
  1: { label: "Very Bad", color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/20", icon: Frown },
  2: { label: "Bad", color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/20", icon: CloudRain },
  3: { label: "Okay", color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/20", icon: Meh },
  4: { label: "Good", color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/20", icon: Smile },
  5: { label: "Excellent", color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/20", icon: Heart },
};

export const MoodTracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMood, setCurrentMood] = useState<number>(3);
  const [notes, setNotes] = useState("");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Load mood entries from database
  const loadMoodEntries = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const response = await apiGet(`/api/users/${user.uid}/mood-entries`);
      if (response.ok) {
        const data = await response.json();
        setMoodEntries(data);
        console.log(' Loaded mood entries:', data.length);
      } else {
        console.error('Failed to load mood entries:', response.status);
        toast({
          title: "Error",
          description: "Failed to load mood entries",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading mood entries:', error);
      toast({
        title: "Error",
        description: "Failed to load mood entries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load mood entries on component mount
  useEffect(() => {
    loadMoodEntries();
  }, [user?.uid]);

  const getTodayEntry = () => {
    return moodEntries.find(entry => entry.date && isToday(entry.date));
  };

  const getEntryForDate = (date: Date) => {
    return moodEntries.find(entry => 
      entry.date && format(entry.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const saveMoodEntry = async () => {
    if (!user?.uid) return;

    try {
      const moodData = {
        mood: currentMood,
        notes: notes.trim(),
      };

      const response = await apiPost(`/api/users/${user.uid}/mood-entries`, moodData);
      
      if (response.ok) {
        const createdEntry = await response.json();
        setMoodEntries(prev => [...prev, createdEntry]);
        setNotes("");
        
        toast({
          title: "Mood saved! ",
          description: `Your ${moodConfig[currentMood as keyof typeof moodConfig].label.toLowerCase()} mood has been recorded`,
        });
      } else {
        throw new Error('Failed to save mood entry');
      }
    } catch (error) {
      console.error('Error saving mood entry:', error);
      toast({
        title: "Error",
        description: "Failed to save mood entry",
        variant: "destructive",
      });
    }
  };

  const getWeeklyAverage = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weekEntries = moodEntries.filter(entry => entry.date && entry.date >= oneWeekAgo);
    
    if (weekEntries.length === 0) return 0;
    
    const sum = weekEntries.reduce((acc, entry) => acc + entry.mood, 0);
    return (sum / weekEntries.length).toFixed(1);
  };

  const getMonthlyStats = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const monthEntries = moodEntries.filter(entry => 
      entry.date && entry.date >= monthStart && entry.date <= monthEnd
    );

    const moodCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    monthEntries.forEach(entry => {
      moodCounts[entry.mood as keyof typeof moodCounts]++;
    });

    const mostCommon = Object.entries(moodCounts).reduce((a, b) => 
      moodCounts[parseInt(a[0]) as keyof typeof moodCounts] > moodCounts[parseInt(b[0]) as keyof typeof moodCounts] ? a : b
    );

    return {
      totalEntries: monthEntries.length,
      averageMood: monthEntries.length > 0 
        ? (monthEntries.reduce((sum, entry) => sum + entry.mood, 0) / monthEntries.length).toFixed(1)
        : "0",
      mostCommonMood: parseInt(mostCommon[0]),
      streak: getConsecutiveDays(),
    };
  };

  const getConsecutiveDays = () => {
    const sortedEntries = [...moodEntries]
      .filter(entry => entry.date)
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return b.date.getTime() - a.date.getTime();
      });
    
    let streak = 0;
    let currentDate = new Date();
    
    for (const entry of sortedEntries) {
      const entryDateStr = entry.date ? format(entry.date, "yyyy-MM-dd") : "";
      const currentDateStr = format(currentDate, "yyyy-MM-dd");
      
      if (entryDateStr === currentDateStr) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getMoodEmoji = (mood: number) => {
    const config = moodConfig[mood as keyof typeof moodConfig];
    const Icon = config.icon;
    return <Icon className={`h-6 w-6 ${config.color}`} />;
  };

  const todayEntry = getTodayEntry();
  const selectedEntry = selectedCalendarDate ? getEntryForDate(selectedCalendarDate) : null;
  const monthlyStats = getMonthlyStats();

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Mood Input */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Smile className="h-5 w-5 mr-2 text-foreground" />
                How are you feeling today?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {todayEntry && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    {getMoodEmoji(todayEntry.mood)}
                    <span className="font-medium">
                      You felt {moodConfig[todayEntry.mood as keyof typeof moodConfig].label.toLowerCase()} today
                    </span>
                  </div>
                  {todayEntry.notes && (
                    <p className="text-sm text-muted-foreground">"{todayEntry.notes}"</p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-3 block">Select your mood:</label>
                  <div className="flex justify-between space-x-2">
                    {Object.entries(moodConfig).map(([mood, config]) => {
                      const Icon = config.icon;
                      const moodNum = parseInt(mood);
                      const isSelected = currentMood === moodNum;
                      
                      return (
                        <Button
                          key={mood}
                          variant={isSelected ? "default" : "outline"}
                          size="lg"
                          onClick={() => setCurrentMood(moodNum)}
                          className={`flex-1 h-16 flex-col space-y-1 ${
                            isSelected ? config.bg : ""
                          }`}
                        >
                          <Icon className={`h-6 w-6 ${config.color}`} />
                          <span className="text-xs">{config.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Notes (optional):
                  </label>
                  <Textarea
                    placeholder="What made you feel this way? Any thoughts or reflections..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {notes.length}/500 characters
                  </div>
                </div>

                <Button
                  onClick={saveMoodEntry}
                  className="w-full gradient-bg"
                  disabled={!currentMood}
                >
                  {todayEntry ? "Update Today's Mood" : "Save Today's Mood"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Entries */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {moodEntries
                  .filter(entry => entry.date)
                  .sort((a, b) => {
                    if (!a.date || !b.date) return 0;
                    return b.date.getTime() - a.date.getTime();
                  })
                  .slice(0, 7)
                  .map((entry) => (
                    <div key={entry.id} className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                      <div className="flex-shrink-0">
                        {getMoodEmoji(entry.mood)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">
                            {entry.date ? format(entry.date, "MMM d, yyyy") : "Unknown date"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {moodConfig[entry.mood as keyof typeof moodConfig].label}
                          </Badge>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground">"{entry.notes}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                
                {moodEntries.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Smile className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No mood entries yet. Start tracking your mood today!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entries</span>
                <span className="font-semibold">{monthlyStats.totalEntries}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Average Mood</span>
                <span className="font-semibold">{monthlyStats.averageMood}/5</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Most Common</span>
                <div className="flex items-center space-x-1">
                  {getMoodEmoji(monthlyStats.mostCommonMood)}
                  <span className="text-xs">
                    {moodConfig[monthlyStats.mostCommonMood as keyof typeof moodConfig].label}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Streak</span>
                <span className="font-semibold text-primary">{monthlyStats.streak} days</span>
              </div>
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Mood Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedCalendarDate}
                onSelect={setSelectedCalendarDate}
                className="rounded-md border"
                components={{
                  Day: ({ date, displayMonth, ...props }) => {
                    const entry = getEntryForDate(date);
                    return (
                      <div className="relative">
                        <button {...props} />
                        {entry && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          </div>
                        )}
                      </div>
                    );
                  },
                }}
              />
              
              {selectedEntry && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    {getMoodEmoji(selectedEntry.mood)}
                    <span className="font-medium text-sm">
                      {moodConfig[selectedEntry.mood as keyof typeof moodConfig].label}
                    </span>
                  </div>
                  {selectedEntry.notes && (
                    <p className="text-xs text-muted-foreground">"{selectedEntry.notes}"</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mood Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Track your mood daily for better insights</p>
                <p>• Note what affects your mood positively</p>
                <p>• Use patterns to improve your wellbeing</p>
                <p>• Celebrate your progress over time</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};