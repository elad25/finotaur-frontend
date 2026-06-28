// src/features/automation/hooks/useAgentAccountSnapshots.ts
// ─────────────────────────────────────────────────────────────────────────────
// Polls `automation_account_snapshots` — the table the NT8 desktop agent
// writes every ~12 s — and exposes a case-insensitive name-based lookup so
// the CopyTradingDashboard can hydrate live balance/PnL/position columns.
//
// Conventions follow useCopierRoutes.ts exactly:
//   - useTimedQuery for timeout-protected polling
//   - useEffectiveUser for auth/impersonation awareness
//   - missing-table guard (error.code === '42P01')
//   - queryKey shape: ['automation', '<table>', userId]
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { useTimedQuery } from '@/hooks/useTimedQuery';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

// ── DB row shape (mirrors automation_account_snapshots columns) ───────────────

interface SnapshotRow {
  id: string;
  user_id: string;
  device_id: string;
  account_name: string;
  env: string | null;
  balance: number | null;
  day_pnl: number | null;
  open_pnl: number | null;
  /** Array of { symbol, qty, isLong, avgPrice, openPnl } from the agent */
  positions: AgentPosition[] | null;
  captured_at: string;
  updated_at: string;
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface AgentPosition {
  symbol: string;
  qty: number;
  isLong: boolean;
  avgPrice: number;
  openPnl: number;
}

/** Normalised snapshot ready for the dashboard to consume. */
export interface AgentAccountSnapshot {
  /** Matches automation_account_snapshots.account_name */
  accountName: string;
  /** 'live' | 'demo' or whatever the agent sends */
  env: string | null;
  balance: number | null;
  dayPnl: number | null;
  openPnl: number | null;
  /** Full position list from the agent. */
  positions: AgentPosition[];
  /**
   * Sum of absolute quantities across all positions.
   * Useful as the dashboard "Qty" column when no per-symbol filter is applied.
   */
  qty: number;
  capturedAt: Date;
  /**
   * True when the snapshot was written within the last 30 s — i.e. the agent
   * is actively connected and reporting.
   */
  online: boolean;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const ONLINE_THRESHOLD_MS = 30_000;

const queryKey = (userId: string) =>
  ['automation', 'automation_account_snapshots', userId] as const;

function normalizeRow(row: SnapshotRow): AgentAccountSnapshot {
  const positions: AgentPosition[] = Array.isArray(row.positions) ? row.positions : [];
  const capturedAt = new Date(row.captured_at);
  return {
    accountName: row.account_name,
    env:         row.env,
    balance:     row.balance,
    dayPnl:      row.day_pnl,
    openPnl:     row.open_pnl,
    positions,
    qty:         positions.reduce((sum, p) => sum + Math.abs(p.qty), 0),
    capturedAt,
    online:      Date.now() - capturedAt.getTime() < ONLINE_THRESHOLD_MS,
  };
}

async function fetchSnapshots(userId: string): Promise<AgentAccountSnapshot[]> {
  const { data, error } = await supabase
    .from('automation_account_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('account_name', { ascending: true });

  // Table doesn't exist yet (pre-migration environment) — degrade gracefully.
  if (error?.code === '42P01') return [];
  if (error) throw error;
  return ((data ?? []) as SnapshotRow[]).map(normalizeRow);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseAgentAccountSnapshotsResult {
  /** All snapshots for the current user, one per (device_id, account_name). */
  snapshots: AgentAccountSnapshot[];
  isLoading: boolean;
  isError: boolean;
  /**
   * Case-insensitive / trimmed lookup by account name.
   * Returns the first matching snapshot, or undefined if none.
   */
  snapshotByAccountName: (name: string) => AgentAccountSnapshot | undefined;
}

export function useAgentAccountSnapshots(): UseAgentAccountSnapshotsResult {
  const { id: userId } = useEffectiveUser();

  const { data: snapshots = [], isLoading, isError } = useTimedQuery({
    queryKey:       queryKey(userId ?? ''),
    queryFn:        () => fetchSnapshots(userId!),
    enabled:        !!userId,
    // Poll every 4 s so the live dot transitions within a few seconds of the
    // agent coming online or going silent.
    refetchInterval: 4_000,
    staleTime:      4_000,
    gcTime:         2 * 60 * 1000,
  });

  const snapshotByAccountName = useCallback(
    (name: string): AgentAccountSnapshot | undefined => {
      const needle = name.trim().toLowerCase();
      return snapshots.find((s) => s.accountName.trim().toLowerCase() === needle);
    },
    [snapshots],
  );

  return { snapshots, isLoading, isError, snapshotByAccountName };
}
