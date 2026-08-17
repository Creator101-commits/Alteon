import { toast } from '@/hooks/use-toast';

export class ErrorHandler {
  static handle(error: Error | unknown, userMessage?: string, context?: Record<string, any>) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('App Error:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
    });

    toast({
      title: 'Something went wrong',
      description: userMessage || errorMessage || 'Please try again.',
      variant: 'destructive',
    });
  }

  static handleValidationError(errors: unknown) {
    const errorMessage = Array.isArray(errors)
      ? errors.map((error) => (error as { message?: string }).message).join(', ')
      : String(errors);

    console.warn('Validation Error:', errorMessage);
    toast({
      title: 'Validation Error',
      description: errorMessage,
      variant: 'destructive',
    });
  }

  static handleAuthError(error: Error | unknown) {
    console.error('Auth Error:', error);
    toast({
      title: 'Authentication Failed',
      description: 'Please sign in again to continue.',
      variant: 'destructive',
    });
  }
}
