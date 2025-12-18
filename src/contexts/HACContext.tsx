/**
 * HAC (Home Access Center) Context
 * Manages HAC authentication state and credentials caching
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getApiUrl } from '@/lib/apiClient';

// Types
interface HACCredentials {
  username: string;
  password: string;
  districtBaseUrl?: string;
}

interface HACCourse {
  courseId: string;
  name: string;
  grade: string;
  numericGrade: number | null;
  gpa: number | null;
  assignments: HACAssignment[];
}

interface HACAssignment {
  dateDue: string;
  dateAssigned: string;
  name: string;
  category: string;
  score: string;
}

interface HACGradesData {
  grades: HACCourse[];
  overallAverage: number;
  highlightedCourse: HACCourse | null;
}

interface HACReportCard {
  cycles: {
    cycleName: string;
    courses: { course: string; courseCode: string; grade: number; gpa: number }[];
    averageGpa: number;
  }[];
  overallGpa: number;
}

interface HACContextType {
  // State
  isConnected: boolean;
  isLoading: boolean;
  sessionId: string | null;
  error: string | null;
  gradesData: HACGradesData | null;
  reportCard: HACReportCard | null;
  
  // Actions
  connect: (credentials: HACCredentials) => Promise<boolean>;
  disconnect: () => void;
  refreshGrades: () => Promise<void>;
  fetchReportCard: () => Promise<void>;
  
  // Cached credentials (for display only - password is masked)
  cachedUsername: string | null;
}

const HACContext = createContext<HACContextType | undefined>(undefined);

export const useHAC = () => {
  const context = useContext(HACContext);
  if (context === undefined) {
    throw new Error('useHAC must be used within a HACProvider');
  }
  return context;
};

// Storage keys
const getStorageKey = (userId: string, key: string) => `hac_${userId}_${key}`;

interface HACProviderProps {
  children: ReactNode;
}

export const HACProvider = ({ children }: HACProviderProps) => {
  const { user } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gradesData, setGradesData] = useState<HACGradesData | null>(null);
  const [reportCard, setReportCard] = useState<HACReportCard | null>(null);
  const [cachedUsername, setCachedUsername] = useState<string | null>(null);

  // Load cached credentials on mount
  useEffect(() => {
    if (!user?.uid) {
      // Clear state when user logs out
      setIsConnected(false);
      setSessionId(null);
      setCachedUsername(null);
      setGradesData(null);
      setReportCard(null);
      return;
    }

    // Check for cached credentials
    try {
      const cachedCreds = localStorage.getItem(getStorageKey(user.uid, 'credentials'));
      if (cachedCreds) {
        const parsed = JSON.parse(cachedCreds);
        setCachedUsername(parsed.username);
        
        // Auto-login with cached credentials
        autoLogin(parsed);
      }
    } catch (err) {
      console.warn('Failed to load cached HAC credentials:', err);
    }
  }, [user?.uid]);

  // Auto-login with cached credentials
  const autoLogin = async (credentials: HACCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(getApiUrl('/api/hac/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSessionId(data.sessionId);
        setIsConnected(true);
        setCachedUsername(credentials.username);
        
        // Fetch grades immediately after login
        await fetchGradesInternal(data.sessionId);
      } else {
        // Cached credentials are invalid, clear them
        if (user?.uid) {
          localStorage.removeItem(getStorageKey(user.uid, 'credentials'));
        }
        setIsConnected(false);
        setCachedUsername(null);
      }
    } catch (err) {
      console.warn('HAC auto-login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to HAC with credentials
  const connect = useCallback(async (credentials: HACCredentials): Promise<boolean> => {
    if (!user?.uid) {
      setError('You must be logged in to connect HAC');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(getApiUrl('/api/hac/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to connect to HAC');
        return false;
      }
      
      // Save session
      setSessionId(data.sessionId);
      setIsConnected(true);
      setCachedUsername(credentials.username);
      
      // Cache credentials in localStorage
      localStorage.setItem(
        getStorageKey(user.uid, 'credentials'),
        JSON.stringify(credentials)
      );
      
      // Fetch grades
      await fetchGradesInternal(data.sessionId);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Disconnect from HAC
  const disconnect = useCallback(() => {
    if (sessionId) {
      // Call logout endpoint (fire and forget)
      fetch(getApiUrl('/api/hac/logout'), {
        method: 'POST',
        headers: {
          'X-HAC-Session': sessionId,
        },
      }).catch(() => {});
    }
    
    // Clear local state
    setSessionId(null);
    setIsConnected(false);
    setGradesData(null);
    setReportCard(null);
    setError(null);
    
    // Clear cached credentials
    if (user?.uid) {
      localStorage.removeItem(getStorageKey(user.uid, 'credentials'));
    }
    setCachedUsername(null);
  }, [sessionId, user?.uid]);

  // Internal fetch grades function
  const fetchGradesInternal = async (sid: string) => {
    try {
      const response = await fetch(getApiUrl('/api/hac/grades'), {
        headers: {
          'X-HAC-Session': sid,
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) {
          // Session expired
          setIsConnected(false);
          setSessionId(null);
          setError('Session expired. Please reconnect.');
        }
        return;
      }
      
      const data = await response.json();
      setGradesData(data);
    } catch (err) {
      console.error('Failed to fetch grades:', err);
    }
  };

  // Refresh grades
  const refreshGrades = useCallback(async () => {
    if (!sessionId) {
      setError('Not connected to HAC');
      return;
    }
    
    setIsLoading(true);
    try {
      await fetchGradesInternal(sessionId);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Fetch report card
  const fetchReportCard = useCallback(async () => {
    if (!sessionId) {
      setError('Not connected to HAC');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/hac/report-card'), {
        headers: {
          'X-HAC-Session': sessionId,
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) {
          setIsConnected(false);
          setSessionId(null);
          setError('Session expired. Please reconnect.');
        }
        return;
      }
      
      const data = await response.json();
      setReportCard(data);
    } catch (err) {
      console.error('Failed to fetch report card:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const value: HACContextType = {
    isConnected,
    isLoading,
    sessionId,
    error,
    gradesData,
    reportCard,
    connect,
    disconnect,
    refreshGrades,
    fetchReportCard,
    cachedUsername,
  };

  return (
    <HACContext.Provider value={value}>
      {children}
    </HACContext.Provider>
  );
};
