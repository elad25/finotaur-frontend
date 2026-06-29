// src/features/automation/hooks/useAgentAccountSnapshots.ts
// ─────────────────────────────────────────────────────────────────────────────
// Live per-account telemetry from the NT8 desktop agent, stored in
// automation_account_snapshots (upserted by the agent every ~12 s).
// RLS: SELECT scoped to auth.uid() = user_id.
//
// Follows the exact pattern of useCopierRoutes.ts:
//   - supabase client from @/lib/supabase
//   - useTimedQuery + useEffectiveUser
//   - query key: ['automation', 'agent_account_snapshots', userId]
//   - no mutations — this is read-only telemetry
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useTimedQuery } from '@/hooks/useTimedQuery';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

// ── DB row shape (mirrors the table columns exactly) ──────────────────────────

interface AgentPositionEntry {
  symbol:    string;
  qty:       number;
  isLong:    boolean;
  avgPrice:  number;
  openPnl:   number;
}

interface AgentAccountSnapshotRow {
  id:            string;
  user_id:       string;
  device_id:     string;
  account_name:  string;
  env:           string;
  balance:       number;
  day_pnl:       number;
  open_pnl:      number;
  positions:     AgentPositionEntry[] | null;
  captured_at:   string;
  updated_at:    string;
}

// ── Normalized shape exposed to consumers ────────────────────────────────────

export interface AgentAccountSnapshot {
  /** Original account_name from the row — useful for debugging. */
  accountName: string;
  /** Account balance (numeric). */
  balance:     number;
  /** Day P&L (realized for the session). */
  dayPnl:      number;
  /** Open (unrealized) P&L. */
  openPnl:     number;
  /** Live positions array (may be empty). */
  positions:   AgentPositionEntry[];
  /** Sum of absolute quantities across all open positions. */
  qty:         number;
  /** ISO timestamp the agent captured this snapshot. */
  capturedAt:  string;
  /**
   * true when captured_at is within the last 30 seconds —
   * used as the online/fresh indicator for each account row.
   */
  online:      boolean;
}

// ── Lookup type keyed by normalised account name ──────────────────────────────

export type AgentSnapshotMap = Map<string, AgentAccountSnapshot>;

// ── Key normalisation helper (case-insensitive, trimmed) ─────────────────────

function normaliseKey(name: string): string {
  return name.trim().toLowerCase();
}

// ── Query constants ───────────────────────────────────────────────────────────

const queryKey = (userId: string) =>
  ['automation', 'agent_account_snapshots', userId] as const;

const ONLINE_THRESHOLD_MS = 30_000; // 30 s

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchSnapshots(userId: string): Promise<AgentAccountSnapshotRow[]> {
  const { data, error } = await supabase
    .from('automation_account_snapshots')
    .select('*')
    .eq('user_id', userId);

  if (error?.code === '42P01') return []; // table not yet migrated — defensive
  if (error) throw error;
  return (data ?? []) as AgentAccountSnapshotRow[];
}

// ── Normalise a raw row into the consumer-facing shape ────────────────────────

function normaliseRow(row: AgentAccountSnapshotRow): AgentAccountSnapshot {
  const positions = row.positions ?? [];
  const qty = positions.reduce((sum, p) => sum + Math.abs(p.qty), 0);
  const ageMs = Date.now() - new Date(row.captured_at).getTime();

  return {
    accountName: row.account_name,
    balance:     row.balance,
    dayPnl:      row.day_pnl,
    openPnl:     row.open_pnl,
    positions,
    qty,
    capturedAt:  row.captured_at,
    online:      ageMs < ONLINE_THRESHOLD_MS,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAgentAccountSnapshots() {
  const { id: userId } = useEffectiveUser();

  const { data: rawRows = [], isLoading, isError, error, refetch } = useTimedQuery({
    queryKey:        queryKey(userId ?? ''),
    queryFn:         () => fetchSnapshots(userId!),
    enabled:         !!userId,
    refetchInterval: 4_000,   // live polling — agent upserts every ~12 s
    staleTime:       0,       // always treat as stale to allow polling to surface updates
    gcTime:          5 * 60_000,
  });

  /**
   * All snapshots as a normalised array, newest-captured first
   * (order mirrors the table's natural upsert order — no explicit sort needed
   * in the UI since the dashboard groups by account name, not by time).
   */
  const snapshots: AgentAccountSnapshot[] = useMemo(
    () => rawRows.map(normaliseRow),
    [rawRows],
  );

  /**
   * Lookup map keyed by lowercased/trimmed account_name.
   * Use snapshotByAccountName(name) for safe O(1) matching in the table rows.
   */
  const byAccountName: AgentSnapshotMap = useMemo(() => {
    const map = new Map<string, AgentAccountSnapshot>();
    for (const snap of snapshots) {
      map.set(normaliseKey(snap.accountName), snap);
    }
    return map;
  }, [snapshots]);

  /**
   * Look up a snapshot for a given broker account name.
   * Returns null when no agent snapshot exists for that account yet.
   */
  function snapshotByAccountName(name: string): AgentAccountSnapshot | null {
    return byAccountName.get(normaliseKey(name)) ?? null;
  }

  return {
    /** All snapshots as a flat array. */
    snapshots,
    /** Raw lookup map — prefer snapshotByAccountName() for safety. */
    byAccountName,
    /** O(1) lookup by account name (case-insensitive, trimmed). Returns null if not found. */
    snapshotByAccountName,
    isLoading,
    isError,
    error,
    refetch,
  };
}
