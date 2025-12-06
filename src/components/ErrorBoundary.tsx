/**
 * Error Boundary Components
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 * 
 * Issue #14: Error boundaries for graceful error handling
 */

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Brain, RotateCcw, RefreshCw, Home } from 'lucide-react';
import { errorReporter } from '@/lib/errorReporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional name for identifying this boundary in logs */
  name?: string;
  /** Called when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Show reset button */
  showReset?: boolean;
  /** Compact mode for smaller components */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console
    console.error(`ErrorBoundary${this.props.name ? ` [${this.props.name}]` : ''} caught an error:`, error, errorInfo);
    
    // Report to error tracking service
    try {
      errorReporter.captureError(error, { 
        additionalData: {
          componentStack: errorInfo.componentStack,
          boundaryName: this.props.name 
        }
      });
    } catch (e) {
      // Ignore if error reporting fails
    }

    // Store error info
    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Compact error display
      if (this.props.compact) {
        return (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <span className="text-destructive">Something went wrong</span>
            {this.props.showReset !== false && (
              <Button 
                onClick={this.handleReset}
                variant="ghost"
                size="sm"
                className="ml-auto h-6 px-2"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      }

      // Full error display
      return (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <div className="flex justify-center gap-2">
                {this.props.showReset !== false && (
                  <Button 
                    onClick={this.handleReset}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
                <Button 
                  onClick={this.handleReload}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  variant="ghost"
                  size="sm"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Error details</summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Page-level error boundary with full error display
 */
export class PageErrorBoundary extends ErrorBoundary {
  static defaultProps = {
    showReset: true,
    compact: false,
  };
}

/**
 * Component-level error boundary with compact display
 */
export class ComponentErrorBoundary extends ErrorBoundary {
  static defaultProps = {
    showReset: true,
    compact: true,
  };
}

/**
 * Silent error boundary - logs errors but doesn't show UI
 * Useful for non-critical components
 */
interface SilentErrorBoundaryProps {
  children: ReactNode;
  name?: string;
}

export class SilentErrorBoundary extends Component<SilentErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn(`SilentErrorBoundary${this.props.name ? ` [${this.props.name}]` : ''} caught:`, error.message);
  }

  render() {
    if (this.state.hasError) {
      return null; // Render nothing on error
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
