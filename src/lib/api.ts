import { auth } from './firebase';
import { memoryCache } from './cache';

/**
 * Optimized utility functions for making authenticated API calls to Oracle backend
 * Features: Caching, request deduplication, and performance optimization
 */

const API_BASE_URL = 'http://localhost:5001';

// Wait for auth to be ready
const waitForAuth = (): Promise<string | null> => {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser.uid);
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user?.uid || null);
      });
    }
  });
};

export const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
  // Wait for authentication state to be ready
  const userId = await waitForAuth();
  
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  // For GET requests, try cache first (cache the data, not the Response object)
  const isGetRequest = !options.method || options.method === 'GET';
  const cacheKey = isGetRequest ? `api:${url}:${userId || 'anonymous'}` : null;

  if (isGetRequest && cacheKey) {
    try {
      const cachedData = memoryCache.get(cacheKey);
      if (cachedData) {
        // Return a new Response object with the cached data
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      // Cache miss or error, continue to make request
    }
  }

  // Make the actual request
  const response = await makeActualRequest(url, options, userId);

  // Cache the response data for GET requests
  if (isGetRequest && cacheKey && response.ok) {
    try {
      const responseClone = response.clone(); // Clone to avoid consuming the original
      const data = await responseClone.json();
      memoryCache.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes cache
    } catch (error) {
      console.warn('Failed to cache response data:', error);
    }
  }

  return response;
};

const makeActualRequest = async (url: string, options: RequestInit, userId: string | null) => {
  console.log(' API Debug:', { 
    url, 
    userId,
    method: options.method || 'GET',
    authCurrentUser: auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : null
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add user ID to headers if available
  if (userId) {
    headers['x-user-id'] = userId;
    console.log(' Adding user ID to headers:', userId);
  } else {
    console.warn(' No user ID available - user may not be authenticated');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(' API Response:', { 
      url, 
      status: response.status, 
      ok: response.ok,
      statusText: response.statusText 
    });

    // Return the response object directly so the caller can check .ok and .status
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Flashcard API functions
export const flashcardAPI = {
  // Get all flashcards for a user
  getFlashcards: async (userId: string) => {
    return makeAuthenticatedRequest(`/api/flashcards?userId=${userId}`);
  },

  // Create a new flashcard
  createFlashcard: async (flashcard: {
    userId: string;
    front: string;
    back: string;
    difficulty: "easy" | "medium" | "hard";
    classId?: string;
  }) => {
    return makeAuthenticatedRequest('/api/flashcards', {
      method: 'POST',
      body: JSON.stringify(flashcard),
    });
  },

  // Update a flashcard
  updateFlashcard: async (id: string, updates: {
    front?: string;
    back?: string;
    difficulty?: "easy" | "medium" | "hard";
    reviewCount?: number;
    lastReviewed?: string;
  }) => {
    return makeAuthenticatedRequest(`/api/flashcards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete a flashcard
  deleteFlashcard: async (id: string) => {
    return makeAuthenticatedRequest(`/api/flashcards/${id}`, {
      method: 'DELETE',
    });
  },
};

// Class API functions
export const classAPI = {
  // Get all classes for a user
  getClasses: async () => {
    return makeAuthenticatedRequest('/api/classes', { method: 'GET' });
  },

  // Create a new class
  createClass: async (classData: {
    name: string;
    section?: string;
    description?: string;
    teacherName?: string;
    teacherEmail?: string;
    color?: string;
  }) => {
    return makeAuthenticatedRequest('/api/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    });
  },

  // Update a class
  updateClass: async (id: string, updates: {
    name?: string;
    section?: string;
    description?: string;
    teacherName?: string;
    teacherEmail?: string;
    color?: string;
  }) => {
    return makeAuthenticatedRequest(`/api/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete a class
  deleteClass: async (id: string) => {
    return makeAuthenticatedRequest(`/api/classes/${id}`, {
      method: 'DELETE',
    });
  },
};

// Generic API functions for backward compatibility
export const apiGet = async (endpoint: string) => {
  return makeAuthenticatedRequest(endpoint, { method: 'GET' });
};

export const apiPost = async (endpoint: string, data: any) => {
  return makeAuthenticatedRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const apiPut = async (endpoint: string, data: any) => {
  return makeAuthenticatedRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const apiDelete = async (endpoint: string) => {
  return makeAuthenticatedRequest(endpoint, { method: 'DELETE' });
};