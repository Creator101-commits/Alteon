import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Color theme types
export type BackgroundTheme = "dark" | "light";

export interface ColorCustomization {
  backgroundTheme: BackgroundTheme;
}

interface ColorCustomizationContextType {
  customization: ColorCustomization;
  updateCustomization: (updates: Partial<ColorCustomization>) => void;
  resetToDefault: () => void;
  applyCustomization: () => void;
}

const ColorCustomizationContext = createContext<ColorCustomizationContextType | undefined>(undefined);

export const useColorCustomization = () => {
  const context = useContext(ColorCustomizationContext);
  if (context === undefined) {
    throw new Error("useColorCustomization must be used within a ColorCustomizationProvider");
  }
  return context;
};

interface ColorCustomizationProviderProps {
  children: ReactNode;
}

// Default color customization
const DEFAULT_CUSTOMIZATION: ColorCustomization = {
  backgroundTheme: "dark",
};

// Color palette definitions - only light and dark themes
export const BACKGROUND_THEMES = {
  dark: {
    name: "Dark",
    background: "#131314",
    foreground: "#E0E0E0",
    muted: "#1a1a1b",
    mutedForeground: "#A0A0A0",
    border: "#2a2a2b",
    card: "#1a1a1b",
    cardForeground: "#E0E0E0",
    popover: "#131314",
    popoverForeground: "#E0E0E0",
  },
  light: {
    name: "Light",
    background: "#ffffff",
    foreground: "#0a0a0a",
    muted: "#f5f5f5",
    mutedForeground: "#737373",
    border: "#e5e5e5",
    card: "#ffffff",
    cardForeground: "#0a0a0a",
    popover: "#ffffff",
    popoverForeground: "#0a0a0a",
  },
};


// Helper to migrate old theme names to new ones
const migrateTheme = (theme: string): BackgroundTheme => {
  // Map old theme names to new ones
  const themeMap: Record<string, BackgroundTheme> = {
    'black': 'dark',
    'white': 'light',
    'blue': 'dark',
    'green': 'dark',
    'purple': 'dark',
    'orange': 'dark',
    'pink': 'dark',
    'gray': 'dark',
    'dark': 'dark',
    'light': 'light',
  };
  return themeMap[theme] || 'dark';
};

export const ColorCustomizationProvider = ({ children }: ColorCustomizationProviderProps) => {
  const [customization, setCustomization] = useState<ColorCustomization>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("colorCustomization");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Migrate old theme names to new ones
          if (parsed.backgroundTheme) {
            parsed.backgroundTheme = migrateTheme(parsed.backgroundTheme);
          }
          return { ...DEFAULT_CUSTOMIZATION, ...parsed };
        } catch (error) {
          console.warn("Failed to parse saved color customization:", error);
        }
      }
    }
    return DEFAULT_CUSTOMIZATION;
  });

  // Save to localStorage whenever customization changes
  useEffect(() => {
    localStorage.setItem("colorCustomization", JSON.stringify(customization));
    applyCustomization();
  }, [customization]);

  const updateCustomization = (updates: Partial<ColorCustomization>) => {
    setCustomization(prev => ({ ...prev, ...updates }));
  };

  const resetToDefault = () => {
    setCustomization(DEFAULT_CUSTOMIZATION);
  };

  const applyCustomization = () => {
    const root = document.documentElement;
    
    // Apply background theme with fallback to dark
    const themeKey = customization.backgroundTheme in BACKGROUND_THEMES 
      ? customization.backgroundTheme 
      : 'dark';
    const backgroundTheme = BACKGROUND_THEMES[themeKey];
    
    // Set CSS custom properties for background theme only
    root.style.setProperty("--background", backgroundTheme.background);
    root.style.setProperty("--foreground", backgroundTheme.foreground);
    root.style.setProperty("--muted", backgroundTheme.muted);
    root.style.setProperty("--muted-foreground", backgroundTheme.mutedForeground);
    root.style.setProperty("--border", backgroundTheme.border);
    root.style.setProperty("--card", backgroundTheme.card);
    root.style.setProperty("--card-foreground", backgroundTheme.cardForeground);
    root.style.setProperty("--popover", backgroundTheme.popover);
    root.style.setProperty("--popover-foreground", backgroundTheme.popoverForeground);
  };

  return (
    <ColorCustomizationContext.Provider value={{
      customization,
      updateCustomization,
      resetToDefault,
      applyCustomization,
    }}>
      {children}
    </ColorCustomizationContext.Provider>
  );
};
