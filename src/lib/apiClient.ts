/**
 * API Client with automatic retry logic and error handling
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export interface NetworkStatus {
  online: boolean;
  retrying: boolean;
  retryCount: number;
  lastError?: string;
}

export class APIClient {
  private defaultRetryOptions: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };

  private networkStatus: NetworkStatus = {
    online: navigator.onLine,
    retrying: false,
    retryCount: 0,
  };

  private statusListeners: Array<(status: NetworkStatus) => void> = [];

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  /**
   * Subscribe to network status changes
   */
  onStatusChange(listener: (status: NetworkStatus) => void): () => void {
    this.statusListeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  private notifyStatusChange() {
    this.statusListeners.forEach(listener => listener({ ...this.networkStatus }));
  }

  private handleOnline() {
    this.networkStatus.online = true;
    this.networkStatus.lastError = undefined;
    this.notifyStatusChange();
    console.log('Network connection restored');
  }

  private handleOffline() {
    this.networkStatus.online = false;
    this.networkStatus.lastError = 'No internet connection';
    this.notifyStatusChange();
    console.log('Network connection lost');
  }

  /**
   * Delay helper for exponential backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    const delay = Math.min(
      options.baseDelay * Math.pow(options.backoffMultiplier, attempt),
      options.maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }

    // HTTP status codes that should be retried
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    if (error.status && retryableStatuses.includes(error.status)) {
      return true;
    }

    return false;
  }

  /**
   * Make a request with automatic retry logic
   */
  async requestWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retryOptions: RetryOptions = {}
  ): Promise<T> {
    const opts = { ...this.defaultRetryOptions, ...retryOptions };
    let lastError: any;

    // Check if offline
    if (!navigator.onLine) {
      this.networkStatus.lastError = 'No internet connection';
      this.notifyStatusChange();
      throw new Error('No internet connection. Please check your network and try again.');
    }

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        // Update retry status
        if (attempt > 0) {
          this.networkStatus.retrying = true;
          this.networkStatus.retryCount = attempt;
          this.notifyStatusChange();
        }

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        // If response is successful, return data
        if (response.ok) {
          // Reset retry status on success
          this.networkStatus.retrying = false;
          this.networkStatus.retryCount = 0;
          this.networkStatus.lastError = undefined;
          this.notifyStatusChange();

          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await response.json();
          }
          return await response.text() as any;
        }

        // Store error for potential retry
        lastError = {
          status: response.status,
          statusText: response.statusText,
          body: await response.text(),
        };

        this.networkStatus.lastError = `HTTP ${response.status}: ${response.statusText}`;

        // Don't retry on client errors (4xx except specific ones)
        if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
          this.networkStatus.retrying = false;
          this.networkStatus.retryCount = 0;
          this.notifyStatusChange();
          throw new Error(`HTTP ${response.status}: ${lastError.body}`);
        }

        // If this is not the last attempt and error is retryable, wait and retry
        if (attempt < opts.maxRetries && this.isRetryableError(lastError)) {
          const delayMs = this.calculateDelay(attempt, opts);
          console.log(`Request failed, retrying in ${delayMs}ms (attempt ${attempt + 1}/${opts.maxRetries})`);
          await this.delay(delayMs);
          continue;
        }

        // If we've exhausted retries, throw error
        this.networkStatus.retrying = false;
        this.networkStatus.retryCount = 0;
        this.notifyStatusChange();
        throw new Error(`HTTP ${response.status}: ${lastError.body}`);

      } catch (error: any) {
        lastError = error;

        // Handle abort errors
        if (error.name === 'AbortError') {
          this.networkStatus.lastError = 'Request timeout';
          this.networkStatus.retrying = false;
          this.networkStatus.retryCount = 0;
          this.notifyStatusChange();
          throw new Error('Request timeout. Please try again.');
        }

        // Check network status
        if (!navigator.onLine) {
          this.networkStatus.online = false;
          this.networkStatus.lastError = 'No internet connection';
          this.networkStatus.retrying = false;
          this.networkStatus.retryCount = 0;
          this.notifyStatusChange();
          throw new Error('No internet connection. Please check your network and try again.');
        }

        // Don't retry on non-retryable errors
        if (!this.isRetryableError(error)) {
          this.networkStatus.retrying = false;
          this.networkStatus.retryCount = 0;
          this.networkStatus.lastError = error.message;
          this.notifyStatusChange();
          throw error;
        }

        // If this is the last attempt, throw error
        if (attempt >= opts.maxRetries) {
          this.networkStatus.retrying = false;
          this.networkStatus.retryCount = 0;
          this.networkStatus.lastError = error.message;
          this.notifyStatusChange();
          throw error;
        }

        // Wait and retry
        const delayMs = this.calculateDelay(attempt, opts);
        console.log(`Request failed, retrying in ${delayMs}ms (attempt ${attempt + 1}/${opts.maxRetries})`, error);
        await this.delay(delayMs);
      }
    }

    this.networkStatus.retrying = false;
    this.networkStatus.retryCount = 0;
    this.notifyStatusChange();
    throw lastError;
  }

  /**
   * GET request with retry
   */
  async get<T>(url: string, options: RequestInit = {}, retryOptions?: RetryOptions): Promise<T> {
    return this.requestWithRetry<T>(url, { ...options, method: 'GET' }, retryOptions);
  }

  /**
   * POST request with retry
   */
  async post<T>(url: string, data: any, options: RequestInit = {}, retryOptions?: RetryOptions): Promise<T> {
    return this.requestWithRetry<T>(
      url,
      {
        ...options,
        method: 'POST',
        body: JSON.stringify(data),
      },
      retryOptions
    );
  }

  /**
   * PUT request with retry
   */
  async put<T>(url: string, data: any, options: RequestInit = {}, retryOptions?: RetryOptions): Promise<T> {
    return this.requestWithRetry<T>(
      url,
      {
        ...options,
        method: 'PUT',
        body: JSON.stringify(data),
      },
      retryOptions
    );
  }

  /**
   * DELETE request with retry
   */
  async delete<T>(url: string, options: RequestInit = {}, retryOptions?: RetryOptions): Promise<T> {
    return this.requestWithRetry<T>(url, { ...options, method: 'DELETE' }, retryOptions);
  }

  /**
   * Request with timeout
   */
  async requestWithTimeout<T>(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient();
