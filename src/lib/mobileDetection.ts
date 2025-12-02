/**
 * Mobile Device Detection Utility
 * 
 * Detects if the user is on a mobile device and provides responsive utilities
 */

/**
 * Detect if the current device is mobile based on screen width and user agent
 */
export function isMobileDevice(): boolean {
  // Check screen width (mobile breakpoint: 768px)
  const isMobileWidth = window.innerWidth < 768;
  
  // Check user agent for mobile devices
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // Return true if either width is mobile OR user agent is mobile
  return isMobileWidth || isMobileUA;
}

/**
 * Detect if the device has touch capability
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get current screen size category
 */
export function getScreenSize(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Get touch-friendly size for interactive elements
 * Returns 44px for mobile (Apple HIG standard), 40px for tablet, 36px for desktop
 */
export function getTouchTargetSize(): number {
  const screenSize = getScreenSize();
  
  switch (screenSize) {
    case 'mobile':
      return 44; // iOS Human Interface Guidelines minimum
    case 'tablet':
      return 40;
    case 'desktop':
      return 36;
  }
}

/**
 * React hook for mobile detection with window resize listener
 */
export function useMobileDetection() {
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTouch, setIsTouch] = React.useState(false);
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  React.useEffect(() => {
    // Initial detection
    const detectDevice = () => {
      setIsMobile(isMobileDevice());
      setIsTouch(isTouchDevice());
      setScreenSize(getScreenSize());
    };

    detectDevice();

    // Update on window resize (debounced)
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(detectDevice, 150);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { isMobile, isTouch, screenSize };
}

// Import React for the hook
import React from 'react';
