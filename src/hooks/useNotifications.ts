import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseStorage } from '@/lib/supabase-storage';

interface NotificationSettings {
  enabled: boolean;
  deadlines: boolean;
  pomodoroBreaks: boolean;
  habitReminders: boolean;
  studySessions: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  weekendsEnabled: boolean;
}

interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  type: 'deadline' | 'habit' | 'pomodoro' | 'study';
  data?: any;
}

export const useNotifications = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    deadlines: true,
    pomodoroBreaks: true,
    habitReminders: true,
    studySessions: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    weekendsEnabled: false
  });

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  // Load settings from Supabase
  useEffect(() => {
    const loadSettings = async () => {
      if (user?.uid) {
        try {
          const savedSettings = await supabaseStorage.getNotificationSettings(user.uid);
          if (savedSettings && Object.keys(savedSettings).length > 0) {
            setSettings(prev => ({ ...prev, ...savedSettings }));
          }
        } catch (error) {
          console.error('Error loading notification settings:', error);
        }
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, [user?.uid]);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive Alteon notifications.",
        });
        return true;
      } else {
        toast({
          title: "Notifications Blocked",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    // Save to Supabase if user is logged in
    if (user?.uid) {
      try {
        await supabaseStorage.saveNotificationSettings(user.uid, updated);
      } catch (error) {
        console.error('Error saving notification settings:', error);
      }
    }
    
    toast({
      title: "Settings Updated",
      description: "Notification preferences have been saved.",
    });
  };

  const isQuietTime = (): boolean => {
    if (!settings.enabled) return true;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [quietStartHour, quietStartMin] = settings.quietHoursStart.split(':').map(Number);
    const [quietEndHour, quietEndMin] = settings.quietHoursEnd.split(':').map(Number);
    
    const quietStart = quietStartHour * 60 + quietStartMin;
    const quietEnd = quietEndHour * 60 + quietEndMin;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime <= quietEnd;
    } else {
      return currentTime >= quietStart && currentTime <= quietEnd;
    }
  };

  const isWeekendAndDisabled = (): boolean => {
    if (settings.weekendsEnabled) return false;
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  };

  const shouldShowNotification = (type: keyof NotificationSettings): boolean => {
    if (!settings.enabled || permission !== 'granted') return false;
    if (isQuietTime() || isWeekendAndDisabled()) return false;
    return settings[type] as boolean;
  };

  const scheduleNotification = async (notification: Omit<ScheduledNotification, 'id'>): Promise<string> => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const scheduledNotification: ScheduledNotification = { ...notification, id };
    
    // Store scheduled notification
    const stored = JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
    stored.push(scheduledNotification);
    localStorage.setItem('scheduled_notifications', JSON.stringify(stored));
    
    // Calculate delay
    const delay = scheduledNotification.scheduledTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(() => {
        showNotification(scheduledNotification);
      }, delay);
    }
    
    return id;
  };

  const showNotification = async (notification: ScheduledNotification) => {
    if (!shouldShowNotification(notification.type as any)) return;

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      // Use service worker for rich notifications
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: notification.data
      });

      // Add vibration for mobile devices
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } else {
      // Fallback to basic notification
      new Notification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico'
      });
    }
  };

  const showImmediateNotification = async (title: string, body: string, type: 'deadline' | 'habit' | 'pomodoro' | 'study' = 'study') => {
    if (!shouldShowNotification(type as any)) return;

    await showNotification({
      id: `immediate_${Date.now()}`,
      title,
      body,
      scheduledTime: new Date(),
      type
    });
  };

  const cancelNotification = (id: string) => {
    const stored = JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
    const updated = stored.filter((notif: ScheduledNotification) => notif.id !== id);
    localStorage.setItem('scheduled_notifications', JSON.stringify(updated));
  };

  const cancelAllNotifications = () => {
    localStorage.removeItem('scheduled_notifications');
    toast({
      title: "Notifications Cleared",
      description: "All scheduled notifications have been cancelled.",
    });
  };

  // Schedule deadline notifications for assignments
  const scheduleDeadlineNotification = async (assignment: any) => {
    if (!assignment.dueDate || !shouldShowNotification('deadlines')) return;

    const dueDate = new Date(assignment.dueDate);
    const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
    const twoHoursBefore = new Date(dueDate.getTime() - 2 * 60 * 60 * 1000);

    // Schedule 1 day before notification
    if (oneDayBefore > new Date()) {
      await scheduleNotification({
        title: 'Assignment Due Tomorrow',
        body: `"${assignment.title}" is due tomorrow`,
        scheduledTime: oneDayBefore,
        type: 'deadline',
        data: { assignmentId: assignment.id }
      });
    }

    // Schedule 2 hours before notification
    if (twoHoursBefore > new Date()) {
      await scheduleNotification({
        title: 'Assignment Due Soon',
        body: `"${assignment.title}" is due in 2 hours`,
        scheduledTime: twoHoursBefore,
        type: 'deadline',
        data: { assignmentId: assignment.id }
      });
    }
  };

  // Schedule habit reminder notifications
  const scheduleHabitReminder = async (habit: any, reminderTime: string) => {
    if (!shouldShowNotification('habitReminders')) return;

    const [hours, minutes] = reminderTime.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    await scheduleNotification({
      title: 'Habit Reminder',
      body: `Time to work on "${habit.title}"`,
      scheduledTime,
      type: 'habit',
      data: { habitId: habit.id }
    });
  };

  // Schedule Pomodoro break notifications
  const schedulePomodoroNotification = async (type: 'break' | 'session', duration: number) => {
    if (!shouldShowNotification('pomodoroBreaks')) return;

    const scheduledTime = new Date(Date.now() + duration * 60 * 1000);
    const isBreak = type === 'break';

    await scheduleNotification({
      title: isBreak ? 'Break Time!' : 'Back to Work!',
      body: isBreak ? 'Take a well-deserved break' : 'Ready to focus again?',
      scheduledTime,
      type: 'pomodoro'
    });
  };

  return {
    permission,
    isSupported,
    settings,
    requestPermission,
    updateSettings,
    scheduleNotification,
    showImmediateNotification,
    cancelNotification,
    cancelAllNotifications,
    scheduleDeadlineNotification,
    scheduleHabitReminder,
    schedulePomodoroNotification,
    shouldShowNotification
  };
};
