import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'habits' | 'assignments' | 'study' | 'streaks' | 'social';
  xpReward: number;
  unlockedAt?: string;
  progress?: number;
  target?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserStats {
  totalXP: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  streak: number;
  totalStudyTime: number;
  completedAssignments: number;
  completedHabits: number;
  achievementsUnlocked: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalXP: number;
  level: number;
  achievements: number;
  rank: number;
}

const ACHIEVEMENTS: Achievement[] = [
  // Habit Achievements
  {
    id: 'first_habit',
    title: 'Habit Starter',
    description: 'Complete your first habit',
    icon: '',
    category: 'habits',
    xpReward: 50,
    target: 1,
    rarity: 'common'
  },
  {
    id: 'habit_streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day habit streak',
    icon: '',
    category: 'streaks',
    xpReward: 200,
    target: 7,
    rarity: 'rare'
  },
  {
    id: 'habit_streak_30',
    title: 'Monthly Master',
    description: 'Maintain a 30-day habit streak',
    icon: '',
    category: 'streaks',
    xpReward: 1000,
    target: 30,
    rarity: 'epic'
  },
  
  // Assignment Achievements
  {
    id: 'first_assignment',
    title: 'Task Tackler',
    description: 'Complete your first assignment',
    icon: '',
    category: 'assignments',
    xpReward: 100,
    target: 1,
    rarity: 'common'
  },
  {
    id: 'assignments_10',
    title: 'Assignment Ace',
    description: 'Complete 10 assignments',
    icon: '',
    category: 'assignments',
    xpReward: 500,
    target: 10,
    rarity: 'rare'
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Submit 5 assignments before their due date',
    icon: '',
    category: 'assignments',
    xpReward: 300,
    target: 5,
    rarity: 'rare'
  },
  
  // Study Achievements
  {
    id: 'study_1_hour',
    title: 'Study Session',
    description: 'Study for 1 hour straight',
    icon: '',
    category: 'study',
    xpReward: 150,
    target: 3600000, // 1 hour in milliseconds
    rarity: 'common'
  },
  {
    id: 'study_10_hours',
    title: 'Dedicated Scholar',
    description: 'Accumulate 10 hours of study time',
    icon: '',
    category: 'study',
    xpReward: 800,
    target: 36000000, // 10 hours
    rarity: 'epic'
  },
  
  // Special Achievements
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Complete all habits and assignments for 3 consecutive days',
    icon: 'star',
    category: 'streaks',
    xpReward: 1500,
    target: 3,
    rarity: 'legendary'
  }
];

export const useGamification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [userStats, setUserStats] = useState<UserStats>({
    totalXP: 0,
    level: 1,
    currentLevelXP: 0,
    nextLevelXP: 100,
    streak: 0,
    totalStudyTime: 0,
    completedAssignments: 0,
    completedHabits: 0,
    achievementsUnlocked: 0
  });

  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (user?.uid) {
      loadUserStats();
      loadAchievements();
    }
  }, [user?.uid]);

  const loadUserStats = () => {
    if (!user?.uid) return;
    
    const savedStats = localStorage.getItem(`user_stats_${user.uid}`);
    if (savedStats) {
      const stats = JSON.parse(savedStats);
      setUserStats(stats);
    }
  };

  const loadAchievements = () => {
    if (!user?.uid) return;
    
    const savedAchievements = localStorage.getItem(`achievements_${user.uid}`);
    if (savedAchievements) {
      setUnlockedAchievements(JSON.parse(savedAchievements));
    }
  };

  const saveUserStats = (stats: UserStats) => {
    if (!user?.uid) return;
    
    localStorage.setItem(`user_stats_${user.uid}`, JSON.stringify(stats));
    setUserStats(stats);
  };

  const calculateLevel = (totalXP: number): { level: number, currentLevelXP: number, nextLevelXP: number } => {
    let level = 1;
    let xpForCurrentLevel = 0;
    let xpForNextLevel = 100;
    
    while (totalXP >= xpForNextLevel) {
      xpForCurrentLevel = xpForNextLevel;
      level++;
      xpForNextLevel = Math.floor(xpForCurrentLevel * 1.5); // Exponential XP requirement
    }
    
    return {
      level,
      currentLevelXP: totalXP - xpForCurrentLevel,
      nextLevelXP: xpForNextLevel - xpForCurrentLevel
    };
  };

  const awardXP = (amount: number, reason?: string) => {
    const newTotalXP = userStats.totalXP + amount;
    const levelInfo = calculateLevel(newTotalXP);
    
    const newStats: UserStats = {
      ...userStats,
      totalXP: newTotalXP,
      ...levelInfo
    };
    
    saveUserStats(newStats);
    
    // Check for level up
    if (levelInfo.level > userStats.level) {
      toast({
        title: ` Level Up! Level ${levelInfo.level}`,
        description: `You've reached level ${levelInfo.level}! Keep up the great work!`,
      });
    }
    
    // Show XP gained notification
    if (reason) {
      toast({
        title: `+${amount} XP`,
        description: reason,
      });
    }
    
    checkAchievements(newStats);
  };

  const checkAchievements = (stats: UserStats) => {
    const currentUnlocked = new Set(unlockedAchievements.map(a => a.id));
    
    ACHIEVEMENTS.forEach(achievement => {
      if (currentUnlocked.has(achievement.id)) return;
      
      let shouldUnlock = false;
      
      switch (achievement.id) {
        case 'first_habit':
          shouldUnlock = stats.completedHabits >= 1;
          break;
        case 'habit_streak_7':
          shouldUnlock = stats.streak >= 7;
          break;
        case 'habit_streak_30':
          shouldUnlock = stats.streak >= 30;
          break;
        case 'first_assignment':
          shouldUnlock = stats.completedAssignments >= 1;
          break;
        case 'assignments_10':
          shouldUnlock = stats.completedAssignments >= 10;
          break;
        case 'study_1_hour':
          shouldUnlock = stats.totalStudyTime >= 3600000;
          break;
        case 'study_10_hours':
          shouldUnlock = stats.totalStudyTime >= 36000000;
          break;
      }
      
      if (shouldUnlock) {
        unlockAchievement(achievement);
      }
    });
  };

  const unlockAchievement = (achievement: Achievement) => {
    const unlockedAchievement = {
      ...achievement,
      unlockedAt: new Date().toISOString()
    };
    
    const updated = [...unlockedAchievements, unlockedAchievement];
    setUnlockedAchievements(updated);
    
    if (user?.uid) {
      localStorage.setItem(`achievements_${user.uid}`, JSON.stringify(updated));
    }
    
    // Award XP and show celebration
    awardXP(achievement.xpReward);
    
    toast({
      title: ` Achievement Unlocked!`,
      description: `${achievement.icon} ${achievement.title} - ${achievement.description}`,
    });
  };

  const incrementHabitCompletion = () => {
    const newStats = {
      ...userStats,
      completedHabits: userStats.completedHabits + 1
    };
    saveUserStats(newStats);
    awardXP(25, 'Habit completed!');
  };

  const incrementAssignmentCompletion = () => {
    const newStats = {
      ...userStats,
      completedAssignments: userStats.completedAssignments + 1
    };
    saveUserStats(newStats);
    awardXP(50, 'Assignment completed!');
  };

  const addStudyTime = (timeInMs: number) => {
    const newStats = {
      ...userStats,
      totalStudyTime: userStats.totalStudyTime + timeInMs
    };
    saveUserStats(newStats);
    
    // Award XP based on study time (1 XP per minute)
    const xpGained = Math.floor(timeInMs / 60000);
    if (xpGained > 0) {
      awardXP(xpGained, `${Math.floor(timeInMs / 60000)} minutes of study time!`);
    }
  };

  const updateStreak = (newStreak: number) => {
    const newStats = {
      ...userStats,
      streak: newStreak
    };
    saveUserStats(newStats);
    
    if (newStreak > userStats.streak) {
      awardXP(10 * newStreak, `${newStreak} day streak!`);
    }
  };

  const getAvailableAchievements = (): Achievement[] => {
    const unlockedIds = new Set(unlockedAchievements.map(a => a.id));
    return ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id));
  };

  const getAchievementProgress = (achievement: Achievement): number => {
    switch (achievement.id) {
      case 'first_habit':
        return Math.min(userStats.completedHabits, 1);
      case 'habit_streak_7':
        return Math.min(userStats.streak, 7);
      case 'habit_streak_30':
        return Math.min(userStats.streak, 30);
      case 'first_assignment':
        return Math.min(userStats.completedAssignments, 1);
      case 'assignments_10':
        return Math.min(userStats.completedAssignments, 10);
      case 'study_1_hour':
        return Math.min(userStats.totalStudyTime, 3600000);
      case 'study_10_hours':
        return Math.min(userStats.totalStudyTime, 36000000);
      default:
        return 0;
    }
  };

  return {
    userStats,
    unlockedAchievements,
    availableAchievements: getAvailableAchievements(),
    leaderboard,
    awardXP,
    incrementHabitCompletion,
    incrementAssignmentCompletion,
    addStudyTime,
    updateStreak,
    getAchievementProgress,
    calculateLevel
  };
};
