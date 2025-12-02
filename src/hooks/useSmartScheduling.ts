import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserPreferences {
  workingHours: {
    start: string;
    end: string;
  };
  preferredDays: string[];
  sessionDuration: number; // in minutes
  breakDuration: number; // in minutes
  energyLevels: {
    morning: 'low' | 'medium' | 'high';
    afternoon: 'low' | 'medium' | 'high';
    evening: 'low' | 'medium' | 'high';
  };
  subjectPreferences: Record<string, {
    difficulty: 'easy' | 'medium' | 'hard';
    timeRequired: number; // in minutes
    preferredTimeOfDay: 'morning' | 'afternoon' | 'evening';
  }>;
}

interface StudySession {
  id: string;
  title: string;
  subject: string;
  startTime: Date;
  endTime: Date;
  type: 'study' | 'review' | 'assignment' | 'break';
  priority: 'low' | 'medium' | 'high';
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  assignmentId?: string;
  habitId?: string;
}

interface ScheduleOptimization {
  sessions: StudySession[];
  totalStudyTime: number;
  breakTime: number;
  efficiency: number;
  suggestions: string[];
}

export const useSmartScheduling = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    workingHours: { start: '09:00', end: '17:00' },
    preferredDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    sessionDuration: 45,
    breakDuration: 15,
    energyLevels: {
      morning: 'high',
      afternoon: 'medium',
      evening: 'low'
    },
    subjectPreferences: {}
  });

  const loadPreferences = () => {
    if (!user?.uid) return;
    
    const saved = localStorage.getItem(`schedule_preferences_${user.uid}`);
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  };

  const savePreferences = (newPreferences: UserPreferences) => {
    if (!user?.uid) return;
    
    setPreferences(newPreferences);
    localStorage.setItem(`schedule_preferences_${user.uid}`, JSON.stringify(newPreferences));
    
    toast({
      title: "Preferences Saved",
      description: "Your scheduling preferences have been updated.",
    });
  };

  const analyzeUserPatterns = () => {
    if (!user?.uid) return null;
    
    // Analyze historical data to understand user patterns
    const habits = JSON.parse(localStorage.getItem(`habits_${user.uid}`) || '[]');
    const assignments = JSON.parse(localStorage.getItem(`custom_assignments_${user.uid}`) || '[]');
    const analytics = JSON.parse(localStorage.getItem(`analytics_${user.uid}`) || '{}');
    
    // Calculate optimal study times based on completion patterns
    const completionTimes = habits
      .filter((h: any) => h.completions && h.completions.length > 0)
      .flatMap((h: any) => h.completions.map((c: any) => new Date(c.date).getHours()));
    
    const mostProductiveHour = completionTimes.length > 0 
      ? completionTimes.reduce((a: number, b: number, i: number, arr: number[]) => 
          arr.filter((v: number) => v === a).length >= arr.filter((v: number) => v === b).length ? a : b
        )
      : 10; // Default to 10 AM
    
    return {
      mostProductiveHour,
      averageSessionLength: analytics.averageSessionLength || 45,
      preferredBreakLength: analytics.preferredBreakLength || 15,
      completionRate: analytics.completionRate || 0.7
    };
  };

  const generateOptimalSchedule = async (
    date: Date,
    assignments: any[],
    habits: any[]
  ): Promise<ScheduleOptimization> => {
    const patterns = analyzeUserPatterns();
    const sessions: StudySession[] = [];
    const suggestions: string[] = [];
    
    // Start with user's preferred working hours
    const startTime = new Date(date);
    const [startHour, startMin] = preferences.workingHours.start.split(':').map(Number);
    startTime.setHours(startHour, startMin, 0, 0);
    
    const endTime = new Date(date);
    const [endHour, endMin] = preferences.workingHours.end.split(':').map(Number);
    endTime.setHours(endHour, endMin, 0, 0);
    
    let currentTime = new Date(startTime);
    
    // Sort tasks by priority and due date
    const sortedAssignments = assignments
      .filter(a => a.status !== 'completed' && a.status !== 'TURNED_IN')
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 1) - 
                 (priorityOrder[a.priority as keyof typeof priorityOrder] || 1);
        }
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      });

    // Schedule high-priority assignments during peak energy times
    const peakHours = patterns?.mostProductiveHour 
      ? [patterns.mostProductiveHour, patterns.mostProductiveHour + 1]
      : [10, 11];

    // Schedule assignments
    for (const assignment of sortedAssignments.slice(0, 4)) { // Limit to 4 assignments per day
      if (currentTime >= endTime) break;
      
      const sessionEnd = new Date(currentTime);
      sessionEnd.setMinutes(currentTime.getMinutes() + preferences.sessionDuration);
      
      if (sessionEnd <= endTime) {
        sessions.push({
          id: `session_${assignment.id}_${Date.now()}`,
          title: assignment.title,
          subject: assignment.classId || 'General',
          startTime: new Date(currentTime),
          endTime: sessionEnd,
          type: 'assignment',
          priority: assignment.priority || 'medium',
          estimatedDifficulty: 'medium',
          assignmentId: assignment.id
        });
        
        currentTime = new Date(sessionEnd);
        
        // Add break
        const breakEnd = new Date(currentTime);
        breakEnd.setMinutes(currentTime.getMinutes() + preferences.breakDuration);
        
        if (breakEnd <= endTime) {
          sessions.push({
            id: `break_${Date.now()}_${Math.random()}`,
            title: 'Break Time',
            subject: 'Break',
            startTime: new Date(currentTime),
            endTime: breakEnd,
            type: 'break',
            priority: 'low',
            estimatedDifficulty: 'easy'
          });
          
          currentTime = new Date(breakEnd);
        }
      }
    }

    // Schedule habit sessions
    const incompleteHabits = habits.filter((h: any) => {
      const today = new Date().toDateString();
      return !h.completions?.some((c: any) => new Date(c.date).toDateString() === today);
    });

    for (const habit of incompleteHabits.slice(0, 3)) { // Limit to 3 habits per day
      if (currentTime >= endTime) break;
      
      const sessionEnd = new Date(currentTime);
      sessionEnd.setMinutes(currentTime.getMinutes() + 30); // 30-minute habit sessions
      
      if (sessionEnd <= endTime) {
        sessions.push({
          id: `habit_${habit.id}_${Date.now()}`,
          title: `Work on: ${habit.title}`,
          subject: 'Habits',
          startTime: new Date(currentTime),
          endTime: sessionEnd,
          type: 'study',
          priority: 'medium',
          estimatedDifficulty: 'medium',
          habitId: habit.id
        });
        
        currentTime = new Date(sessionEnd);
      }
    }

    // Generate AI suggestions
    if (sessions.length === 0) {
      suggestions.push("Consider adding some assignments or habits to create a study schedule.");
    } else {
      suggestions.push(`Scheduled ${sessions.filter(s => s.type !== 'break').length} productive sessions.`);
      
      if (peakHours.some(hour => 
        sessions.some(s => s.startTime.getHours() === hour && s.priority === 'high')
      )) {
        suggestions.push(" High-priority tasks are scheduled during your peak energy hours!");
      }
      
      const totalStudyTime = sessions
        .filter(s => s.type !== 'break')
        .reduce((total, s) => total + (s.endTime.getTime() - s.startTime.getTime()), 0);
      
      const totalBreakTime = sessions
        .filter(s => s.type === 'break')
        .reduce((total, s) => total + (s.endTime.getTime() - s.startTime.getTime()), 0);
      
      if (totalBreakTime < totalStudyTime * 0.2) {
        suggestions.push(" Consider adding more breaks for better focus and retention.");
      }
    }

    const totalStudyTime = sessions
      .filter(s => s.type !== 'break')
      .reduce((total, s) => total + (s.endTime.getTime() - s.startTime.getTime()), 0);
    
    const totalBreakTime = sessions
      .filter(s => s.type === 'break')
      .reduce((total, s) => total + (s.endTime.getTime() - s.startTime.getTime()), 0);

    return {
      sessions,
      totalStudyTime: totalStudyTime / (1000 * 60), // Convert to minutes
      breakTime: totalBreakTime / (1000 * 60),
      efficiency: Math.min(totalStudyTime / (totalStudyTime + totalBreakTime) || 0, 1),
      suggestions
    };
  };

  const saveScheduleToCalendar = async (schedule: ScheduleOptimization) => {
    if (!user?.uid) return;
    
    const calendarEvents = schedule.sessions.map(session => ({
      id: session.id,
      title: session.title,
      start: session.startTime.toISOString(),
      end: session.endTime.toISOString(),
      type: session.type,
      description: session.type === 'break' ? 'Take a break and recharge' : 
                  `${session.subject} - Estimated difficulty: ${session.estimatedDifficulty}`,
      priority: session.priority,
      isAIGenerated: true
    }));
    
    const existingEvents = JSON.parse(localStorage.getItem(`calendar_events_${user.uid}`) || '[]');
    const updatedEvents = [...existingEvents, ...calendarEvents];
    
    localStorage.setItem(`calendar_events_${user.uid}`, JSON.stringify(updatedEvents));
    
    toast({
      title: "Schedule Created",
      description: `Added ${calendarEvents.length} sessions to your calendar.`,
    });
  };

  return {
    preferences,
    loadPreferences,
    savePreferences,
    generateOptimalSchedule,
    saveScheduleToCalendar,
    analyzeUserPatterns
  };
};
