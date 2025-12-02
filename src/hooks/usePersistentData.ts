import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { syncGoogleClassroomData } from '@/lib/google-classroom';
import { getCachedCalendarData } from '@/lib/google-calendar-service';

interface PersistentDataState {
  isRestored: boolean;
  isRestoring: boolean;
  lastRestoreTime: Date | null;
}

export const usePersistentData = () => {
  const { user, userData } = useAuth();
  const [state, setState] = useState<PersistentDataState>({
    isRestored: false,
    isRestoring: false,
    lastRestoreTime: null,
  });

  const restoreAllUserData = async () => {
    if (!user?.uid || !userData) return;

    setState(prev => ({ ...prev, isRestoring: true }));

    try {
      // Restore Google Classroom data if user has access
      if (userData.hasGoogleAccess && userData.googleAccessToken) {
        await restoreGoogleClassroomData();
      }

      // Restore Google Calendar data if available
      if (userData.hasGoogleCalendar) {
        await restoreGoogleCalendarData();
      }

      // Restore custom assignments
      await restoreCustomAssignments();

      setState(prev => ({
        ...prev,
        isRestored: true,
        isRestoring: false,
        lastRestoreTime: new Date(),
      }));

      console.log(' All user data restored successfully');
    } catch (error) {
      console.error('Error restoring user data:', error);
      setState(prev => ({ ...prev, isRestoring: false }));
    }
  };

  const restoreGoogleClassroomData = async () => {
    if (!user?.uid || !userData?.googleAccessToken) return;

    try {
      // Check if we have cached data
      const cachedData = localStorage.getItem(`classroom_data_${user.uid}`);
      
      if (cachedData) {
        const data = JSON.parse(cachedData);
        const cacheAge = Date.now() - new Date(data.cachedAt).getTime();
        
        // Use cached data if it's less than 6 hours old
        if (cacheAge < 6 * 60 * 60 * 1000) {
          (window as any).cachedClassroomData = {
            courses: data.courses,
            assignments: data.assignments,
            lastSynced: new Date(data.cachedAt)
          };
          console.log(' Google Classroom data restored from cache');
          return;
        }
      }

      // Fetch fresh data if cache is stale or doesn't exist
      console.log(' Fetching fresh Google Classroom data...');
      const freshData = await syncGoogleClassroomData(userData.googleAccessToken);
      
      const dataToCache = {
        courses: freshData.courses,
        assignments: freshData.assignments,
        cachedAt: new Date().toISOString()
      };
      
      localStorage.setItem(`classroom_data_${user.uid}`, JSON.stringify(dataToCache));
      
      (window as any).cachedClassroomData = {
        courses: freshData.courses,
        assignments: freshData.assignments,
        lastSynced: new Date()
      };
      
      console.log(' Fresh Google Classroom data fetched and cached');
    } catch (error) {
      console.warn('Failed to restore Google Classroom data:', error);
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
    if (user?.uid && userData && !state.isRestored && !state.isRestoring) {
      restoreAllUserData();
    }
  }, [user?.uid, userData]);

  return {
    ...state,
    restoreAllUserData,
    restoreGoogleClassroomData,
    restoreGoogleCalendarData,
    restoreCustomAssignments,
    clearAllCachedData,
  };
};
