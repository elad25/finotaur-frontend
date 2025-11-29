// ================================================
// ADMIN SUPABASE CLIENT - FOR IMPERSONATION ONLY
// File: src/lib/supabaseAdmin.ts
// ⚠️ This bypasses RLS - use only for admin operations
// 🔥 FIXED: Proper service_role authentication
// ================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// 🔥 Support both variable names for flexibility
const supabaseServiceKey = 
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL in .env');
}

// 🔥 CRITICAL FIX: Create admin client with proper configuration
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
      },
    })
  : null;

if (supabaseAdmin) {
  console.log('✅ Admin client initialized successfully');
} else {
  console.error('❌ Admin client FAILED to initialize');
  console.error('📝 Add to .env: VITE_SUPABASE_SERVICE_ROLE_KEY=your-key');
}

// 🔍 Test function to verify admin access (call manually when needed)
export async function testAdminAccess(): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('❌ No admin client available');
    return false;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Admin access test FAILED:', error);
      return false;
    }

    console.log('✅ Admin access test PASSED');
    return true;
  } catch (err) {
    console.error('❌ Admin access test ERROR:', err);
    return false;
  }
}