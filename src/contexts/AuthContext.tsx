import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, handleAuthRedirect, getUserData, signInWithGoogle, signUpWithEmail, signInWithEmail } from "@/lib/firebase";
import { getApiUrl } from "@/lib/apiClient";

interface AuthContextType {
  user: User | null;
  userData: any;
  loading: boolean;
  signIn: (enableSync?: boolean) => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasGoogleAccess: boolean;
  hasGoogleCalendar: boolean;
  restoreUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Sync user to Oracle database
const syncUserToDatabase = async (user: User, userData: any) => {
  try {
    console.log(' Syncing user to Oracle database...', user.uid);
    const response = await fetch(getApiUrl('/api/auth/sync'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.uid,
      },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        accessToken: userData?.googleAccessToken || null,
      }),
    });
    
    if (!response.ok) {
      console.warn('Failed to sync user to database:', await response.text());
    } else {
      console.log(' User synced to database successfully');
    }
  } catch (error) {
    console.warn('Error syncing user to database:', error);
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Helper functions for localStorage persistence
  const saveUserDataToStorage = (userId: string, data: any) => {
    try {
      localStorage.setItem(`user_data_${userId}`, JSON.stringify({
        ...data,
        cachedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to save user data to localStorage:', error);
    }
  };

  const getUserDataFromStorage = (userId: string) => {
    try {
      const stored = localStorage.getItem(`user_data_${userId}`);
      if (stored) {
        const data = JSON.parse(stored);
        // Check if cache is still valid (24 hours)
        const cacheAge = Date.now() - new Date(data.cachedAt).getTime();
        if (cacheAge < 24 * 60 * 60 * 1000) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to get user data from localStorage:', error);
    }
    return null;
  };



  const clearUserStorage = (userId: string) => {
    try {
      localStorage.removeItem(`user_data_${userId}`);
      localStorage.removeItem(`classroom_data_${userId}`);
      localStorage.removeItem(`custom_assignments_${userId}`);
      localStorage.removeItem(`google_calendars_${userId}`);
      localStorage.removeItem(`google_events_${userId}`);
      localStorage.removeItem(`google_calendar_last_sync_${userId}`);
    } catch (error) {
      console.warn('Failed to clear user storage:', error);
    }
  };

  const restoreUserData = async () => {
    if (!user?.uid) return;

    try {
      // First try to get cached user data
      let data = getUserDataFromStorage(user.uid);
      
      if (!data) {
        // If no cache, fetch from Firestore
        data = await getUserData(user.uid);
        if (data) {
          saveUserDataToStorage(user.uid, data);
        }
      } else {
        console.log(' Restored user data from cache');
      }

      setUserData(data);
    } catch (error) {
      console.error("Error restoring user data:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // First try to get cached user data immediately
        const cachedData = getUserDataFromStorage(user.uid);
        if (cachedData) {
          setUserData(cachedData);
          setLoading(false);
          console.log(' User authenticated with cached data');
          
          // Sync user to Oracle database in background
          syncUserToDatabase(user, cachedData).catch(console.error);
        } else {
          // No cache, fetch from Firestore
          try {
            const data = await getUserData(user.uid);
            setUserData(data);
            if (data) {
              saveUserDataToStorage(user.uid, data);
            }
            
            // Sync user to Oracle database
            await syncUserToDatabase(user, data);
          } catch (error) {
            console.error("Error fetching user data:", error);
          }
          setLoading(false);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    // Handle redirect result on page load
    handleAuthRedirect().catch(console.error);

    return unsubscribe;
  }, []);

  const signIn = async (enableSync: boolean = true) => {
    try {
      await signInWithGoogle(enableSync);
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      console.error("Error signing in with email:", error);
      throw error;
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string, displayName: string) => {
    try {
      await signUpWithEmail(email, password, displayName);
    } catch (error) {
      console.error("Error signing up with email:", error);
      throw error;
    }
  };

  const signOut = async () => {
    const { signOutUser } = await import("@/lib/firebase");
    
    // Clear cached data before signing out
    if (user?.uid) {
      clearUserStorage(user.uid);
    }
    
    await signOutUser();
  };

  const hasGoogleAccess = userData?.hasGoogleAccess === true;
  const hasGoogleCalendar = userData?.hasGoogleCalendar === true;

  const value = {
    user,
    userData,
    loading,
    signIn,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    signOut,
    hasGoogleAccess,
    hasGoogleCalendar,
    restoreUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
