// src/lib/supabaseAdmin.ts
// DEPRECATED: admin impersonation now uses a real Supabase session swap
// (see admin-impersonate edge function + ImpersonationContext). The
// service-role key must NEVER ship in the browser bundle, so this stub
// intentionally exports null and references no service-role env var.
import type { SupabaseClient } from '@supabase/supabase-js';

export const supabaseAdmin: SupabaseClient | null = null;
