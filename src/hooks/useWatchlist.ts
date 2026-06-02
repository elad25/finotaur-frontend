// src/hooks/useWatchlist.ts
// ═══════════════════════════════════════════════════════════════
// Manages the user's watchlist backed by the `watchlist_items` table.
// Two groups: 'portfolio' (synced from portfolio tickers) and
// 'manual' (user-added). FREE plan is capped at 20 total.
// RLS: every row requires user_id = auth.uid().
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlan } from './usePlan';
import { watchlistLimitForPlan } from '@/constants/watchlistLimits';
import type { WatchlistItem } from '@/lib/watchlist/types';

// ── Hook return type ──────────────────────────────────────────────

export interface UseWatchlistReturn {
  items: WatchlistItem[];
  portfolioItems: WatchlistItem[];
  manualItems: WatchlistItem[];
  count: number;
  limit: number;
  atLimit: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addManual: (
    ticker: string,
  ) => Promise<{ ok: boolean; reason?: 'exists' | 'limit' | 'invalid' | 'error' }>;
  remove: (ticker: string) => Promise<void>;
  syncPortfolioTickers: (
    tickers: string[],
  ) => Promise<{ added: number; skipped: number; removed: number }>;
}

// ── Hook ──────────────────────────────────────────────────────────

export function useWatchlist(): UseWatchlistReturn {
  const { plan } = usePlan();

  const [items, setItems]     = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // ── Derived state ─────────────────────────────────────────────

  const portfolioItems = useMemo(
    () =>
      items
        .filter(i => i.source === 'portfolio')
        .sort((a, b) => a.ticker.localeCompare(b.ticker)),
    [items],
  );

  const manualItems = useMemo(
    () =>
      items
        .filter(i => i.source === 'manual')
        .sort((a, b) => a.ticker.localeCompare(b.ticker)),
    [items],
  );

  const count = items.length;
  const limit = watchlistLimitForPlan(plan);
  const atLimit = count >= limit;

  // ── Load ──────────────────────────────────────────────────────

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setItems([]);
        return;
      }

      const { data, error: dbErr } = await supabase
        .from('watchlist_items')
        .select('id, ticker, source')
        .eq('user_id', user.id);

      if (dbErr) throw dbErr;

      const rows = (data ?? []) as Array<{ id: string; ticker: string; source: string }>;
      setItems(
        rows.map(r => ({
          id: r.id,
          ticker: r.ticker,
          source: r.source as WatchlistItem['source'],
        })),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load watchlist';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    reload();
  }, [reload]);

  // ── addManual ─────────────────────────────────────────────────

  const addManual = useCallback(
    async (
      ticker: string,
    ): Promise<{ ok: boolean; reason?: 'exists' | 'limit' | 'invalid' | 'error' }> => {
      const normalized = ticker.trim().toUpperCase();

      if (!normalized) {
        return { ok: false, reason: 'invalid' };
      }

      if (items.some(i => i.ticker === normalized)) {
        return { ok: false, reason: 'exists' };
      }

      if (count >= limit) {
        return { ok: false, reason: 'limit' };
      }

      setSaving(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          return { ok: false, reason: 'error' };
        }

        const { error: dbErr } = await supabase
          .from('watchlist_items')
          .insert({ user_id: user.id, ticker: normalized, source: 'manual' });

        if (dbErr) throw dbErr;

        await reload();
        return { ok: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to add ticker';
        setError(msg);
        return { ok: false, reason: 'error' };
      } finally {
        setSaving(false);
      }
    },
    [items, count, limit, reload],
  );

  // ── remove ────────────────────────────────────────────────────

  const remove = useCallback(
    async (ticker: string): Promise<void> => {
      setSaving(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { error: dbErr } = await supabase
          .from('watchlist_items')
          .delete()
          .eq('user_id', user.id)
          .eq('ticker', ticker);

        if (dbErr) throw dbErr;

        await reload();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to remove ticker';
        setError(msg);
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  // ── syncPortfolioTickers ──────────────────────────────────────

  const syncPortfolioTickers = useCallback(
    async (
      tickers: string[],
    ): Promise<{ added: number; skipped: number; removed: number }> => {
      setSaving(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { added: 0, skipped: 0, removed: 0 };

        // Normalize incoming tickers
        const normalized = Array.from(
          new Set(tickers.map(t => t.trim().toUpperCase()).filter(Boolean)),
        );

        // ── Step 1: Remove stale 'portfolio' rows ─────────────────

        const existingPortfolioTickers = new Set(
          items.filter(i => i.source === 'portfolio').map(i => i.ticker),
        );
        const normalizedSet = new Set(normalized);

        const toRemoveTickers = [...existingPortfolioTickers].filter(
          t => !normalizedSet.has(t),
        );

        let removed = 0;

        if (toRemoveTickers.length > 0) {
          const { error: delErr } = await supabase
            .from('watchlist_items')
            .delete()
            .eq('user_id', user.id)
            .eq('source', 'portfolio')
            .in('ticker', toRemoveTickers);

          if (delErr) throw delErr;
          removed = toRemoveTickers.length;
        }

        // ── Step 2: Compute tickers to add ───────────────────────

        const existingAllTickers = new Set(items.map(i => i.ticker));
        const toAdd = normalized.filter(t => !existingAllTickers.has(t));

        // Recalculate count after removals
        const countAfterRemovals = count - removed;
        const remaining = Math.max(0, limit - countAfterRemovals);

        const toAddCapped = toAdd.slice(0, remaining);
        const skipped = toAdd.length - toAddCapped.length;
        let added = 0;

        if (toAddCapped.length > 0) {
          const rows = toAddCapped.map(ticker => ({
            user_id: user.id,
            ticker,
            source: 'portfolio' as const,
          }));

          const { error: upsertErr } = await supabase
            .from('watchlist_items')
            .upsert(rows, { onConflict: 'user_id,ticker', ignoreDuplicates: true });

          if (upsertErr) throw upsertErr;
          added = toAddCapped.length;
        }

        await reload();
        return { added, skipped, removed };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to sync portfolio tickers';
        setError(msg);
        return { added: 0, skipped: 0, removed: 0 };
      } finally {
        setSaving(false);
      }
    },
    [items, count, limit, reload],
  );

  // ── Return ────────────────────────────────────────────────────

  return {
    items,
    portfolioItems,
    manualItems,
    count,
    limit,
    atLimit,
    loading,
    saving,
    error,
    reload,
    addManual,
    remove,
    syncPortfolioTickers,
  };
}
