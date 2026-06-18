// src/lib/traderView.ts
// ════════════════════════════════════════════════════════════════════
// Shared wiring helpers for the Trader lens, used by both
// useDashboardData (Overview) and useTradesData (MyTrades) so the
// "burned account" definition is a single source of truth.
// ════════════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetch the set of active broker connection IDs for a user.
 * Trade rows whose broker_connection_id is NOT in this set belong to
 * "burned" (disconnected) accounts and should be excluded from the
 * Trader lens. Manual trades (null broker_connection_id) are always kept.
 *
 * Mirrors the inline fetch in useDashboardData's Trader branch
 * (lines ~758–763) exactly — centralised here so both surfaces stay
 * in sync without duplicating the query.
 */
export async function fetchActiveConnectionIds(
  client: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data } = await client
    .from('broker_connections')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true);
  return new Set((data ?? []).map(c => c.id as string));
}
