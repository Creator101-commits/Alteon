import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleClassroomAPI, syncGoogleClassroomData } from '@/lib/google-classroom';
import { useToast } from '@/hooks/use-toast';

interface ClassroomData {
  courses: any[];
  assignments: any[];
  isLoading: boolean;
  error: string | null;
  lastSynced: Date | null;
}

export const useGoogleClassroom = () => {
  const { userData, user, restoreUserData } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<ClassroomData>({
    courses: [],
    assignments: [],
    isLoading: false,
    error: null,
    lastSynced: null,
  });

  const syncClassroomData = async (showToast = true) => {
    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let googleData: { courses: any[], assignments: any[] } = { courses: [], assignments: [] };
      let databaseClasses: any[] = [];
      let databaseAssignments: any[] = [];
      
      // Fetch Google Classroom data if authenticated
      if (userData?.googleAccessToken) {
        try {
          googleData = await syncGoogleClassroomData(userData.googleAccessToken, user?.uid);
        } catch (googleError) {
          console.warn('Failed to sync Google Classroom data:', googleError);
          // Continue to fetch local data even if Google sync fails
        }
      }

      // Fetch classes and assignments from database
      if (user?.uid) {
        try {
          // Fetch classes
          const classesResponse = await fetch(`/api/classes`, {
            headers: {
              'x-user-id': user.uid,
            },
          });
          if (classesResponse.ok) {
            databaseClasses = await classesResponse.json();
            console.log('Fetched database classes:', databaseClasses.length);
          } else {
            console.warn('Failed to fetch database classes:', classesResponse.status);
          }

          // Fetch assignments from database
          const assignmentsResponse = await fetch(`/api/users/${user.uid}/assignments`, {
            headers: {
              'x-user-id': user.uid,
            },
          });
          if (assignmentsResponse.ok) {
            databaseAssignments = await assignmentsResponse.json();
            console.log('Fetched database assignments:', databaseAssignments.length);
          } else {
            console.warn('Failed to fetch database assignments:', assignmentsResponse.status);
          }
        } catch (dbError) {
          console.warn('Failed to fetch database data:', dbError);
        }
      }

      // Use ONLY database classes - they have the correct database IDs
      // Google Classroom data is already synced to database via the sync endpoint
      // Using Google courses directly would cause ID mismatches with assignment.classId
      const allCourses = databaseClasses;

      // Merge assignments - database is source of truth
      // Google Classroom assignments are already in database from sync endpoint
      const allAssignments = databaseAssignments;
      
      console.log('Classroom sync results:', {
        googleCoursesFetched: googleData.courses.length,
        databaseClasses: databaseClasses.length,
        googleAssignmentsFetched: googleData.assignments.length,
        databaseAssignments: databaseAssignments.length,
        totalCourses: allCourses.length,
        totalAssignments: allAssignments.length,
        sampleCourse: allCourses[0], // Log first course for debugging
        sampleAssignment: allAssignments[0] // Log first assignment for debugging
      });
      
      setData(prev => ({
        ...prev,
        courses: allCourses,
        assignments: allAssignments,
        isLoading: false,
        lastSynced: new Date(),
      }));

      // Save to localStorage for cache/fallback only
      if (user?.uid) {
        try {
          const dataToCache = {
            courses: allCourses,
            assignments: allAssignments,
            cachedAt: new Date().toISOString()
          };
          localStorage.setItem(`classroom_data_${user.uid}`, JSON.stringify(dataToCache));
          
          // Also update global cache for immediate access
          (window as any).cachedClassroomData = {
            courses: allCourses,
            assignments: allAssignments,
            lastSynced: new Date()
          };
        } catch (error) {
          console.warn('Failed to save classroom data to localStorage:', error);
        }
      }

      // Update last sync time in localStorage (for 4-hour interval tracking)
      if (user?.uid) {
        localStorage.setItem(`last_sync_${user.uid}`, Date.now().toString());
      }

      if (showToast) {
        toast({
          title: "Sync Successful",
          description: `Synced ${allCourses.length} classes and ${allAssignments.length} assignments. Next auto-sync in 4 hours.`,
        });
      }

      return { courses: allCourses, assignments: allAssignments };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sync data';
      setData(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      
      if (showToast) {
        toast({
          title: "Sync Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }

      throw error;
    }
  };

  const clearData = () => {
    setData({
      courses: [],
      assignments: [],
      isLoading: false,
      error: null,
      lastSynced: null,
    });
  };

  // Auto-sync on component mount and every 4 hours
  useEffect(() => {
    if (!user?.uid) return;

    const FOUR_HOURS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

    const checkAndSync = async () => {
      // Check last sync time from localStorage
      const lastSyncKey = `last_sync_${user.uid}`;
      const lastSyncTime = localStorage.getItem(lastSyncKey);
      const now = Date.now();

      // First try to load from cached data if available
      const cachedData = (window as any).cachedClassroomData;
      if (cachedData && data.courses.length === 0) {
        console.log('📚 Loading Google Classroom data from cache');
        setData(prev => ({
          ...prev,
          courses: cachedData.courses || [],
          assignments: cachedData.assignments || [],
          lastSynced: cachedData.lastSynced || null,
        }));
      }

      // Sync if: no last sync time OR more than 4 hours have passed
      if (!lastSyncTime || (now - parseInt(lastSyncTime)) > FOUR_HOURS) {
        console.log('🔄 Auto-syncing classroom data (4-hour interval)');
        try {
          await syncClassroomData(false); // Silent sync
          localStorage.setItem(lastSyncKey, now.toString());
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      } else {
        const timeUntilNextSync = FOUR_HOURS - (now - parseInt(lastSyncTime));
        console.log(`⏰ Next auto-sync in ${Math.round(timeUntilNextSync / 1000 / 60)} minutes`);
      }
    };

    // Run initial check
    checkAndSync();

    // Set up interval to check every 4 hours
    const interval = setInterval(checkAndSync, FOUR_HOURS);

    return () => clearInterval(interval);
  }, [user?.uid]); // Only re-run when user changes

  // Listen for auth restoration and update data accordingly
  useEffect(() => {
    const handleAuthRestore = () => {
      const cachedData = (window as any).cachedClassroomData;
      if (cachedData && user?.uid) {
        console.log(' Auth restored, updating Google Classroom data');
        setData(prev => ({
          ...prev,
          courses: cachedData.courses || [],
          assignments: cachedData.assignments || [],
          lastSynced: cachedData.lastSynced || null,
        }));
      }
    };

    // Check if data is available after auth restoration
    const interval = setInterval(() => {
      const cachedData = (window as any).cachedClassroomData;
      if (cachedData && data.courses.length === 0 && user?.uid) {
        handleAuthRestore();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.uid, data.courses.length]);

  return {
    ...data,
    syncClassroomData,
    clearData,
    hasValidToken: !!userData?.googleAccessToken,
    isAuthenticated: !!userData?.googleAccessToken,
  };
};
