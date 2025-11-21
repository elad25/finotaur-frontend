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

// 🔍 DEBUG - Check if key exists
console.log('🔍 Service Role Key check:', {
  exists: !!supabaseServiceKey,
  firstChars: supabaseServiceKey?.substring(0, 15) + '...',
  length: supabaseServiceKey?.length,
});

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
          // 🔥 Explicitly set Authorization header
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
      },
    })
  : null;

if (supabaseAdmin) {
  console.log('✅ 🔑 Admin client initialized successfully');
  console.log('✅ 🔓 Service role bypasses Row Level Security');
  console.log('✅ 📡 Ready for impersonation queries');
} else {
  console.error('❌ Admin client FAILED to initialize');
  console.error('📝 Add to .env: VITE_SUPABASE_SERVICE_ROLE_KEY=your-key');
  console.error('👉 Get it from: Supabase Dashboard → Settings → API → service_role');
}

// 🔍 Test function to verify admin access
export async function testAdminAccess() {
  if (!supabaseAdmin) {
    console.error('❌ No admin client available');
    return false;
  }

  try {
    // Try to query profiles (should bypass RLS)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
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

// 🔥 Auto-test on load (remove in production)
if (supabaseAdmin && import.meta.env.DEV) {
  setTimeout(() => {
    testAdminAccess().then(success => {
      if (success) {
        console.log('🎉 Admin client is working correctly!');
      } else {
        console.error('⚠️ Admin client may not be configured properly');
        console.error('💡 Check that VITE_SUPABASE_SERVICE_ROLE_KEY is correct');
      }
    });
  }, 1000);
}