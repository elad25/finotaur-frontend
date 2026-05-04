// Legacy import path — re-exports from the canonical client to prevent
// "Multiple GoTrueClient instances detected" warnings caused by two
// createClient() calls sharing the same storageKey.
//
// Canonical: @/lib/supabase
export {
  supabase,
  supabaseCache,
  cachedQuery,
} from '@/lib/supabase';
export type { Trade, Strategy, Database } from '@/lib/supabase';

import { supabase } from '@/lib/supabase';
export default supabase;
