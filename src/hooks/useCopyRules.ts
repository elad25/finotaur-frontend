// src/hooks/useCopyRules.ts
// ═══════════════════════════════════════════════════════════════
// Adapts the local agent's automation_copier_routes + targets
// tables to the CopyRule interface expected by CopyTradingDashboard.
//
// INTERNAL CHANGE: data layer swapped from portfolio_copy_rules
// to automation_copier_routes/targets via useCopierRoutes.
// EXTERNAL INTERFACE: unchanged — CopyTradingDashboard continues
// to receive { rules, isLoading, error, updateRule, isUpdating,
// createRule, isCreating } with the same CopyRule shape.
// ═══════════════════════════════════════════════════════════════

import { useMemo, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCopierRoutes } from '@/features/automation/hooks/useCopierRoutes';
import { usePortfolios } from '@/hooks/usePortfolios';
import type { CopierRouteTargetInput } from '@/features/automation/lib/automationTypes';

// ─── Public type (unchanged) ──────────────────────────────────
export interface CopyRule {
  id:                   string;
  user_id:              string;
  source_portfolio_id:  string;
  target_portfolio_id:  string;
  ratio:                number;
  is_active:            boolean;
  copy_opens:           boolean;
  copy_closes:          boolean;
  max_contracts:        number | null;
  max_daily_loss_usd:   number | null;
  max_position_size:    number | null;
  kill_switch_active:   boolean;
  cross_to_micro:       boolean;
  created_at:           string;
}

// ─── Internal helper: portfolio↔account maps ──────────────────

interface PortfolioAccountEntry {
  portfolioId: string;
  accountId:   string; // String(tradovate_account_id)
  name:        string;
  broker:      string;
  environment: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────

export function useCopyRules() {
  const { routes, isLoading, error, upsertRoute, deleteRoute } = useCopierRoutes();
  const { tradovatePortfolios } = usePortfolios();

  // isPending trackers for create/update (useCopierRoutes exposes plain
  // async callbacks, not useMutation — we track pending locally).
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // ── Build portfolio↔account maps ────────────────────────────
  // Only tradovate portfolios have a tradovate_account_id and are routable.
  const portfolioByAccountId = useMemo<Map<string, PortfolioAccountEntry>>(() => {
    const map = new Map<string, PortfolioAccountEntry>();
    for (const p of tradovatePortfolios) {
      if (p.tradovate_account_id == null) continue;
      const accountId = String(p.tradovate_account_id);
      map.set(accountId, {
        portfolioId: p.id,
        accountId,
        name:        p.name,
        broker:      'tradovate',
        environment: p.environment ?? null,
      });
    }
    return map;
  }, [tradovatePortfolios]);

  const portfolioById = useMemo<Map<string, PortfolioAccountEntry>>(() => {
    const map = new Map<string, PortfolioAccountEntry>();
    for (const entry of portfolioByAccountId.values()) {
      map.set(entry.portfolioId, entry);
    }
    return map;
  }, [portfolioByAccountId]);

  // ── rules: flatten routes × targets → CopyRule[] ────────────
  const rules = useMemo<CopyRule[]>(() => {
    const result: CopyRule[] = [];
    for (const route of routes) {
      const sourceEntry = portfolioByAccountId.get(route.source_account_id);
      if (!sourceEntry) continue; // no matching portfolio → skip

      const targets = route.automation_copier_route_targets ?? [];
      for (const target of targets) {
        const targetEntry = portfolioByAccountId.get(target.destination_account_id);
        if (!targetEntry) continue; // no matching portfolio → skip

        result.push({
          // id = target row id — this is what updateRule acts on
          id:                  target.id,
          user_id:             '',           // not available from agent model
          source_portfolio_id: sourceEntry.portfolioId,
          target_portfolio_id: targetEntry.portfolioId,
          ratio:               target.scale_ratio,
          is_active:           route.is_active && target.is_active,
          copy_opens:          true,         // default — route-level field
          copy_closes:         true,         // default — route-level field
          max_contracts:       target.max_contracts,
          max_daily_loss_usd:  null,         // no equivalent in agent model
          max_position_size:   null,         // no equivalent in agent model
          kill_switch_active:  false,        // no equivalent in agent model
          cross_to_micro:      false,        // no equivalent in agent model
          created_at:          '',           // CopierRoute has no created_at column
        });
      }
    }
    return result;
  }, [routes, portfolioByAccountId]);

  // ── Stable ref to avoid stale-closure in callbacks ───────────
  const routesRef  = useRef(routes);
  routesRef.current = routes;
  const portfolioByIdRef = useRef(portfolioById);
  portfolioByIdRef.current = portfolioById;
  const portfolioByAccountIdRef = useRef(portfolioByAccountId);
  portfolioByAccountIdRef.current = portfolioByAccountId;

  // ── createRule ────────────────────────────────────────────────
  const createRule = useCallback(async (input: {
    source_portfolio_id: string;
    target_portfolio_id: string;
    ratio?:              number;
    is_active?:          boolean;
    cross_to_micro?:     boolean;
  }) => {
    const sourceEntry = portfolioByIdRef.current.get(input.source_portfolio_id);
    const targetEntry = portfolioByIdRef.current.get(input.target_portfolio_id);

    if (!sourceEntry || !targetEntry) {
      toast.error('Failed to create copy rule: portfolio not found');
      return;
    }

    const ratio    = input.ratio    ?? 1;
    const isActive = input.is_active ?? true;

    const newTarget: CopierRouteTargetInput = {
      destination_account_id:   targetEntry.accountId,
      destination_account_name: targetEntry.name,
      destination_broker:       targetEntry.broker,
      destination_environment:  targetEntry.environment,
      scale_ratio:              ratio,
      max_contracts:            null,
      is_active:                isActive,
    };

    // Find existing route for this source account
    const existingRoute = routesRef.current.find(
      (r) => r.source_account_id === sourceEntry.accountId,
    );

    const sourceAccount = {
      account_id:   sourceEntry.accountId,
      account_name: sourceEntry.name,
      broker:        sourceEntry.broker,
      environment:   sourceEntry.environment,
    };

    setIsCreating(true);
    try {
      if (existingRoute) {
        // Merge: keep existing targets, add the new one (skip if already present)
        const existingTargets = (existingRoute.automation_copier_route_targets ?? []);
        const alreadyPresent = existingTargets.some(
          (t) => t.destination_account_id === targetEntry.accountId,
        );
        const targets: CopierRouteTargetInput[] = [
          ...existingTargets.map((t) => ({
            destination_account_id:   t.destination_account_id,
            destination_account_name: t.destination_account_name,
            destination_broker:       t.destination_broker,
            destination_environment:  t.destination_environment,
            scale_ratio:              t.scale_ratio,
            max_contracts:            t.max_contracts,
            is_active:                t.is_active,
          })),
          ...(alreadyPresent ? [] : [newTarget]),
        ];

        await upsertRoute({
          routeId:      existingRoute.id,
          sourceAccount,
          label:        existingRoute.label ?? sourceEntry.name,
          symbolFilter: existingRoute.symbol_filter ?? [],
          copyOpens:    true,
          copyCloses:   true,
          reverse:      false,
          isActive:     true,
          targets,
        });
      } else {
        // Create brand-new route with just this target
        await upsertRoute({
          sourceAccount,
          label:        sourceEntry.name,
          symbolFilter: [],
          copyOpens:    true,
          copyCloses:   true,
          reverse:      false,
          isActive:     true,
          targets:      [newTarget],
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create copy rule';
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  }, [upsertRoute]);

  // ── updateRule ────────────────────────────────────────────────
  const updateRule = useCallback(async (input: {
    id:    string; // target.id
    patch: Partial<CopyRule>;
  }) => {
    // Find the route and target that owns this target id
    const allRoutes = routesRef.current;
    let foundRoute: typeof allRoutes[number] | undefined;
    let foundTargetIdx = -1;

    for (const route of allRoutes) {
      const targets = route.automation_copier_route_targets ?? [];
      const idx = targets.findIndex((t) => t.id === input.id);
      if (idx !== -1) {
        foundRoute     = route;
        foundTargetIdx = idx;
        break;
      }
    }

    if (!foundRoute || foundTargetIdx === -1) {
      toast.error('Failed to update copy rule: rule not found');
      return;
    }

    const patch       = input.patch;
    const existingTargets = foundRoute.automation_copier_route_targets ?? [];
    const targetRow   = existingTargets[foundTargetIdx];

    // is_active:false → unfollow: remove this target from the route
    if ('is_active' in patch && patch.is_active === false) {
      const remainingTargets = existingTargets.filter((_, i) => i !== foundTargetIdx);

      setIsUpdating(true);
      try {
        if (remainingTargets.length === 0) {
          // Last target — delete the whole route
          await deleteRoute(foundRoute.id);
        } else {
          // Remove just this target, keep the route alive
          const sourceEntry = portfolioByAccountIdRef.current.get(foundRoute.source_account_id);
          await upsertRoute({
            routeId:      foundRoute.id,
            sourceAccount: {
              account_id:   foundRoute.source_account_id,
              account_name: foundRoute.source_account_name,
              broker:        foundRoute.source_broker,
              environment:   foundRoute.source_environment,
            },
            label:        foundRoute.label ?? (sourceEntry?.name ?? foundRoute.source_account_name),
            symbolFilter: foundRoute.symbol_filter ?? [],
            copyOpens:    foundRoute.copy_opens,
            copyCloses:   foundRoute.copy_closes,
            reverse:      foundRoute.reverse,
            isActive:     foundRoute.is_active,
            targets:      remainingTargets.map((t) => ({
              destination_account_id:   t.destination_account_id,
              destination_account_name: t.destination_account_name,
              destination_broker:       t.destination_broker,
              destination_environment:  t.destination_environment,
              scale_ratio:              t.scale_ratio,
              max_contracts:            t.max_contracts,
              is_active:                t.is_active,
            })),
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update copy rule';
        toast.error(msg);
      } finally {
        setIsUpdating(false);
      }
      return;
    }

    // All other patches: apply to the target and re-upsert
    const updatedTargets: CopierRouteTargetInput[] = existingTargets.map((t, i) => {
      if (i !== foundTargetIdx) {
        return {
          destination_account_id:   t.destination_account_id,
          destination_account_name: t.destination_account_name,
          destination_broker:       t.destination_broker,
          destination_environment:  t.destination_environment,
          scale_ratio:              t.scale_ratio,
          max_contracts:            t.max_contracts,
          is_active:                t.is_active,
        };
      }
      return {
        destination_account_id:   targetRow.destination_account_id,
        destination_account_name: targetRow.destination_account_name,
        destination_broker:       targetRow.destination_broker,
        destination_environment:  targetRow.destination_environment,
        scale_ratio:              patch.ratio        ?? targetRow.scale_ratio,
        max_contracts:            patch.max_contracts ?? targetRow.max_contracts,
        is_active:                patch.is_active    ?? targetRow.is_active,
      };
    });

    setIsUpdating(true);
    try {
      const sourceEntry = portfolioByAccountIdRef.current.get(foundRoute.source_account_id);
      await upsertRoute({
        routeId:      foundRoute.id,
        sourceAccount: {
          account_id:   foundRoute.source_account_id,
          account_name: foundRoute.source_account_name,
          broker:        foundRoute.source_broker,
          environment:   foundRoute.source_environment,
        },
        label:        foundRoute.label ?? (sourceEntry?.name ?? foundRoute.source_account_name),
        symbolFilter: foundRoute.symbol_filter ?? [],
        copyOpens:    foundRoute.copy_opens,
        copyCloses:   foundRoute.copy_closes,
        reverse:      foundRoute.reverse,
        isActive:     foundRoute.is_active,
        targets:      updatedTargets,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update copy rule';
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  }, [upsertRoute, deleteRoute]);

  return {
    rules,
    isLoading,
    error,
    updateRule,
    isUpdating,
    createRule,
    isCreating,
  };
}
