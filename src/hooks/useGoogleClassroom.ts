import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/supabase-storage';

interface ClassroomData {
  courses: any[];
  assignments: any[];
  isLoading: boolean;
  error: string | null;
  lastSynced: Date | null;
}

/**
 * Hook for managing classes and assignments.
 * Fetches data from the database only - no Google Classroom sync.
 * Users can create classes and assignments manually.
 */
export const useGoogleClassroom = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<ClassroomData>({
    courses: [],
    assignments: [],
    isLoading: false,
    error: null,
    lastSynced: null,
  });

  const syncClassroomData = useCallback(async (showToast = true) => {
    if (!user?.uid) {
      console.warn('No user ID available for syncing data');
      return { courses: [], assignments: [] };
    }

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let databaseClasses: any[] = [];
      let databaseAssignments: any[] = [];

      // Fetch classes from database using storage
      try {
        databaseClasses = await storage.getClassesForUser(user.uid);
        console.log('Fetched database classes:', databaseClasses.length);
      } catch (dbError) {
        console.warn('Failed to fetch classes:', dbError);
      }

      // Fetch assignments from database using storage
      try {
        databaseAssignments = await storage.getAssignmentsForUser(user.uid);
        console.log('Fetched database assignments:', databaseAssignments.length);
      } catch (dbError) {
        console.warn('Failed to fetch assignments:', dbError);
      }

      console.log('Data fetch results:', {
        classes: databaseClasses.length,
        assignments: databaseAssignments.length,
      });
      
      setData(prev => ({
        ...prev,
        courses: databaseClasses,
        assignments: databaseAssignments,
        isLoading: false,
        lastSynced: new Date(),
      }));

      // Save to localStorage for cache/fallback
      try {
        const dataToCache = {
          courses: databaseClasses,
          assignments: databaseAssignments,
          cachedAt: new Date().toISOString()
        };
        localStorage.setItem(`classroom_data_${user.uid}`, JSON.stringify(dataToCache));
      } catch (error) {
        console.warn('Failed to save data to localStorage:', error);
      }

      if (showToast) {
        toast({
          title: "Data Refreshed",
          description: `Loaded ${databaseClasses.length} classes and ${databaseAssignments.length} assignments.`,
        });
      }

      return { courses: databaseClasses, assignments: databaseAssignments };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch data';
      setData(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      
      if (showToast) {
        toast({
          title: "Fetch Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }

      throw error;
    }
  }, [user?.uid, toast]);

  const clearData = () => {
    setData({
      courses: [],
      assignments: [],
      isLoading: false,
      error: null,
      lastSynced: null,
    });
  };

  // Fetch data on component mount
  useEffect(() => {
    if (!user?.uid) return;

    // Try to load from cached data first
    try {
      const cached = localStorage.getItem(`classroom_data_${user.uid}`);
      if (cached) {
        const cachedData = JSON.parse(cached);
        setData(prev => ({
          ...prev,
          courses: cachedData.courses || [],
          assignments: cachedData.assignments || [],
          lastSynced: cachedData.cachedAt ? new Date(cachedData.cachedAt) : null,
        }));
        console.log('📚 Loaded data from cache');
      }
    } catch (error) {
      console.warn('Failed to load cached data:', error);
    }

    // Fetch fresh data from database
    syncClassroomData(false);
  }, [user?.uid, syncClassroomData]);

  return {
    ...data,
    syncClassroomData,
    clearData,
    hasValidToken: true, // Always true since we don't need Google tokens
    isAuthenticated: !!user?.uid, // Authenticated if user is logged in
  };
};
