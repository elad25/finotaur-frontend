// src/hooks/usePortfolios.ts
// ═══════════════════════════════════════════════════════════════
// Loads user portfolios (Tradovate accounts + manual).
// Uses React Query for caching — 10k users ready.
// ═══════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

export interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  tradovate_account_id: number | null;
  tradovate_account_spec: string | null;
  environment: 'live' | 'demo' | null;
  source: 'manual' | 'tradovate';
  is_active: boolean;
  created_at: string;
  connection_label: string | null;
}

// ── Virtual MANUAL portfolio ID — stable, never conflicts with real UUIDs ──
export const MANUAL_PORTFOLIO_ID = 'manual-default';

async function fetchPortfolios(userId: string): Promise<Portfolio[]> {
  // ── 1. Try portfolios table first ──────────────────────────
  const { data, error } = await supabase
    .from('portfolios')
    .select('id,name,description,tradovate_account_id,tradovate_account_spec,environment,source,is_active,created_at,connection_label')
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
      }));
    }
  }

  // ── 3. ALWAYS guarantee a Manual portfolio exists ──────────
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
    const first = ids.find(id => id !== ALL_PORTFOLIOS_ID) ?? null;
    const legacyId = ids.includes(ALL_PORTFOLIOS_ID) ? ALL_PORTFOLIOS_ID : (first ?? ALL_PORTFOLIOS_ID);
    setActivePortfolioIdState(legacyId);
    localStorage.setItem(storageKey, legacyId);
  }, [multiKey, storageKey]);

  const togglePortfolioSelection = useCallback((id: string) => {
    setSelectedIdsState(prev => {
      let next: string[];
      if (id === ALL_PORTFOLIOS_ID) {
        // ALL toggle: select everything
        next = [ALL_PORTFOLIOS_ID];
      } else {
        const withoutAll = prev.filter(x => x !== ALL_PORTFOLIOS_ID);
        if (withoutAll.includes(id)) {
          // Deselect — but never go empty; fall back to ALL
          const remaining = withoutAll.filter(x => x !== id);
          next = remaining.length > 0 ? remaining : [ALL_PORTFOLIOS_ID];
        } else {
          next = [...withoutAll, id];
        }
      }
      localStorage.setItem(multiKey, JSON.stringify(next));
      return next;
    });
  }, [multiKey]);

  // ── Derived values ────────────────────────────────────────────
  const isShowingAll = selectedIds.includes(ALL_PORTFOLIOS_ID) || selectedIds.length === 0;

  // ALL_PORTFOLIOS_ID → activePortfolio is null (no filter)
  const activePortfolio =
    activePortfolioId === ALL_PORTFOLIOS_ID || isShowingAll
      ? null
      : portfolios.find(p => p.id === activePortfolioId) ?? portfolios[0] ?? null;

  // effectivePortfolioId — legacy single: null = ALL
  const effectivePortfolioId = (() => {
    if (isShowingAll) return null;
    const id = activePortfolio?.id ?? null;
    if (id?.startsWith('trado_')) return null;
    return id;
  })();

  // effectivePortfolioIds — for multi-filter queries
  // null = no filter (ALL), string[] = filter to these IDs
  const effectivePortfolioIds: string[] | null = (() => {
    if (isShowingAll) return null;
    const realIds = selectedIds.filter(id =>
      id !== ALL_PORTFOLIOS_ID && !id.startsWith('trado_')
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
  };
}