// src/hooks/brokers/useIBConnection.ts
// React hook for COPILOT connection state.
// Mirrors the pattern in useBrokerConnections.ts (TanStack Query + Supabase realtime).
//
// NOTE (manual-portfolio generalization): despite the name, this hook now
// resolves to EITHER the user's Interactive Brokers connection OR their
// Manual Portfolio — see copilotSource.ts for the preference rule (IBKR
// wins when both exist). Kept the original hook name / call sites (used
// only within src/pages/app/ai/copilot/**) to avoid an unrelated rename
// sweep; the new `broker` field on the return value lets callers tell the
// two sources apart when needed (e.g. showing an "Update Portfolio" CTA).

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { startIBOAuth, syncIBNow, disconnectIB } from '@/lib/brokers/ib/ib-client';
import type { BrokerConnection } from '@/lib/brokers/types';
import { COPILOT_SOURCE_BROKERS, pickCopilotSource, type CopilotSourceBroker } from './copilotSource';

// ─── Public interface ─────────────────────────────────────────────────────────

export interface IBConnectionState {
  isConnected: boolean;
  status: 'connected' | 'disconnected' | 'pending' | 'error' | null;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
  accountId: string | null;
  loading: boolean;
  error: string | null;
  /** Which COPILOT source is currently active: 'interactive_brokers', 'manual', or null (not connected). */
  broker: CopilotSourceBroker | null;
}

export interface UseIBConnectionReturn extends IBConnectionState {
  startOAuth: (returnTo?: string) => Promise<void>;
  syncNow: () => Promise<{ ok: boolean; error?: string }>;
  disconnect: () => Promise<void>;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

const SELECT_COLS =
  'id,user_id,broker,status,is_active,account_id,last_sync_at,token_expires_at,created_at,updated_at';

async function fetchIBConnection(userId: string): Promise<BrokerConnection | null> {
  // Scoped to both COPILOT-eligible brokers — at most one row per broker
  // (unique index on user_id+broker), so 0-2 rows come back.
  const { data, error } = await supabase
    .from('broker_connections')
    .select(SELECT_COLS)
    .eq('user_id', userId)
    .in('broker', [...COPILOT_SOURCE_BROKERS]);

  if (error?.code === '42P01') return null; // table missing — defensive (fresh dev DB)
  if (error) throw error;
  return pickCopilotSource((data ?? []) as BrokerConnection[]);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIBConnection(): UseIBConnectionReturn {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  const queryKey = ['ib-connection', userId ?? ''] as const;

  const { data: row, isLoading, error: queryError } = useQuery({
    queryKey,
    queryFn: () => fetchIBConnection(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Derived connection state
  const isConnected = row?.is_active === true && row?.status === 'connected';

  // Invalidate all ib-connection queries for this user
  const invalidate = useCallback(() => {
    if (!userId) return;
    qc.invalidateQueries({ queryKey: ['ib-connection', userId] });
  }, [userId, qc]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const startOAuth = useCallback(async (returnTo?: string): Promise<void> => {
    await startIBOAuth(returnTo);
    // startIBOAuth navigates away; code below only runs on failure (caught by caller)
  }, []);

  const syncNow = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const result = await syncIBNow();
    invalidate();
    qc.invalidateQueries({ queryKey: ['trades'] });
    qc.invalidateQueries({ queryKey: ['portfolio'] });
    return result;
  }, [invalidate, qc]);

  const disconnect = useCallback(async (): Promise<void> => {
    await disconnectIB();
    invalidate();
  }, [invalidate]);

  // ── Realtime subscription (mirrors useBrokerConnections.ts) ────────────────
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`ib-connection-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'broker_connections',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['ib-connection', userId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  // ── Derived status ─────────────────────────────────────────────────────────

  // BrokerStatus includes values outside our IBConnectionState union; narrow defensively.
  const narrowStatus = (s: string | undefined | null): IBConnectionState['status'] => {
    if (s === 'connected' || s === 'disconnected' || s === 'pending' || s === 'error') {
      return s;
    }
    return null;
  };

  return {
    isConnected,
    status: row ? narrowStatus(row.status) : null,
    lastSyncAt: row?.last_sync_at ?? null,
    tokenExpiresAt: row?.token_expires_at ?? null,
    accountId: row?.account_id ?? null,
    loading: isLoading,
    error: queryError ? (queryError as Error).message : null,
    broker: isConnected ? (row!.broker as CopilotSourceBroker) : null,
    startOAuth,
    syncNow,
    disconnect,
  };
}
