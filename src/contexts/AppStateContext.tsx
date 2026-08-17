import { createContext, useContext, useState, type ReactNode } from 'react';

type NavigationStyle = 'dock' | 'sidebar';

interface Preferences {
  animations: boolean;
  reducedMotion: boolean;
  compactMode: boolean;
  autoSave: boolean;
  navigationStyle: NavigationStyle;
}

interface PreferencesContextValue {
  preferences: Preferences;
  updatePreferences: (preferences: Partial<Preferences>) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function getInitialPreferences(): Preferences {
  return {
    animations: true,
    reducedMotion: false,
    compactMode: false,
    autoSave: true,
    navigationStyle:
      (typeof window !== 'undefined'
        ? (localStorage.getItem('navigationStyle') as NavigationStyle | null)
        : null) || 'dock',
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(getInitialPreferences);

  const updatePreferences = (next: Partial<Preferences>) => {
    setPreferences((current) => ({ ...current, ...next }));
  };

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within an AppStateProvider');
  }
  return context;
}
