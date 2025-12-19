// src/lib/supabaseAdmin.ts - FIXED VERSION

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// ⚠️ Only create admin client in development
// In production, admin operations should use Edge Functions
const isDev = import.meta.env.DEV;

export const supabaseAdmin: SupabaseClient | null = (() => {
  // 🔒 SECURITY: Never expose service role key in production browser
  if (!isDev) {
    // Silent in production - no errors, just null
    return null;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    if (isDev) {
      console.warn('⚠️ Admin client not available (missing service role key) - impersonation disabled');
    }
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
})();

// Log only in dev
if (isDev && supabaseAdmin) {
  console.log('✅ Admin client initialized (DEV only)');
}