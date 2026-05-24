// src/hooks/brokers/useIBConnection.ts
// React hook for Interactive Brokers connection state.
// Mirrors the pattern in useBrokerConnections.ts (TanStack Query + Supabase realtime).

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { startIBOAuth, syncIBNow, disconnectIB } from '@/lib/brokers/ib/ib-client';
import type { BrokerConnection } from '@/lib/brokers/types';

// ─── Public interface ─────────────────────────────────────────────────────────

export interface IBConnectionState {
  isConnected: boolean;
  status: 'connected' | 'disconnected' | 'pending' | 'error' | null;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
  accountId: string | null;
  loading: boolean;
  error: string | null;
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
  const { data, error } = await supabase
    .from('broker_connections')
    .select(SELECT_COLS)
    .eq('user_id', userId)
    .eq('broker', 'interactive_brokers')
    .maybeSingle();

  if (error?.code === '42P01') return null; // table missing — defensive (fresh dev DB)
  if (error) throw error;
  return data as BrokerConnection | null;
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
    startOAuth,
    syncNow,
    disconnect,
  };
}
