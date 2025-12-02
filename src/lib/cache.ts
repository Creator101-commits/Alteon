/**
 * Advanced caching utilities for optimized data management
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100; // Maximum number of entries
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instance
export const memoryCache = new MemoryCache();

// Request deduplication
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request
    const request = requestFn().finally(() => {
      // Clean up after request completes
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, request);
    return request;
  }

  clear(): void {
    this.pendingRequests.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// Optimized API request with caching and deduplication
export async function cachedRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  options: {
    ttl?: number;
    useDeduplication?: boolean;
    skipCache?: boolean;
  } = {}
): Promise<T> {
  const { ttl = 5 * 60 * 1000, useDeduplication = true, skipCache = false } = options;

  // Check cache first (unless skipped)
  if (!skipCache && memoryCache.has(key)) {
    return memoryCache.get<T>(key)!;
  }

  // Create request function
  const makeRequest = async (): Promise<T> => {
    try {
      const data = await requestFn();
      
      // Cache the result
      if (!skipCache) {
        memoryCache.set(key, data, ttl);
      }
      
      return data;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  };

  // Use deduplication if enabled
  if (useDeduplication) {
    return requestDeduplicator.deduplicate(key, makeRequest);
  }

  return makeRequest();
}

// Batch request utility
export class BatchRequestManager {
  private batches = new Map<string, {
    requests: Array<{ key: string; requestFn: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }>;
    timer: NodeJS.Timeout;
  }>();

  private batchDelay = 50; // 50ms batch delay

  async batch<T>(
    batchKey: string,
    requestKey: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Get or create batch
      let batch = this.batches.get(batchKey);
      
      if (!batch) {
        batch = {
          requests: [],
          timer: setTimeout(() => {
            this.executeBatch(batchKey);
          }, this.batchDelay),
        };
        this.batches.set(batchKey, batch);
      }

      // Add request to batch
      batch.requests.push({
        key: requestKey,
        requestFn,
        resolve,
        reject,
      });
    });
  }

  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    this.batches.delete(batchKey);
    clearTimeout(batch.timer);

    // Execute all requests in parallel
    const promises = batch.requests.map(async ({ requestFn, resolve, reject }) => {
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    await Promise.allSettled(promises);
  }
}

export const batchRequestManager = new BatchRequestManager();

// Cleanup expired cache entries periodically
setInterval(() => {
  memoryCache.cleanup();
}, 60 * 1000); // Every minute
