import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { auth } from './firebase';
import { ensureSupabaseTokenReady, getSupabaseToken } from './supabase-token';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with a custom fetch that injects the Supabase JWT
// (signed with sub = Firebase UID) when the user is authenticated.
// For authenticated users, we avoid falling back to anon auth because RLS
// would reject requests and create startup race conditions.
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const isSignedIn = !!auth.currentUser;
        const token = isSignedIn
          ? await ensureSupabaseTokenReady(10_000)
          : await getSupabaseToken();

        if (token) {
          const headers = new Headers(init?.headers);
          headers.set('Authorization', `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        }

        if (isSignedIn) {
          // Abort request instead of sending anonymous credentials while signed in.
          throw new Error('Supabase JWT unavailable for authenticated request');
        }
      } catch {
        if (auth.currentUser) {
          throw new Error('Supabase JWT bootstrap failed for authenticated request');
        }
      }

      return fetch(input, init);
    },
    headers: {
      'X-Client-Info': 'alteon-web-app',
    },
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
});

export default supabase;
