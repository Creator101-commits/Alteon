/**
 * Utility functions for HTTP requests with timeout and retry logic
 */

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Fetch with timeout and retry support
 * @param url - The URL to fetch
 * @param options - Request options including timeout and retry settings
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeout = 10000,     // 10 second default timeout
    retries = 2,          // 2 retries by default
    retryDelay = 1000,    // 1 second base delay
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Return successful response immediately
      if (response.ok) {
        return response;
      }

      // On last attempt, return the response even if not ok
      if (attempt === retries) {
        return response;
      }

      // Retry on 5xx server errors
      if (response.status >= 500) {
        lastError = new Error(`Server error: ${response.status}`);
        await sleep(retryDelay * (attempt + 1)); // Exponential backoff
        continue;
      }

      // Don't retry on 4xx client errors
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeout}ms`);
      } else {
        lastError = error;
      }

      // On last attempt, throw the error
      if (attempt === retries) {
        throw lastError;
      }

      // Wait before retry with exponential backoff
      await sleep(retryDelay * (attempt + 1));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout only (no retries) - for parallel requests
 * @param url - The URL to fetch
 * @param options - Request options
 * @param timeout - Timeout in milliseconds
 * @returns Promise<Response>
 */
export async function fetchWithTimeoutOnly(
  url: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}
