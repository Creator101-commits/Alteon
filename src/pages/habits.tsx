import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Target, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Flame, 
  Trash2,
  MoreVertical
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";

interface Habit {
  id: string;
  name: string;
  description: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'custom';
  targetCount: number;
  color: string;
  icon: string;
  streak: number;
  completions: { [date: string]: number };
  createdAt: string;
  isActive: boolean;
}

const HABIT_CATEGORIES = [
  'Study', 'Health', 'Personal', 'Work', 'Social', 'Creative', 'Other'
];

const HABIT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
];

const HABIT_ICONS = [
  'Target', 'BookOpen', 'Heart', 'Dumbbell', 'Coffee', 'Moon', 'Sun', 'Music'
];

export default function HabitTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    category: 'Study',
    frequency: 'daily' as const,
    targetCount: 1,
    color: HABIT_COLORS[0],
    icon: HABIT_ICONS[0]
  });

  // Load habits from backend
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const res = await fetch("/api/habits", {
          headers: {
            "x-user-id": user.uid,
          },
        });
        if (!res.ok) throw new Error("Failed to load habits");
        const data = await res.json();

        const normalized: Habit[] = data.map((h: any) => ({
          id: h.id,
          name: h.name,
          description: h.description || "",
          category: h.category || "Study",
          frequency: (h.frequency || "daily") as Habit["frequency"],
          targetCount: h.targetCount || 1,
          color: h.color || HABIT_COLORS[0],
          icon: h.icon || HABIT_ICONS[0],
          streak: h.streak || 0,
          completions: h.completions || {},
          createdAt: h.createdAt || new Date().toISOString(),
          isActive: h.isActive !== false,
        }));

        setHabits(normalized);
      } catch (error) {
        console.error("Error loading habits:", error);
        toast({
          title: "Error",
          description: "Could not load habits from server.",
          variant: "destructive",
        });
      }
    };

    load();
  }, [user, toast]);

  const createHabit = () => {
    if (!newHabit.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a habit name.",
        variant: "destructive"
      });
      return;
    }

    const create = async () => {
      if (!user) return;
      try {
        const res = await fetch("/api/habits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.uid,
          },
          body: JSON.stringify({
            name: newHabit.name,
            description: newHabit.description || null,
            category: newHabit.category,
            frequency: newHabit.frequency,
            targetCount: newHabit.targetCount,
            color: newHabit.color,
            icon: newHabit.icon,
          }),
        });
        if (!res.ok) throw new Error("Failed to create habit");
        const created: Habit = await res.json();
        setHabits((prev) => [...prev, created]);
      } catch (error) {
        console.error("Error creating habit:", error);
        toast({
          title: "Error",
          description: "Failed to create habit.",
          variant: "destructive",
        });
        return;
      }
    };

    void create();
    setNewHabit({
      name: '',
      description: '',
      category: 'Study',
      frequency: 'daily',
      targetCount: 1,
      color: HABIT_COLORS[0],
      icon: HABIT_ICONS[0]
    });
    setIsAddingHabit(false);

    toast({
      title: "Habit Created",
      description: "Your new habit has been added to your habits!"
    });
  };

  const toggleHabitCompletion = (habitId: string, date: string) => {
    const updatedHabits = habits.map(habit => {
      if (habit.id === habitId) {
        const completions = { ...habit.completions };
        const currentCount = completions[date] || 0;
        
        if (currentCount >= habit.targetCount) {
          completions[date] = 0;
        } else {
          completions[date] = currentCount + 1;
        }

        // Update streak
        let newStreak = habit.streak;
        if (completions[date] >= habit.targetCount) {
          if (isToday(parseISO(date))) {
            newStreak = habit.streak + 1;
          }
        }

        const updatedHabit: Habit = {
          ...habit,
          completions,
          streak: newStreak
        };

        // Persist to backend (fire and forget UI-wise)
        if (user) {
          fetch(`/api/habits/${habitId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": user.uid,
            },
            body: JSON.stringify({
              completions,
              streak: newStreak,
            }),
          }).catch((err) => {
            console.error("Failed to update habit:", err);
          });
        }

        return updatedHabit;
      }
      return habit;
    });
    setHabits(updatedHabits);
  };

  const deleteHabit = (habitId: string) => {
    const performDelete = async () => {
      const habitToRemove = habits.find(h => h.id === habitId);
      setHabits(habits.filter(habit => habit.id !== habitId));
      setHabitToDelete(null);

      if (user) {
        try {
          await fetch(`/api/habits/${habitId}`, {
            method: "DELETE",
            headers: {
              "x-user-id": user.uid,
            },
          });
        } catch (error) {
          console.error("Failed to delete habit:", error);
        }
      }

      toast({
        title: "Habit Deleted",
        description: `"${habitToRemove?.name}" has been removed from your habits.`
      });
    };

    void performDelete();
  };

  const getHabitProgress = (habit: Habit, date: string) => {
    const completed = habit.completions[date] || 0;
    return Math.min((completed / habit.targetCount) * 100, 100);
  };

  const isHabitCompleted = (habit: Habit, date: string) => {
    const completed = habit.completions[date] || 0;
    return completed >= habit.targetCount;
  };

  const getTodayStats = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const completed = habits.filter(habit => isHabitCompleted(habit, today)).length;
    const total = habits.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  const stats = getTodayStats();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Habit Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Build consistent habits and track your progress
          </p>
        </div>

        <Dialog open={isAddingHabit} onOpenChange={setIsAddingHabit}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Habit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="habit-name">Habit Name *</Label>
                <Input
                  id="habit-name"
                  placeholder="e.g., Read for 30 minutes"
                  value={newHabit.name}
                  onChange={(e) => setNewHabit(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="habit-description">Description</Label>
                <Input
                  id="habit-description"
                  placeholder="Optional description..."
                  value={newHabit.description}
                  onChange={(e) => setNewHabit(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="habit-category">Category</Label>
                  <Select 
                    value={newHabit.category} 
                    onValueChange={(value) => setNewHabit(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HABIT_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="habit-frequency">Frequency</Label>
                  <Select 
                    value={newHabit.frequency} 
                    onValueChange={(value: any) => setNewHabit(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="habit-target">Daily Target</Label>
                <Input
                  id="habit-target"
                  type="number"
                  min="1"
                  max="10"
                  value={newHabit.targetCount}
                  onChange={(e) => setNewHabit(prev => ({ ...prev, targetCount: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {HABIT_COLORS.map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newHabit.color === color ? 'border-gray-900 dark:border-white' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewHabit(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddingHabit(false)}>
                  Cancel
                </Button>
                <Button onClick={createHabit}>
                  Create Habit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Progress</p>
                <p className="text-2xl font-bold">{stats.completed}/{stats.total}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{stats.percentage}%</div>
                <Progress value={stats.percentage} className="w-20 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Habits</p>
                <p className="text-2xl font-bold">{habits.filter(h => h.isActive).length}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Best Streak</p>
                <p className="text-2xl font-bold">{Math.max(...habits.map(h => h.streak), 0)}</p>
              </div>
              <Flame className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Habits */}
      <div className="space-y-4">
        {habits.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Habits Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first habit to start building consistent routines.
              </p>
              <Button onClick={() => setIsAddingHabit(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Habit
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {habits.map(habit => {
              const today = format(new Date(), 'yyyy-MM-dd');
              const progress = getHabitProgress(habit, today);
              const completed = isHabitCompleted(habit, today);

              return (
                <Card key={habit.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: habit.color }}
                        />
                        <div>
                          <h3 className="font-medium">{habit.name}</h3>
                          {habit.description && (
                            <p className="text-sm text-muted-foreground">{habit.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {habit.category}
                            </Badge>
                            {habit.streak > 0 && (
                              <div className="flex items-center gap-1 text-xs text-orange-600">
                                <Flame className="h-3 w-3" />
                                {habit.streak} day streak
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {habit.completions[today] || 0} / {habit.targetCount}
                          </div>
                          <Progress value={progress} className="w-20 mt-1" />
                        </div>

                        <Button
                          variant={completed ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleHabitCompletion(habit.id, today)}
                          className="flex items-center gap-2"
                        >
                          {completed ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                          {completed ? 'Done' : 'Mark'}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setHabitToDelete(habit.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Habit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={habitToDelete !== null} onOpenChange={() => setHabitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this habit and all its progress data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setHabitToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => habitToDelete && deleteHabit(habitToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
