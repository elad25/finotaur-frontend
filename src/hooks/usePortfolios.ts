// src/hooks/usePortfolios.ts
// ═══════════════════════════════════════════════════════════════
// Loads user portfolios (Tradovate accounts + manual + broker connections).
// Uses React Query for caching — 10k users ready.
// ═══════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { BROKER_CONFIGS } from '@/lib/brokers/types';

export interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  tradovate_account_id: number | null;
  tradovate_account_spec: string | null;
  environment: 'live' | 'demo' | null;
  source: 'manual' | 'tradovate' | 'broker';
  broker_connection_id?: string;
  is_active: boolean;
  created_at: string;
  connection_label: string | null;
  // Risk fields (may be null if not yet set)
  kill_switch_active:      boolean | null;
  max_daily_loss_usd:      number | null;
  max_position_size:       number | null;
  max_contracts_per_trade: number | null;
  // Sprint 4c: hard-stop fields
  max_loss_per_trade_usd:  number | null;
  daily_stop_loss_usd:     number | null;
}

// ── Broker portfolio ID helpers ─────────────────────────────────────────────
/** Returns true when id is a synthetic broker portfolio id (prefix: "broker_"). */
export function isBrokerId(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.startsWith('broker_');
}

/** Extracts the broker_connections UUID from a synthetic broker portfolio id. */
export function brokerConnId(id: string): string {
  return id.slice('broker_'.length);
}

/** Build a human-readable name for a broker_connections row (English only). */
function buildBrokerPortfolioName(c: {
  broker: string;
  connection_name?: string | null;
  account_name?: string | null;
  account_id?: string | null;
}): string {
  if (c.connection_name?.trim()) return c.connection_name.trim();
  if (c.account_name?.trim()) return c.account_name.trim();
  const brokerLabel =
    BROKER_CONFIGS[c.broker as keyof typeof BROKER_CONFIGS]?.displayName ?? c.broker;
  if (c.account_id) return `${brokerLabel} ${c.account_id}`;
  return brokerLabel;
}

// ── Virtual MANUAL portfolio ID — stable, never conflicts with real UUIDs ──
export const MANUAL_PORTFOLIO_ID = 'manual-default';

async function fetchPortfolios(userId: string): Promise<Portfolio[]> {
  // ── 1. Try portfolios table first ──────────────────────────
  const { data, error } = await supabase
    .from('portfolios')
    .select('id,name,description,tradovate_account_id,tradovate_account_spec,environment,source,is_active,created_at,connection_label,kill_switch_active,max_daily_loss_usd,max_position_size,max_contracts_per_trade,max_loss_per_trade_usd,daily_stop_loss_usd')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error && error.code !== '42P01') throw error;

  let portfolios: Portfolio[] = [];

  if (data && data.length > 0) {
    // Enrich missing connection_label from credentials
    const missingLabel = data.some(p => !(p as any).connection_label);
    if (missingLabel) {
      const { data: creds } = await supabase
        .from('tradovate_credentials')
        .select('account_id,connection_label')
        .eq('user_id', userId)
        .not('connection_label', 'is', null);

      const labelMap = new Map((creds ?? []).map(c => [c.account_id, c.connection_label]));
      portfolios = data.map(p => ({
        ...p,
        connection_label: (p as any).connection_label ?? labelMap.get((p as any).tradovate_account_id) ?? null,
      })) as Portfolio[];
    } else {
      portfolios = data as Portfolio[];
    }
  } else {
    // ── 2. Fallback: build virtual portfolios from tradovate_credentials ──
    const { data: creds, error: credsError } = await supabase
      .from('tradovate_credentials')
      .select('id,account_name,connection_label,environment,status,account_id,account_spec')
      .eq('user_id', userId)
      .in('status', ['connected', 'expired', 'error']);

    if (!credsError && creds && creds.length > 0) {
      portfolios = creds.map(c => ({
        id: `trado_${c.id}`,
        name: c.account_name || `Tradovate ${c.environment}`,
        description: null,
        tradovate_account_id: c.account_id ?? null,
        tradovate_account_spec: c.account_spec ?? null,
        environment: (c.environment as 'live' | 'demo') ?? null,
        source: 'tradovate' as const,
        is_active: true,
        created_at: new Date().toISOString(),
        connection_label: c.connection_label ?? null,
        kill_switch_active: null,
        max_daily_loss_usd: null,
        max_position_size: null,
        max_contracts_per_trade: null,
        max_loss_per_trade_usd: null,
        daily_stop_loss_usd: null,
      }));
    }
  }

  // ── 2b. Determine which Tradovate/NinjaTrader environments are still active ──
  // Used to filter out orphaned tradovate-source portfolio rows whose broker
  // connection was disconnected (is_active=false) but whose portfolios row
  // persists (real row, not derived). Read-side filter — no rows deleted.
  const { data: tvConns } = await supabase
    .from('broker_connections')
    .select('environment')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('broker', ['tradovate', 'ninja_trader']);
  const activeTvEnvs = new Set((tvConns ?? []).map(c => c.environment));

  // Apply filter: hide tradovate-source portfolios whose environment has no active connection.
  // manual/broker portfolios are untouched.
  portfolios = portfolios.filter(p =>
    p.source !== 'tradovate' || activeTvEnvs.has(p.environment)
  );

  // ── 3. Append non-Tradovate broker journal accounts ─────────
  // Query broker_connections with purpose='journal', is_active=true, broker != 'tradovate'.
  // Errors are swallowed so a broken broker_connections query never breaks the hook.
  try {
    const { data: brokerConns, error: brokerError } = await supabase
      .from('broker_connections')
      .select('id,broker,connection_name,account_name,account_id,environment,is_active')
      .eq('user_id', userId)
      .eq('purpose', 'journal')
      .eq('is_active', true)
      .neq('broker', 'tradovate');

    if (!brokerError && brokerConns && brokerConns.length > 0) {
      const brokerPortfolios: Portfolio[] = brokerConns.map(c => ({
        id: `broker_${c.id}`,
        name: buildBrokerPortfolioName(c),
        description: null,
        tradovate_account_id: null,
        tradovate_account_spec: null,
        environment: (c.environment as 'live' | 'demo') ?? null,
        source: 'broker' as const,
        broker_connection_id: c.id,
        is_active: true,
        created_at: new Date().toISOString(),
        connection_label: c.connection_name ?? null,
        kill_switch_active: null,
        max_daily_loss_usd: null,
        max_position_size: null,
        max_contracts_per_trade: null,
        max_loss_per_trade_usd: null,
        daily_stop_loss_usd: null,
      }));
      portfolios = [...portfolios, ...brokerPortfolios];
    }
  } catch {
    // Non-blocking — broker_connections failure must not crash portfolio loading.
  }

  // ── 4. ALWAYS guarantee a Manual portfolio exists ──────────
  // If there's no manual portfolio in the DB result, inject a virtual one.
  const hasManual = portfolios.some(p => p.source === 'manual');
  if (!hasManual) {
    // Try to upsert in DB in background (fire-and-forget, non-blocking)
    supabase.from('portfolios').upsert({
      user_id: userId,
      name: 'Manual',
      source: 'manual',
      is_active: true,
      is_default: false,
    }, { onConflict: 'user_id,name', ignoreDuplicates: true }).then(() => {
      // Silently succeeds or fails — next fetch will pick it up
    });

    // Inject virtual manual portfolio immediately so UI is instant
    portfolios = [
      {
        id: MANUAL_PORTFOLIO_ID,
        name: 'Manual',
        description: null,
        tradovate_account_id: null,
        tradovate_account_spec: null,
        environment: null,
        source: 'manual' as const,
        is_active: true,
        created_at: new Date().toISOString(),
        connection_label: null,
        kill_switch_active: null,
        max_daily_loss_usd: null,
        max_position_size: null,
        max_contracts_per_trade: null,
        max_loss_per_trade_usd: null,
        daily_stop_loss_usd: null,
      },
      ...portfolios,
    ];
  }

  return portfolios;
}

const ACTIVE_PORTFOLIO_KEY = 'finotaur_active_portfolio_id';
// Multi-select: stores JSON array of IDs, or '__ALL__'
const SELECTED_PORTFOLIOS_KEY = 'finotaur_selected_portfolios';

// Special sentinel — means "show all accounts"
export const ALL_PORTFOLIOS_ID = '__ALL__';

// Special sentinel — means "TRADER scope: normalize all accounts to one decision"
export const TRADER_SCOPE_ID = '__TRADER__';

export function usePortfolios() {
  const { id: userId } = useEffectiveUser();

  const query = useQuery({
    queryKey: ['portfolios', userId],
    queryFn:  () => fetchPortfolios(userId!),
    enabled:  !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
  });

  const portfolios = query.data ?? [];
  const storageKey = userId ? `${ACTIVE_PORTFOLIO_KEY}_${userId}` : ACTIVE_PORTFOLIO_KEY;
  const multiKey   = userId ? `${SELECTED_PORTFOLIOS_KEY}_${userId}` : SELECTED_PORTFOLIOS_KEY;

  // ── Legacy single-select (kept for backward compat with New trade form) ──
  const [activePortfolioId, setActivePortfolioIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(storageKey) ?? null;
  });

  // ── Multi-select: array of IDs, or ['__ALL__'] ──
  const [selectedIds, setSelectedIdsState] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(multiKey);
      if (raw) return JSON.parse(raw) as string[];
    } catch {}
    return [];
  });

  // Auto-select first portfolio when portfolios load and nothing selected
  // 🔥 FIX: Only set defaults if localStorage is truly empty — never override existing selection
  useEffect(() => {
    if (portfolios.length === 0) return;

    const storedActive = localStorage.getItem(storageKey);
    if (!storedActive) {
      const first = portfolios[0].id;
      setActivePortfolioIdState(first);
      localStorage.setItem(storageKey, first);
    }

    const storedSelected = localStorage.getItem(multiKey);
    if (!storedSelected) {
      const allIds = [ALL_PORTFOLIOS_ID];
      setSelectedIdsState(allIds);
      localStorage.setItem(multiKey, JSON.stringify(allIds));
    }
  }, [portfolios.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Setters ──────────────────────────────────────────────────
  const setActivePortfolioId = useCallback((id: string | null) => {
    setActivePortfolioIdState(id);
    if (id) localStorage.setItem(storageKey, id);
    else localStorage.removeItem(storageKey);
  }, [storageKey]);

  const setSelectedPortfolioIds = useCallback((ids: string[]) => {
    setSelectedIdsState(ids);
    localStorage.setItem(multiKey, JSON.stringify(ids));
    // Keep legacy single-select in sync: use first real portfolio or ALL
    const first = ids.find(id => id !== ALL_PORTFOLIOS_ID && id !== TRADER_SCOPE_ID) ?? null;
    const legacyId = ids.includes(ALL_PORTFOLIOS_ID)
      ? ALL_PORTFOLIOS_ID
      : ids.includes(TRADER_SCOPE_ID)
        ? TRADER_SCOPE_ID
        : (first ?? ALL_PORTFOLIOS_ID);
    setActivePortfolioIdState(legacyId);
    localStorage.setItem(storageKey, legacyId);
  }, [multiKey, storageKey]);

  const togglePortfolioSelection = useCallback((id: string) => {
    setSelectedIdsState(prev => {
      let next: string[];
      if (id === ALL_PORTFOLIOS_ID || id === TRADER_SCOPE_ID) {
        // Sentinel views are exclusive — selecting one clears everything else.
        next = [id];
      } else {
        const withoutSentinels = prev.filter(
          x => x !== ALL_PORTFOLIOS_ID && x !== TRADER_SCOPE_ID,
        );
        if (withoutSentinels.includes(id)) {
          // Deselect — but never go empty; fall back to ALL
          const remaining = withoutSentinels.filter(x => x !== id);
          next = remaining.length > 0 ? remaining : [ALL_PORTFOLIOS_ID];
        } else {
          next = [...withoutSentinels, id];
        }
      }
      localStorage.setItem(multiKey, JSON.stringify(next));
      return next;
    });
  }, [multiKey]);

  // ── Derived values ────────────────────────────────────────────
  const isTraderMode = selectedIds.includes(TRADER_SCOPE_ID);
  const isShowingAll =
    !isTraderMode && (selectedIds.includes(ALL_PORTFOLIOS_ID) || selectedIds.length === 0);

  // ALL_PORTFOLIOS_ID / TRADER → activePortfolio is null (no filter)
  const activePortfolio =
    activePortfolioId === ALL_PORTFOLIOS_ID ||
    activePortfolioId === TRADER_SCOPE_ID ||
    isShowingAll
      ? null
      : portfolios.find(p => p.id === activePortfolioId) ?? portfolios[0] ?? null;

  // effectivePortfolioId — legacy single: null = ALL
  const effectivePortfolioId = (() => {
    if (isShowingAll || isTraderMode) return null;
    const id = activePortfolio?.id ?? null;
    if (id?.startsWith('trado_')) return null;
    return id;
  })();

  // effectivePortfolioIds — for multi-filter queries
  // null = no filter (ALL or TRADER — both fetch all accounts), string[] = filter to these IDs
  // NOTE: keeps broker_ ids in the array — callers must handle them via isBrokerId().
  const effectivePortfolioIds: string[] | null = (() => {
    // TRADER fetches from all accounts; normalization happens client-side.
    if (isShowingAll || isTraderMode) return null;
    const realIds = selectedIds.filter(id =>
      id !== ALL_PORTFOLIOS_ID && id !== TRADER_SCOPE_ID && !id.startsWith('trado_')
    );
    return realIds.length > 0 ? realIds : null;
  })();

  return {
    portfolios,
    isLoading:    query.isLoading,
    error:        query.error,
    refetch:      query.refetch,
    tradovatePortfolios: portfolios.filter(p => p.source === 'tradovate'),
    manualPortfolios:    portfolios.filter(p => p.source === 'manual'),
    brokerPortfolios:    portfolios.filter(p => p.source === 'broker'),
    // Legacy single-select
    activePortfolio,
    activePortfolioId: activePortfolioId ?? activePortfolio?.id ?? null,
    effectivePortfolioId,
    setActivePortfolioId,
    // Multi-select (new)
    selectedPortfolioIds: selectedIds,
    effectivePortfolioIds,
    setSelectedPortfolioIds,
    togglePortfolioSelection,
    hasMultiplePortfolios: portfolios.length > 1,
    isShowingAll,
    isTraderMode,
  };
}
