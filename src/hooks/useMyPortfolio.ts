// src/hooks/useMyPortfolio.ts
// ═══════════════════════════════════════════════════════════════
// Loads and saves the user's single manual portfolio.
// Source-of-truth: Supabase tables portfolios + portfolio_accounts
// + portfolio_positions. Delete-and-reinsert on save to keep the
// data model simple (one manual portfolio per user at app layer).
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  MyPortfolio,
  PortfolioAccount,
  Lot,
} from '@/lib/portfolio/types';

// ── DB row shapes (snake_case) ────────────────────────────────────

interface DbPortfolio {
  id: string;
  user_id: string;
  name: string;
  source: string;
  environment: string;
  is_active: boolean;
  currency: string;
  benchmark_symbol: string | null;
  benchmark_enabled: boolean;
}

interface DbAccount {
  id: string;
  user_id: string;
  portfolio_id: string;
  name: string;
  cash_position: number;
  cash_currency: string;
  sort_order: number;
}

interface DbPosition {
  id: string;
  user_id: string;
  portfolio_id: string;
  account_id: string;
  ticker: string;
  quantity: number;
  cost_per_share: number | null;
  purchase_date: string | null;
  sort_order: number;
}

// ── Mapping helpers ───────────────────────────────────────────────

function dbPositionToLot(p: DbPosition): Lot {
  return {
    id: p.id,
    ticker: p.ticker,
    quantity: p.quantity,
    costPerShare: p.cost_per_share,
    purchaseDate: p.purchase_date,
  };
}

function dbAccountToPortfolioAccount(
  acc: DbAccount,
  positions: DbPosition[],
): PortfolioAccount {
  return {
    id: acc.id,
    name: acc.name,
    cashPosition: Number(acc.cash_position),
    cashCurrency: acc.cash_currency,
    positions: positions
      .filter(p => p.account_id === acc.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(dbPositionToLot),
  };
}

// ── Hook return type ──────────────────────────────────────────────

export interface UseMyPortfolioReturn {
  portfolio: MyPortfolio | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  // Returns the reloaded portfolio (or null when unauthenticated / not yet created).
  reload: () => Promise<MyPortfolio | null>;
  save: (p: MyPortfolio) => Promise<MyPortfolio>;
}

// ── Hook ──────────────────────────────────────────────────────────

export function useMyPortfolio(): UseMyPortfolioReturn {
  const [portfolio, setPortfolio] = useState<MyPortfolio | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  // Synchronous in-flight guard — prevents double-submit races where the
  // async `saving` state update arrives too late to block a second call.
  const savingRef = useRef(false);

  // ── Load ─────────────────────────────────────────────────────
  // Returns the assembled portfolio so callers (e.g. save) can capture
  // the post-reload value without an extra query round-trip.
  const reload = useCallback(async (): Promise<MyPortfolio | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPortfolio(null);
        return null;
      }

      // 1. Find the manual portfolio row
      const { data: pfRow, error: pfErr } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .eq('source', 'manual')
        .limit(1)
        .maybeSingle();

      if (pfErr) throw pfErr;

      if (!pfRow) {
        setPortfolio(null);
        return null;
      }

      const dbPf = pfRow as DbPortfolio;

      // 2. Load accounts ordered by sort_order
      const { data: accRows, error: accErr } = await supabase
        .from('portfolio_accounts')
        .select('*')
        .eq('portfolio_id', dbPf.id)
        .order('sort_order', { ascending: true });

      if (accErr) throw accErr;

      const accounts = (accRows ?? []) as DbAccount[];

      // 3. Load all positions for this portfolio (one query, filter client-side)
      const { data: posRows, error: posErr } = await supabase
        .from('portfolio_positions')
        .select('*')
        .eq('portfolio_id', dbPf.id)
        .order('account_id')
        .order('sort_order', { ascending: true });

      if (posErr) throw posErr;

      const positions = (posRows ?? []) as DbPosition[];

      // 4. Assemble domain object
      const assembled: MyPortfolio = {
        id: dbPf.id,
        name: dbPf.name,
        currency: dbPf.currency ?? 'USD',
        benchmarkEnabled: dbPf.benchmark_enabled ?? false,
        benchmarkSymbol: dbPf.benchmark_symbol ?? null,
        accounts: accounts.map(acc =>
          dbAccountToPortfolioAccount(acc, positions),
        ),
      };

      setPortfolio(assembled);
      return assembled;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load portfolio';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    reload();
  }, [reload]);

  // ── Save (atomic RPC) ─────────────────────────────────────────
  const save = useCallback(async (p: MyPortfolio): Promise<MyPortfolio> => {
    // Synchronous double-submit guard — checked before any async work.
    if (savingRef.current) throw new Error('Save already in progress');
    savingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      // Build the jsonb accounts payload expected by the RPC.
      const p_accounts = p.accounts.map((acc) => ({
        name: acc.name,
        cash_position: acc.cashPosition,
        cash_currency: acc.cashCurrency,
        positions: acc.positions.map((lot) => ({
          ticker: lot.ticker,
          quantity: lot.quantity,
          cost_per_share: lot.costPerShare,
          purchase_date: lot.purchaseDate,
        })),
      }));

      const { error: rpcErr } = await supabase.rpc('save_my_portfolio', {
        p_name:              p.name,
        p_currency:          p.currency,
        p_benchmark_enabled: p.benchmarkEnabled,
        p_benchmark_symbol:  p.benchmarkSymbol,
        p_accounts,
      });

      if (rpcErr) throw new Error(rpcErr.message);

      // Reload the hook's state and capture the assembled result directly
      // from the reload return value — no extra query round-trips needed.
      const fresh = await reload();
      if (!fresh) throw new Error('Failed to reload portfolio after save');
      return fresh;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save portfolio';
      setError(msg);
      throw err;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [reload]);

  return { portfolio, loading, saving, error, reload, save };
}
