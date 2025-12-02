import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedCalendarData } from '@/lib/google-calendar-service';

interface PersistentDataState {
  isRestored: boolean;
  isRestoring: boolean;
  lastRestoreTime: Date | null;
}

/**
 * Hook for managing persistent user data.
 * Handles caching and restoration of user data from localStorage.
 * Note: Google Classroom sync has been removed - classes and assignments are managed manually.
 */
export const usePersistentData = () => {
  const { user, userData } = useAuth();
  const [state, setState] = useState<PersistentDataState>({
    isRestored: false,
    isRestoring: false,
    lastRestoreTime: null,
  });

  const restoreAllUserData = async () => {
    if (!user?.uid) return;

    setState(prev => ({ ...prev, isRestoring: true }));

    try {
      // Restore Google Calendar data if available
      if (userData?.hasGoogleCalendar) {
        await restoreGoogleCalendarData();
      }

      // Restore custom assignments from cache
      await restoreCustomAssignments();

      setState(prev => ({
        ...prev,
        isRestored: true,
        isRestoring: false,
        lastRestoreTime: new Date(),
      }));

      console.log(' User data restored successfully');
    } catch (error) {
      console.error('Error restoring user data:', error);
      setState(prev => ({ ...prev, isRestoring: false }));
    }
  };

  const restoreGoogleCalendarData = async () => {
    if (!user?.uid) return;

    try {
      const cachedData = getCachedCalendarData(user.uid);
      
      if (cachedData.calendars.length > 0 || cachedData.events.length > 0) {
        (window as any).cachedCalendarData = cachedData;
        console.log(' Google Calendar data restored from cache');
      }
    } catch (error) {
      console.warn('Failed to restore Google Calendar data:', error);
    }
  };

  const restoreCustomAssignments = async () => {
    if (!user?.uid) return;

    try {
      const storageKey = `custom_assignments_${user.uid}`;
      const customAssignments = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      if (customAssignments.length > 0) {
        (window as any).cachedCustomAssignments = customAssignments;
        console.log(` ${customAssignments.length} custom assignments restored from cache`);
      }
    } catch (error) {
      console.warn('Failed to restore custom assignments:', error);
    }
  };

  const clearAllCachedData = () => {
    if (!user?.uid) return;

    try {
      // Clear localStorage data
      localStorage.removeItem(`user_data_${user.uid}`);
      localStorage.removeItem(`classroom_data_${user.uid}`);
      localStorage.removeItem(`custom_assignments_${user.uid}`);
      localStorage.removeItem(`google_calendars_${user.uid}`);
      localStorage.removeItem(`google_events_${user.uid}`);
      localStorage.removeItem(`google_calendar_last_sync_${user.uid}`);

      // Clear global cache
      delete (window as any).cachedClassroomData;
      delete (window as any).cachedCalendarData;
      delete (window as any).cachedCustomAssignments;

      setState(prev => ({
        ...prev,
        isRestored: false,
        lastRestoreTime: null,
      }));

      console.log(' All cached data cleared');
    } catch (error) {
      console.warn('Failed to clear cached data:', error);
    }
  };

  // Auto-restore data when user changes
  useEffect(() => {
    if (user?.uid && !state.isRestored && !state.isRestoring) {
      restoreAllUserData();
    }
  }, [user?.uid]);

  return {
    ...state,
    restoreAllUserData,
    restoreGoogleCalendarData,
    restoreCustomAssignments,
    clearAllCachedData,
  };
};
