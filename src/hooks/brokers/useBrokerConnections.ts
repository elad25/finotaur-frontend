// src/hooks/brokers/useBrokerConnections.ts
// ─────────────────────────────────────────────────────────────────────
// Generic hook over public.broker_connections (post-F1.A architecture).
// Tradovate now lives here (was tradovate_credentials). IBKR will follow
// after J2. Other brokers (alpaca, mt4/5, etc.) plug in by reusing the
// same data layer when their connect flows ship.
//
// Usage in BrokerConnectionModal (Phase 10):
//   const { connections, isLoading, disconnect, reconnect, syncNow } =
//     useBrokerConnections({ active: true });   // Active section
//   const { connections: inactive } =
//     useBrokerConnections({ active: false });  // Re-auth section
// ─────────────────────────────────────────────────────────────────────

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';
import type { BrokerConnection, BrokerName } from '@/lib/brokers/types';

interface UseBrokerConnectionsOptions {
  /** When `true`, returns only `is_active=true` rows. When `false`, only `is_active=false`. Omit for both. */
  active?: boolean;
  /** Filter by broker. Omit for all brokers. */
  broker?: BrokerName;
}

const SELECT_COLS =
  'id,user_id,broker,status,is_active,account_id,account_name,environment,connection_name,' +
  'connected_at,disconnected_at,last_sync_at,last_successful_sync_at,error_count,last_error,' +
  'last_error_at,token_expires_at,connection_data,created_at,updated_at';

const queryKey = (userId: string, opts: UseBrokerConnectionsOptions) =>
  ['broker_connections', userId, opts.active ?? 'all', opts.broker ?? 'all'] as const;

async function fetchConnections(
  userId: string,
  opts: UseBrokerConnectionsOptions,
): Promise<BrokerConnection[]> {
  let q = supabase
    .from('broker_connections')
    .select(SELECT_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (opts.active !== undefined) q = q.eq('is_active', opts.active);
  if (opts.broker) q = q.eq('broker', opts.broker);

  const { data, error } = await q;
  if (error?.code === '42P01') return []; // table missing — defensive (e.g. fresh dev DB)
  if (error) throw error;
  return (data ?? []) as BrokerConnection[];
}

export function useBrokerConnections(opts: UseBrokerConnectionsOptions = {}) {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  const { data: connections = [], isLoading, isError, error } = useQuery({
    queryKey: queryKey(userId ?? '', opts),
    queryFn: () => fetchConnections(userId!, opts),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  /** Invalidate every broker_connections variant for the current user. */
  const invalidate = useCallback(() => {
    if (!userId) return;
    qc.invalidateQueries({ queryKey: ['broker_connections', userId] });
  }, [userId, qc]);

  /**
   * Soft-disconnect: flip is_active=false + status=disconnected.
   * The row moves to the "Re-authenticate Required" section in the Modal,
   * and the user can re-auth via OAuth without losing portfolio history.
   * Use `remove()` for hard delete.
   */
  const disconnect = useCallback(
    async (id: string) => {
      if (!userId) return { success: false, error: 'Not authenticated' };
      const { error: e } = await supabase
        .from('broker_connections')
        .update({
          is_active: false,
          status: 'disconnected',
          disconnected_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId);
      if (e) {
        toast.error('Failed to disconnect');
        return { success: false, error: e.message };
      }
      invalidate();
      toast.success('Connection disconnected');
      return { success: true };
    },
    [userId, invalidate],
  );

  /**
   * Hard-delete: removes the row entirely. CASCADEs to broker_accounts /
   * broker_raw_data / broker_sync_logs (all empty in F1.A). trades.broker_connection_id
   * is SET NULL (no impact in F1.A — no trades currently link to broker_connections).
   * Vault secret is NOT cleaned up here — accumulates as orphaned. Tracked for cleanup.
   */
  const remove = useCallback(
    async (id: string) => {
      if (!userId) return { success: false, error: 'Not authenticated' };
      const { error: e } = await supabase
        .from('broker_connections')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (e) {
        toast.error('Failed to remove connection');
        return { success: false, error: e.message };
      }
      invalidate();
      toast.success('Connection removed');
      return { success: true };
    },
    [userId, invalidate],
  );

  /**
   * Re-authenticate via stored Vault credentials (no password re-entry needed).
   * Currently only Tradovate supports this — invokes tradovate-auth with mode=reconnect.
   * Future: branch by `connection.broker`.
   */
  const reconnect = useCallback(
    async (id: string) => {
      if (!userId) return { success: false, error: 'Not authenticated' };
      const conn = connections.find((c) => c.id === id);
      if (!conn) return { success: false, error: 'Connection not found' };

      if (conn.broker !== 'tradovate') {
        toast.error(`Reconnect not yet implemented for ${conn.broker}`);
        return { success: false, error: `Reconnect not implemented for ${conn.broker}` };
      }

      const { data, error: e } = await supabase.functions.invoke('tradovate-auth', {
        body: { mode: 'reconnect', credentialId: id, userId },
      });
      if (e) {
        toast.error(e.message || 'Reconnect failed');
        return { success: false, error: e.message };
      }
      // OQ-87: edge function signals when the vault entry is missing and a
      // fresh credential entry is required. The caller (Overview.tsx) reacts
      // by opening the AddBrokerPopup so the user can re-enter username +
      // password; mode='login' then upserts on the same broker_connections
      // row via the (user_id, broker, account_id) unique constraint.
      const payload = (data ?? {}) as {
        requires_credentials?: boolean;
        environment?: string | null;
        error?: string;
      };
      if (payload.requires_credentials) {
        invalidate();
        return {
          success: false,
          requires_credentials: true,
          environment: payload.environment ?? conn.environment ?? null,
          error: payload.error ?? 'vault_creds_missing',
        };
      }
      invalidate();
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Reconnected — syncing trades...');
      return { success: true };
    },
    [userId, connections, invalidate, qc],
  );

  /**
   * Manual sync now. Currently only Tradovate.
   */
  const syncNow = useCallback(
    async (id: string) => {
      if (!userId) return { success: false, error: 'Not authenticated' };
      const conn = connections.find((c) => c.id === id);
      if (!conn) return { success: false, error: 'Connection not found' };

      if (conn.broker !== 'tradovate') {
        toast.error(`Sync not yet implemented for ${conn.broker}`);
        return { success: false, error: `Sync not implemented for ${conn.broker}` };
      }

      const { data, error: e } = await supabase.functions.invoke('tradovate-sync', {
        body: { userId, environment: conn.environment, mode: 'manual' },
      });
      if (e) {
        toast.error('Sync failed — network or server error');
        return { success: false, error: e.message };
      }

      // Always invalidate — broker_connections may have flipped to is_active=false
      // inside the edge function (e.g. token expired path), regardless of HTTP status.
      invalidate();
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });

      // L4 (F2): inspect business-level result. HTTP 200 ≠ business success —
      // tradovate-sync returns {synced, totalInserted, totalErrors} and a non-zero
      // totalErrors means the function caught an exception (e.g. TOKEN_EXPIRED).
      // synced === 0 means the credentials query found 0 active broker_connections rows
      // for this user+environment — i.e. the connection was deactivated (is_active=false)
      // server-side without the frontend cache catching up. Treat as silent-fail and
      // prompt for reconnect rather than the misleading "no new trades" success toast.
      const body = (data ?? {}) as {
        totalErrors?: number;
        totalInserted?: number;
        synced?: number;
      };
      const totalErrors = body.totalErrors ?? 0;
      const totalInserted = body.totalInserted ?? 0;
      const synced = body.synced ?? 0;

      if (totalErrors > 0) {
        toast.error('Sync failed — please reconnect your broker.');
        return { success: false, error: 'Connection requires re-authentication' };
      }
      if (synced === 0) {
        toast.error('Sync failed — broker connection not active. Please reconnect.');
        return { success: false, error: 'No active broker connection found' };
      }
      if (totalInserted > 0) {
        toast.success(`Sync complete — ${totalInserted} new trade${totalInserted === 1 ? '' : 's'} imported`);
      } else {
        toast.success('Sync complete — no new trades');
      }
      return { success: true };
    },
    [userId, connections, invalidate, qc],
  );

  // ── Tier 2a: Supabase Realtime subscription ──────────────────────────
  // Immediately invalidates the cache when any UPDATE lands on
  // broker_connections for this user — no polling lag.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`broker-connections-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'broker_connections',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['broker_connections', userId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  // Tier 3a auto-reconnect removed: the server (whop-webhook + retry queue)
  // owns reconnection now. The "Reconnect now" button in BrokerConnectionsPopover
  // is the only way to trigger a manual reconnect from the frontend.

  return {
    connections,
    isLoading,
    isError,
    error,
    invalidate,
    disconnect,
    remove,
    reconnect,
    syncNow,
  };
}
