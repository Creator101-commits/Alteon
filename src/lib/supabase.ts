import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseToken } from './supabase-token';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with custom accessToken for RLS.
// The accessToken callback is called before every request.
// It returns a Supabase JWT (with sub = Firebase UID) when the user is
// authenticated, or the anon key when not — so unauthenticated pages
// still work and RLS kicks in only for authenticated queries.
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    try {
      const token = await getSupabaseToken();
      if (token) return token;
    } catch {
      // Fall through to anon key
    }
    // No user or exchange failed — return anon key so requests don't get 401
    return supabaseAnonKey;
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'alteon-web-app',
    },
  },
});

export default supabase;
