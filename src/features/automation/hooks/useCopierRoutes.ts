// src/features/automation/hooks/useCopierRoutes.ts
// ─────────────────────────────────────────────────────────────────────────────
// CRUD for automation_copier_routes + targets.
// Read: direct select with nested automation_copier_route_targets(*).
// Write: via RPCs automation_upsert_copier_route / automation_delete_copier_route.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTimedQuery } from '@/hooks/useTimedQuery';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';
import type { CopierRoute, CopierRouteTargetInput } from '../lib/automationTypes';

const queryKey = (userId: string) => ['automation', 'copier_routes', userId] as const;

async function fetchRoutes(userId: string): Promise<CopierRoute[]> {
  const { data, error } = await supabase
    .from('automation_copier_routes')
    .select('*, automation_copier_route_targets(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error?.code === '42P01') return [];
  if (error) throw error;
  return (data ?? []) as CopierRoute[];
}

export function useCopierRoutes() {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  const { data: routes = [], isLoading, isError, error, refetch } = useTimedQuery({
    queryKey: queryKey(userId ?? ''),
    queryFn: () => fetchRoutes(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const invalidate = useCallback(() => {
    if (!userId) return;
    qc.invalidateQueries({ queryKey: ['automation', 'copier_routes', userId] });
  }, [userId, qc]);

  /**
   * Upsert a copier route and its targets via RPC.
   * Pass `routeId` to update an existing route; omit (or pass undefined) to create.
   *
   * @param routeId            Existing route UUID, or undefined to create.
   * @param sourceAccountId    Tradovate account id as text.
   * @param sourceAccountName  Portfolio display name (NT8 agent matches by name).
   * @param sourceBroker       Broker string, e.g. 'tradovate'.
   * @param sourceEnvironment  'live' | 'demo' | null.
   * @param label              Human-readable route name.
   * @param symbolFilter       Array of symbols to copy (empty = all).
   * @param copyOpens          Copy position opens.
   * @param copyCloses         Copy position closes.
   * @param reverse            Reverse the trade direction.
   * @param isActive           Whether the route is live.
   * @param targets            Array of destination targets.
   */
  const upsertRoute = useCallback(
    async (params: {
      routeId?: string;
      sourceAccountId: string;
      sourceAccountName: string;
      sourceBroker: string | null;
      sourceEnvironment: string | null;
      label: string;
      symbolFilter: string[];
      copyOpens: boolean;
      copyCloses: boolean;
      reverse: boolean;
      isActive: boolean;
      targets: CopierRouteTargetInput[];
    }) => {
      if (!userId) return { success: false };

      const { data, error: e } = await supabase.rpc('automation_upsert_copier_route', {
        p_route_id: params.routeId ?? null,
        p_source_account_id: params.sourceAccountId,
        p_source_account_name: params.sourceAccountName,
        p_source_broker: params.sourceBroker ?? null,
        p_source_environment: params.sourceEnvironment ?? null,
        p_label: params.label,
        p_symbol_filter: params.symbolFilter,
        p_copy_opens: params.copyOpens,
        p_copy_closes: params.copyCloses,
        p_reverse: params.reverse,
        p_is_active: params.isActive,
        p_targets: params.targets,
      });

      if (e) {
        toast.error('Failed to save copier route');
        return { success: false, error: e.message };
      }
      invalidate();
      toast.success(params.routeId ? 'Route updated' : 'Route created');
      return { success: true, routeId: data as string };
    },
    [userId, invalidate],
  );

  const deleteRoute = useCallback(
    async (routeId: string) => {
      if (!userId) return { success: false };

      const { error: e } = await supabase.rpc('automation_delete_copier_route', {
        p_route_id: routeId,
      });

      if (e) {
        toast.error('Failed to delete copier route');
        return { success: false, error: e.message };
      }
      invalidate();
      toast.success('Route deleted');
      return { success: true };
    },
    [userId, invalidate],
  );

  return {
    routes,
    isLoading,
    isError,
    error,
    refetch,
    upsertRoute,
    deleteRoute,
    invalidate,
  };
}
