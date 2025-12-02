/**
 * Centralized app state management for better performance
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

// App state interface
interface AppState {
  // UI state
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  currentPage: string;
  
  // Loading states
  globalLoading: boolean;
  pageLoading: boolean;
  
  // User preferences
  preferences: {
    animations: boolean;
    reducedMotion: boolean;
    compactMode: boolean;
    autoSave: boolean;
  };
  
  // Navigation state
  navigation: {
    breadcrumbs: Array<{ label: string; path: string }>;
    history: string[];
  };
  
  // Performance metrics
  performance: {
    lastRenderTime: number;
    renderCount: number;
  };
}

// Action types
type AppAction =
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'SET_CURRENT_PAGE'; payload: string }
  | { type: 'SET_GLOBAL_LOADING'; payload: boolean }
  | { type: 'SET_PAGE_LOADING'; payload: boolean }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<AppState['preferences']> }
  | { type: 'ADD_BREADCRUMB'; payload: { label: string; path: string } }
  | { type: 'REMOVE_BREADCRUMB'; payload: number }
  | { type: 'NAVIGATE_TO'; payload: string }
  | { type: 'UPDATE_PERFORMANCE'; payload: Partial<AppState['performance']> }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: AppState = {
  sidebarOpen: false,
  theme: 'system',
  currentPage: '/',
  globalLoading: false,
  pageLoading: false,
  preferences: {
    animations: true,
    reducedMotion: false,
    compactMode: false,
    autoSave: true,
  },
  navigation: {
    breadcrumbs: [],
    history: [],
  },
  performance: {
    lastRenderTime: 0,
    renderCount: 0,
  },
};

// Reducer
function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.payload };
    
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    
    case 'SET_GLOBAL_LOADING':
      return { ...state, globalLoading: action.payload };
    
    case 'SET_PAGE_LOADING':
      return { ...state, pageLoading: action.payload };
    
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };
    
    case 'ADD_BREADCRUMB':
      return {
        ...state,
        navigation: {
          ...state.navigation,
          breadcrumbs: [...state.navigation.breadcrumbs, action.payload],
        },
      };
    
    case 'REMOVE_BREADCRUMB':
      return {
        ...state,
        navigation: {
          ...state.navigation,
          breadcrumbs: state.navigation.breadcrumbs.filter((_, index) => index !== action.payload),
        },
      };
    
    case 'NAVIGATE_TO':
      return {
        ...state,
        navigation: {
          ...state.navigation,
          history: [...state.navigation.history, action.payload],
        },
        currentPage: action.payload,
      };
    
    case 'UPDATE_PERFORMANCE':
      return {
        ...state,
        performance: { ...state.performance, ...action.payload },
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Context
const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    setSidebarOpen: (open: boolean) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setCurrentPage: (page: string) => void;
    setGlobalLoading: (loading: boolean) => void;
    setPageLoading: (loading: boolean) => void;
    updatePreferences: (preferences: Partial<AppState['preferences']>) => void;
    addBreadcrumb: (breadcrumb: { label: string; path: string }) => void;
    removeBreadcrumb: (index: number) => void;
    navigateTo: (path: string) => void;
    updatePerformance: (performance: Partial<AppState['performance']>) => void;
    resetState: () => void;
  };
} | null>(null);

// Provider component
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      setSidebarOpen: (open: boolean) => dispatch({ type: 'SET_SIDEBAR_OPEN', payload: open }),
      setTheme: (theme: 'light' | 'dark' | 'system') => dispatch({ type: 'SET_THEME', payload: theme }),
      setCurrentPage: (page: string) => dispatch({ type: 'SET_CURRENT_PAGE', payload: page }),
      setGlobalLoading: (loading: boolean) => dispatch({ type: 'SET_GLOBAL_LOADING', payload: loading }),
      setPageLoading: (loading: boolean) => dispatch({ type: 'SET_PAGE_LOADING', payload: loading }),
      updatePreferences: (preferences: Partial<AppState['preferences']>) =>
        dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences }),
      addBreadcrumb: (breadcrumb: { label: string; path: string }) =>
        dispatch({ type: 'ADD_BREADCRUMB', payload: breadcrumb }),
      removeBreadcrumb: (index: number) => dispatch({ type: 'REMOVE_BREADCRUMB', payload: index }),
      navigateTo: (path: string) => dispatch({ type: 'NAVIGATE_TO', payload: path }),
      updatePerformance: (performance: Partial<AppState['performance']>) =>
        dispatch({ type: 'UPDATE_PERFORMANCE', payload: performance }),
      resetState: () => dispatch({ type: 'RESET_STATE' }),
    }),
    [dispatch]
  );

  const value = useMemo(
    () => ({ state, dispatch, actions }),
    [state, dispatch, actions]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

// Hook to use app state
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

// Selector hooks for specific parts of state
export function useSidebarState() {
  const { state, actions } = useAppState();
  return {
    isOpen: state.sidebarOpen,
    toggle: () => actions.setSidebarOpen(!state.sidebarOpen),
    open: () => actions.setSidebarOpen(true),
    close: () => actions.setSidebarOpen(false),
  };
}

export function useThemeState() {
  const { state, actions } = useAppState();
  return {
    theme: state.theme,
    setTheme: actions.setTheme,
  };
}

export function useLoadingState() {
  const { state, actions } = useAppState();
  return {
    globalLoading: state.globalLoading,
    pageLoading: state.pageLoading,
    setGlobalLoading: actions.setGlobalLoading,
    setPageLoading: actions.setPageLoading,
    isLoading: state.globalLoading || state.pageLoading,
  };
}

export function usePreferences() {
  const { state, actions } = useAppState();
  return {
    preferences: state.preferences,
    updatePreferences: actions.updatePreferences,
  };
}

export function useNavigation() {
  const { state, actions } = useAppState();
  return {
    breadcrumbs: state.navigation.breadcrumbs,
    history: state.navigation.history,
    currentPage: state.currentPage,
    addBreadcrumb: actions.addBreadcrumb,
    removeBreadcrumb: actions.removeBreadcrumb,
    navigateTo: actions.navigateTo,
  };
}

export function usePerformance() {
  const { state, actions } = useAppState();
  return {
    performance: state.performance,
    updatePerformance: actions.updatePerformance,
  };
}
