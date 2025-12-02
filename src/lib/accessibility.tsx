/**
 * Accessibility Utilities
 * 
 * Helper functions and hooks for WCAG 2.1 AA compliance
 */

import React, { useEffect, useRef, useState } from 'react';

/**
 * Focus trap for modals and dialogs
 * Prevents focus from leaving the dialog when using Tab key
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when dialog opens
    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab: going backwards
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: going forwards
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);

    return () => {
      container.removeEventListener('keydown', handleTab);
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Announce content to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only'; // Screen reader only class
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Hook to announce loading states
 */
export function useLoadingAnnouncement(isLoading: boolean, loadingMessage: string, successMessage?: string) {
  const wasLoading = useRef(false);

  useEffect(() => {
    if (isLoading && !wasLoading.current) {
      announceToScreenReader(loadingMessage, 'polite');
      wasLoading.current = true;
    } else if (!isLoading && wasLoading.current) {
      if (successMessage) {
        announceToScreenReader(successMessage, 'polite');
      }
      wasLoading.current = false;
    }
  }, [isLoading, loadingMessage, successMessage]);
}

/**
 * Generate unique ID for ARIA labels
 */
let idCounter = 0;
export function useId(prefix: string = 'id'): string {
  const [id] = useState(() => `${prefix}-${++idCounter}`);
  return id;
}

/**
 * Check color contrast ratio (WCAG 2.1 AA requires 4.5:1 for normal text)
 */
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (hex: string): number => {
    // Remove # if present
    hex = hex.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance
    const [rs, gs, bs] = [r, g, b].map((c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsWCAGAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Keyboard navigation helper
 */
export function useKeyboardNavigation(
  items: any[],
  onSelect: (index: number) => void,
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical';
  } = {}
) {
  const { loop = true, orientation = 'vertical' } = options;
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key;
    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    if (key === nextKey) {
      e.preventDefault();
      setFocusedIndex((current) => {
        const next = current + 1;
        return loop ? next % items.length : Math.min(next, items.length - 1);
      });
    } else if (key === prevKey) {
      e.preventDefault();
      setFocusedIndex((current) => {
        const prev = current - 1;
        return loop ? (prev + items.length) % items.length : Math.max(prev, 0);
      });
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      onSelect(focusedIndex);
    } else if (key === 'Home') {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (key === 'End') {
      e.preventDefault();
      setFocusedIndex(items.length - 1);
    }
  };

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  };
}

/**
 * Skip to main content link (for keyboard navigation)
 */
export function SkipToMain() {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const main = document.getElementById('main-content');
    if (main) {
      main.focus();
      main.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
    >
      Skip to main content
    </a>
  );
}

/**
 * ARIA live region component
 */
interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  children?: React.ReactNode;
}

export function LiveRegion({ message, priority = 'polite', children }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message || children}
    </div>
  );
}

/**
 * Screen reader only CSS class
 * Add this to your global CSS:
 * 
 * .sr-only {
 *   position: absolute;
 *   width: 1px;
 *   height: 1px;
 *   padding: 0;
 *   margin: -1px;
 *   overflow: hidden;
 *   clip: rect(0, 0, 0, 0);
 *   white-space: nowrap;
 *   border-width: 0;
 * }
 * 
 * .sr-only:focus {
 *   position: static;
 *   width: auto;
 *   height: auto;
 *   padding: inherit;
 *   margin: inherit;
 *   overflow: visible;
 *   clip: auto;
 *   white-space: normal;
 * }
 */
