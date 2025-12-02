import { toast } from '@/hooks/use-toast';
import { errorReporter } from '@/lib/errorReporting';

interface ErrorReport {
  error: string;
  stack?: string;
  userId?: string;
  timestamp: string;
  context?: Record<string, any>;
}

export class ErrorHandler {
  /**
   * Handle application errors with user feedback and logging
   */
  static handle(error: Error | unknown, userMessage?: string, context?: Record<string, any>) {
    // Extract error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log for debugging
    console.error('App Error:', {
      message: errorMessage,
      stack: errorStack,
      context,
      timestamp: new Date().toISOString()
    });

    // Report to error monitoring system
    errorReporter.captureError(
      error instanceof Error ? error : new Error(errorMessage),
      {
        action: context?.context || 'Unknown Action',
        page: window.location.pathname,
        additionalData: context,
      }
    );

    // Show user-friendly toast
    toast({
      title: "Something went wrong",
      description: userMessage || errorMessage || "Please try again.",
      variant: "destructive",
    });

    // Store error report locally
    this.reportError({
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      context,
    });
  }

  /**
   * Handle network errors specifically
   */
  static handleNetworkError(error: Error | unknown, operation: string) {
    console.error('Network Error:', error);

    // Report network error
    errorReporter.captureError(
      error instanceof Error ? error : new Error(`Network error: ${operation}`),
      {
        action: `Network: ${operation}`,
        page: window.location.pathname,
        additionalData: { operation },
      }
    );

    toast({
      title: "Connection Issue",
      description: `Failed to ${operation}. Please check your internet connection.`,
      variant: "destructive",
    });
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(errors: any) {
    const errorMessages = Array.isArray(errors) 
      ? errors.map(e => e.message).join(', ')
      : String(errors);

    // Log validation error
    errorReporter.captureWarning('Validation Error', {
      errors: errorMessages,
      page: window.location.pathname,
    });

    toast({
      title: "Validation Error",
      description: errorMessages,
      variant: "destructive",
    });
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error: Error | unknown) {
    console.error('Auth Error:', error);

    // Report auth error
    errorReporter.captureError(
      error instanceof Error ? error : new Error('Authentication failed'),
      {
        action: 'Authentication',
        page: window.location.pathname,
      }
    );

    toast({
      title: "Authentication Failed",
      description: "Please sign in again to continue.",
      variant: "destructive",
    });
  }

  /**
   * Report error to monitoring service (placeholder for future implementation)
   */
  private static reportError(report: ErrorReport) {
    // TODO: Integrate with error monitoring service (e.g., Sentry, LogRocket)
    
    // For now, store in localStorage for debugging
    try {
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      errors.push(report);
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.shift();
      }
      
      localStorage.setItem('app_errors', JSON.stringify(errors));
    } catch (e) {
      console.warn('Failed to store error report:', e);
    }
  }

  /**
   * Get stored errors for debugging
   */
  static getStoredErrors(): ErrorReport[] {
    try {
      return JSON.parse(localStorage.getItem('app_errors') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  static clearStoredErrors() {
    localStorage.removeItem('app_errors');
  }
}

/**
 * Wrapper for async operations with automatic error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage?: string,
  context?: Record<string, any>
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    ErrorHandler.handle(error, errorMessage, context);
    return null;
  }
}
