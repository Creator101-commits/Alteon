import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface AccessibilitySettings {
  // Visual Accessibility
  highContrast: boolean;
  largeText: boolean;
  dyslexiaFriendlyFont: boolean;
  reducedMotion: boolean;
  darkMode: boolean;
  colorBlindFriendly: boolean;
  
  // Audio Accessibility
  soundEffects: boolean;
  voiceAnnouncements: boolean;
  screenReaderOptimized: boolean;
  
  // Navigation Accessibility
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  skipLinks: boolean;
  
  // Cognitive Accessibility
  simplifiedInterface: boolean;
  autoSave: boolean;
  confirmationDialogs: boolean;
  tooltipsEnabled: boolean;
  
  // Custom Settings
  fontSize: number; // 100 = normal, 150 = 150% larger
  lineHeight: number; // 1.4 = normal, 2.0 = double spacing
  letterSpacing: number; // 0 = normal, 2 = wider
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  dyslexiaFriendlyFont: false,
  reducedMotion: false,
  darkMode: false,
  colorBlindFriendly: false,
  soundEffects: true,
  voiceAnnouncements: false,
  screenReaderOptimized: false,
  keyboardNavigation: true,
  focusIndicators: true,
  skipLinks: true,
  simplifiedInterface: false,
  autoSave: true,
  confirmationDialogs: true,
  tooltipsEnabled: true,
  fontSize: 100,
  lineHeight: 1.4,
  letterSpacing: 0
};

export const useAccessibility = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (user?.uid) {
      loadSettings();
    }
    
    // Detect system preferences
    detectSystemPreferences();
  }, [user?.uid]);

  useEffect(() => {
    applyAccessibilityStyles();
  }, [settings]);

  const loadSettings = () => {
    if (!user?.uid) return;
    
    const saved = localStorage.getItem(`accessibility_settings_${user.uid}`);
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const saveSettings = (newSettings: AccessibilitySettings) => {
    if (!user?.uid) return;
    
    setSettings(newSettings);
    localStorage.setItem(`accessibility_settings_${user.uid}`, JSON.stringify(newSettings));
  };

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K, 
    value: AccessibilitySettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const detectSystemPreferences = () => {
    // Check for system dark mode preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      updateSetting('darkMode', true);
    }
    
    // Check for reduced motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      updateSetting('reducedMotion', true);
    }
    
    // Check for high contrast preference
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
      updateSetting('highContrast', true);
    }
  };

  const applyAccessibilityStyles = () => {
    const root = document.documentElement;
    
    // Apply font size
    root.style.setProperty('--accessibility-font-size', `${settings.fontSize}%`);
    
    // Apply line height
    root.style.setProperty('--accessibility-line-height', settings.lineHeight.toString());
    
    // Apply letter spacing
    root.style.setProperty('--accessibility-letter-spacing', `${settings.letterSpacing}px`);
    
    // Apply dyslexia-friendly font
    if (settings.dyslexiaFriendlyFont) {
      root.style.setProperty('--accessibility-font-family', '"OpenDyslexic", "Comic Sans MS", cursive');
    } else {
      root.style.setProperty('--accessibility-font-family', 'inherit');
    }
    
    // Apply high contrast mode
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Apply reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Apply color blind friendly palette
    if (settings.colorBlindFriendly) {
      root.classList.add('colorblind-friendly');
    } else {
      root.classList.remove('colorblind-friendly');
    }
    
    // Apply simplified interface
    if (settings.simplifiedInterface) {
      root.classList.add('simplified-interface');
    } else {
      root.classList.remove('simplified-interface');
    }
  };

  const announceToScreenReader = (message: string) => {
    if (!settings.screenReaderOptimized) return;
    
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  const playAccessibilitySound = (type: 'success' | 'error' | 'notification' | 'focus') => {
    if (!settings.soundEffects) return;
    
    // Create audio context for accessibility sounds
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different types
    const frequencies = {
      success: 880, // A5
      error: 220,   // A3
      notification: 440, // A4
      focus: 660    // E5
    };
    
    oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const generateAccessibilityReport = () => {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    if (!settings.focusIndicators) {
      issues.push("Focus indicators are disabled");
      suggestions.push("Enable focus indicators for better keyboard navigation");
    }
    
    if (!settings.keyboardNavigation) {
      issues.push("Keyboard navigation is disabled");
      suggestions.push("Enable keyboard navigation for accessibility compliance");
    }
    
    if (settings.fontSize < 110 && settings.largeText) {
      suggestions.push("Consider increasing font size to 110% or higher for better readability");
    }
    
    if (!settings.autoSave) {
      suggestions.push("Enable auto-save to prevent data loss");
    }
    
    return {
      issues,
      suggestions,
      score: Math.max(0, 100 - issues.length * 10),
      compliantFeatures: [
        settings.focusIndicators && "Focus indicators enabled",
        settings.keyboardNavigation && "Keyboard navigation supported",
        settings.skipLinks && "Skip links available",
        settings.screenReaderOptimized && "Screen reader optimized",
        settings.highContrast && "High contrast mode available",
        settings.autoSave && "Auto-save enabled"
      ].filter(Boolean)
    };
  };

  return {
    settings,
    updateSetting,
    saveSettings,
    announceToScreenReader,
    playAccessibilitySound,
    generateAccessibilityReport,
    detectSystemPreferences
  };
};
