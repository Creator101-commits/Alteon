/**
 * API Helper Functions
 * 
 * Convenient wrappers around apiClient for common API operations
 */

import { apiClient } from './apiClient';
import { errorReporter } from './errorReporting';

/**
 * Helper to make API calls with automatic error reporting and performance tracking
 */
export async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  options?: {
    skipRetry?: boolean;
    timeout?: number;
  }
): Promise<T> {
  const startTime = performance.now();

  try {
    let response: T;

    // Track API call in breadcrumbs
    errorReporter.addBreadcrumb('api', `${method} ${url}`, {
      method,
      url,
      hasData: !!data,
    });

    switch (method) {
      case 'GET':
        response = await apiClient.get<T>(url, {}, options?.skipRetry ? { maxRetries: 0 } : undefined);
        break;
      case 'POST':
        response = await apiClient.post<T>(url, data, {}, options?.skipRetry ? { maxRetries: 0 } : undefined);
        break;
      case 'PUT':
        response = await apiClient.put<T>(url, data, {}, options?.skipRetry ? { maxRetries: 0 } : undefined);
        break;
      case 'DELETE':
        response = await apiClient.delete<T>(url, {}, options?.skipRetry ? { maxRetries: 0 } : undefined);
        break;
    }

    // Track successful API call performance
    const duration = performance.now() - startTime;
    errorReporter.trackAPICall(url, method, duration, 200);

    return response;
  } catch (error: any) {
    // Track failed API call
    const duration = performance.now() - startTime;
    const status = error.status || 500;
    errorReporter.trackAPICall(url, method, duration, status, error.message);

    throw error;
  }
}

/**
 * Convenient GET request
 */
export async function get<T>(url: string): Promise<T> {
  return apiCall<T>('GET', url);
}

/**
 * Convenient POST request
 */
export async function post<T>(url: string, data: any): Promise<T> {
  return apiCall<T>('POST', url, data);
}

/**
 * Convenient PUT request
 */
export async function put<T>(url: string, data: any): Promise<T> {
  return apiCall<T>('PUT', url, data);
}

/**
 * Convenient DELETE request
 */
export async function del<T>(url: string): Promise<T> {
  return apiCall<T>('DELETE', url);
}

/**
 * Fetch with timeout and AbortController (for legacy code migration)
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}
