import React, { createContext, useContext, useState, ReactNode } from "react";
import { LucideIcon, CheckCircle2, Bot, Calendar, StickyNote, Clock, User } from "lucide-react";

export interface Activity {
  id: string;
  label: string;
  time: string;
  timestamp: Date;
  icon: LucideIcon;
  tone: string;
  type: "calendar" | "ai" | "flashcard" | "pomodoro" | "assignment" | "general";
  relatedId?: string; // ID of related entity (event, assignment, etc.)
  route?: string; // Route to navigate to when clicked
}

interface ActivityContextType {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, "id" | "time" | "timestamp">) => void;
  getRecentActivities: (limit?: number) => Activity[];
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
};

export const ActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>([]);

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const addActivity = (activity: Omit<Activity, "id" | "time" | "timestamp">) => {
    const timestamp = new Date();
    const newActivity: Activity = {
      ...activity,
      id: Date.now().toString(),
      time: formatTimeAgo(timestamp),
      timestamp,
    };

    setActivities(prev => {
      // Add new activity and keep only the latest 50 activities
      const updated = [newActivity, ...prev].slice(0, 50);
      
      // Update time strings for all activities
      return updated.map(act => ({
        ...act,
        time: formatTimeAgo(act.timestamp)
      }));
    });
  };

  const getRecentActivities = (limit: number = 2): Activity[] => {
    // Update time strings before returning
    const updatedActivities = activities.map(activity => ({
      ...activity,
      time: formatTimeAgo(activity.timestamp)
    }));
    
    return updatedActivities.slice(0, limit);
  };

  return (
    <ActivityContext.Provider 
      value={{
        activities,
        addActivity,
        getRecentActivities,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
};
