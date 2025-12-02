/**
 * Error Reporting and Monitoring System
 * 
 * Features:
 * - Error tracking with user context
 * - Breadcrumb trail for debugging
 * - Performance monitoring
 * - Ready for Sentry/LogRocket integration
 */

interface ErrorReport {
  message: string;
  stack?: string;
  context: ErrorContext;
  breadcrumbs: Breadcrumb[];
  timestamp: number;
  environment: string;
}

interface ErrorContext {
  userId?: string;
  userEmail?: string;
  page: string;
  action?: string;
  additionalData?: Record<string, any>;
  browserInfo: BrowserInfo;
}

interface Breadcrumb {
  timestamp: number;
  category: 'navigation' | 'action' | 'api' | 'error' | 'info';
  message: string;
  data?: Record<string, any>;
}

interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  viewport: string;
}

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class ErrorReporter {
  private static instance: ErrorReporter;
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private isInitialized = false;
  private userId?: string;
  private userEmail?: string;

  private constructor() {}

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  /**
   * Initialize error reporter with user context
   */
  init(config?: { userId?: string; userEmail?: string }) {
    if (this.isInitialized) return;

    this.userId = config?.userId;
    this.userEmail = config?.userEmail;
    this.isInitialized = true;

    // Set up global error handlers
    this.setupGlobalHandlers();

    console.log('Error Reporter initialized');
  }

  /**
   * Set user context
   */
  setUser(userId: string, userEmail?: string) {
    this.userId = userId;
    this.userEmail = userEmail;
    this.addBreadcrumb('info', 'User context updated', { userId, userEmail });
  }

  /**
   * Clear user context (on logout)
   */
  clearUser() {
    this.userId = undefined;
    this.userEmail = undefined;
    this.breadcrumbs = [];
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(
    category: Breadcrumb['category'],
    message: string,
    data?: Record<string, any>
  ) {
    const breadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      category,
      message,
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Get browser information
   */
  private getBrowserInfo(): BrowserInfo {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  /**
   * Capture and report error
   */
  captureError(
    error: Error | string,
    context?: {
      action?: string;
      page?: string;
      additionalData?: Record<string, any>;
    }
  ) {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    const report: ErrorReport = {
      message: errorObj.message,
      stack: errorObj.stack,
      context: {
        userId: this.userId,
        userEmail: this.userEmail,
        page: context?.page || window.location.pathname,
        action: context?.action,
        additionalData: context?.additionalData,
        browserInfo: this.getBrowserInfo(),
      },
      breadcrumbs: [...this.breadcrumbs],
      timestamp: Date.now(),
      environment: import.meta.env.MODE,
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.group(' Error Captured');
      console.error('Error:', errorObj);
      console.log('Context:', report.context);
      console.log('Breadcrumbs:', report.breadcrumbs);
      console.groupEnd();
    }

    // Store in localStorage for development/debugging
    this.storeErrorLocally(report);

    // TODO: Send to monitoring service in production
    if (import.meta.env.PROD) {
      this.sendToMonitoringService(report);
    }

    // Add breadcrumb for this error
    this.addBreadcrumb('error', `Error: ${errorObj.message}`, {
      stack: errorObj.stack?.split('\n')[1], // First line of stack
    });
  }

  /**
   * Capture warning (non-critical issues)
   */
  captureWarning(message: string, data?: Record<string, any>) {
    console.warn(' Warning:', message, data);
    this.addBreadcrumb('info', `Warning: ${message}`, data);

    // Store warning locally
    const warnings = this.getStoredData('warnings') || [];
    warnings.push({
      message,
      data,
      timestamp: Date.now(),
      page: window.location.pathname,
    });

    // Keep last 20 warnings
    if (warnings.length > 20) {
      warnings.shift();
    }

    localStorage.setItem('error_warnings', JSON.stringify(warnings));
  }

  /**
   * Monitor performance metric
   */
  capturePerformance(
    name: string,
    duration: number,
    metadata?: Record<string, any>
  ) {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    // Log slow operations (>2s)
    if (duration > 2000) {
      console.warn(` Slow operation detected: ${name} took ${duration}ms`, metadata);
      this.captureWarning(`Slow operation: ${name}`, {
        duration,
        ...metadata,
      });
    }

    // Store performance metrics
    const metrics = this.getStoredData('performance') || [];
    metrics.push(metric);

    // Keep last 50 metrics
    if (metrics.length > 50) {
      metrics.shift();
    }

    localStorage.setItem('performance_metrics', JSON.stringify(metrics));
  }

  /**
   * Track API call for monitoring
   */
  trackAPICall(
    url: string,
    method: string,
    duration: number,
    status: number,
    error?: string
  ) {
    const message = error
      ? `API Error: ${method} ${url} - ${status}`
      : `API Call: ${method} ${url} - ${status}`;

    this.addBreadcrumb('api', message, {
      url,
      method,
      duration,
      status,
      error,
    });

    // Track slow API calls
    if (duration > 2000) {
      this.capturePerformance(`API: ${method} ${url}`, duration, {
        status,
        error,
      });
    }
  }

  /**
   * Store error locally for debugging
   */
  private storeErrorLocally(report: ErrorReport) {
    try {
      const errors = this.getStoredData('errors') || [];
      errors.push(report);

      // Keep last 20 errors
      if (errors.length > 20) {
        errors.shift();
      }

      localStorage.setItem('error_reports', JSON.stringify(errors));
    } catch (e) {
      console.error('Failed to store error locally:', e);
    }
  }

  /**
   * Get stored data from localStorage
   */
  private getStoredData(key: 'errors' | 'warnings' | 'performance'): any[] {
    try {
      const storageKey =
        key === 'errors'
          ? 'error_reports'
          : key === 'warnings'
          ? 'error_warnings'
          : 'performance_metrics';

      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Send error to monitoring service (Sentry, LogRocket, etc.)
   */
  private async sendToMonitoringService(report: ErrorReport) {
    // TODO: Integrate with Sentry or similar service
    // Example Sentry integration:
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(report.message), {
    //     contexts: {
    //       user: {
    //         id: report.context.userId,
    //         email: report.context.userEmail,
    //       },
    //       browser: report.context.browserInfo,
    //     },
    //     extra: {
    //       breadcrumbs: report.breadcrumbs,
    //       additionalData: report.context.additionalData,
    //     },
    //   });
    // }

    console.log('Error would be sent to monitoring service:', report);
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalHandlers() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || event.message, {
        action: 'Uncaught Error',
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason || 'Unhandled Promise Rejection', {
        action: 'Unhandled Promise Rejection',
      });
    });

    // Track navigation
    let lastPath = window.location.pathname;
    const trackNavigation = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        this.addBreadcrumb('navigation', `Navigated to ${currentPath}`, {
          from: lastPath,
          to: currentPath,
        });
        lastPath = currentPath;
      }
    };

    // Track navigation with popstate and pushState
    window.addEventListener('popstate', trackNavigation);

    // Intercept history pushState
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      trackNavigation();
    };
  }

  /**
   * Get all errors for debugging
   */
  getErrors(): ErrorReport[] {
    return this.getStoredData('errors');
  }

  /**
   * Get all warnings
   */
  getWarnings(): any[] {
    return this.getStoredData('warnings');
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetric[] {
    return this.getStoredData('performance');
  }

  /**
   * Clear all stored errors and metrics
   */
  clearAllData() {
    localStorage.removeItem('error_reports');
    localStorage.removeItem('error_warnings');
    localStorage.removeItem('performance_metrics');
    this.breadcrumbs = [];
  }
}

// Export singleton instance
export const errorReporter = ErrorReporter.getInstance();

// Export types
export type { ErrorReport, ErrorContext, Breadcrumb, PerformanceMetric };
