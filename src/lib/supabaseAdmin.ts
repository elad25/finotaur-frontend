// ================================================
// ADMIN SUPABASE CLIENT - FOR IMPERSONATION ONLY
// File: src/lib/supabaseAdmin.ts
// ⚠️ This bypasses RLS - use only for admin operations
// ================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL');
}

// Create admin client only if service key is available
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    })
  : null;

if (supabaseAdmin) {
  console.log('🔑 Admin client initialized successfully');
} else {
  console.warn('⚠️ Admin client not available - missing VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
}