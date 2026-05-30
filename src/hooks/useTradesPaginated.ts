// F1 perf fix — additive hooks for paginated + projected trade fetches.
//
// Existing `useTrades` (in useTradesData.ts) pulls every row + every column
// for the user. Fine at 100-500 trades; very expensive at 5K+ trades
// (~MB-scale payload, slow first paint).
//
// This file ADDS two hooks WITHOUT touching the existing one:
//   • useTradesPage   — cursor-paginated infinite list (MyTrades grid)
//   • useTradesProjection — slim {id, side, pnl, outcome, ...} for stats screens
//
// Each screen migrates individually in follow-up sessions; nothing breaks here
// until a screen opts in.

import { useEffect } from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { isBrokerId, brokerConnId } from '@/hooks/usePortfolios';

// ────────────────────────────────────────────────────────────────────────
// Shape returned by the projection query — slim subset of `trades` row.
// Sufficient for: Win/Loss/PF/Expectancy aggregates, equity curve, calendar
// heatmap, Overview KPI tiles. NOT sufficient for: TradeDetail page, edit
// flows, screenshots (those keep using useTrade(id) or useTrades).
// ────────────────────────────────────────────────────────────────────────
export interface TradeProjectionRow {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number | null;
  pnl: number | null;
  outcome: 'WIN' | 'LOSS' | 'BE' | 'OPEN' | null;
  open_at: string;
  close_at: string | null;
  broker: string | null;
  portfolio_id: string | null;
  rr: number | null;
  actual_r: number | null;
  actual_user_r: number | null;
  risk_usd: number | null;
  input_mode: string | null;
  // strategy_id kept so consumers can group/filter without an extra join.
  strategy_id: string | null;
}

const PROJECTION_COLUMNS =
  'id, symbol, side, quantity, pnl, outcome, open_at, close_at, broker, portfolio_id, rr, actual_r, actual_user_r, risk_usd, input_mode, strategy_id';

interface UseTradesProjectionOptions {
  portfolioId?: string | null;
  /** Half-open [from, to) over open_at. Both null = all time. */
  from?: string | null;
  to?: string | null;
  /** Hard cap, defaults to 5000 — covers heavy users without OOM in JSON parse. */
  limit?: number;
}

export function useTradesProjection(opts: UseTradesProjectionOptions = {}) {
  const { id: userId } = useEffectiveUser();
  const { isImpersonating } = useImpersonation();
  const qc = useQueryClient();
  const targetUserId = userId;

  const portfolioId = opts.portfolioId ?? null;
  const from = opts.from ?? null;
  const to = opts.to ?? null;
  const limit = opts.limit ?? 5000;

  useEffect(() => {
    if (!targetUserId) return;
    const channel = supabase
      .channel(`trades-projection-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${targetUserId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['trades_projection', targetUserId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, qc]);

  return useQuery({
    queryKey: [
      'trades_projection',
      targetUserId,
      isImpersonating ? 'admin' : 'user',
      portfolioId ?? 'all',
      from ?? 'beginning',
      to ?? 'now',
      limit,
    ],
    queryFn: async (): Promise<TradeProjectionRow[]> => {
      if (!targetUserId) return [];
      const client = isImpersonating && supabaseAdmin ? supabaseAdmin : supabase;
      let q = client
        .from('trades')
        .select(PROJECTION_COLUMNS)
        .eq('user_id', targetUserId)
        .is('deleted_at', null)
        .order('open_at', { ascending: false })
        .limit(limit);
      // broker_ prefix → filter by broker_connection_id instead of portfolio_id
      if (portfolioId) {
        if (isBrokerId(portfolioId)) {
          q = q.eq('broker_connection_id', brokerConnId(portfolioId));
        } else {
          q = q.eq('portfolio_id', portfolioId);
        }
      }
      if (from) q = q.gte('open_at', from);
      if (to) q = q.lt('open_at', to);

      const { data, error } = await q;
      if (error) {
        console.error('[useTradesProjection] fetch error:', error.message);
        throw error;
      }
      return (data ?? []) as TradeProjectionRow[];
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ────────────────────────────────────────────────────────────────────────
// Cursor-paginated infinite list — drop-in for the grid views.
//
// Cursor = the previous page's last `open_at`. Tie-breaker on `id` so that
// trades with identical open_at don't loop.
//
// Returns a useInfiniteQuery; the consumer pairs it with InfiniteScroll or
// a "Load more" button. The page shape includes a `nextCursor` of null
// when the last page is reached.
// ────────────────────────────────────────────────────────────────────────

export interface TradesPage {
  rows: TradeProjectionRow[];
  nextCursor: { open_at: string; id: string } | null;
}

interface UseTradesPageOptions {
  portfolioId?: string | null;
  pageSize?: number;
}

export function useTradesPage(opts: UseTradesPageOptions = {}) {
  const { id: userId } = useEffectiveUser();
  const { isImpersonating } = useImpersonation();
  const qc = useQueryClient();
  const targetUserId = userId;
  const portfolioId = opts.portfolioId ?? null;
  const pageSize = opts.pageSize ?? 50;

  useEffect(() => {
    if (!targetUserId) return;
    const channel = supabase
      .channel(`trades-page-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${targetUserId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['trades_page', targetUserId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, qc]);

  return useInfiniteQuery({
    queryKey: [
      'trades_page',
      targetUserId,
      isImpersonating ? 'admin' : 'user',
      portfolioId ?? 'all',
      pageSize,
    ],
    initialPageParam: null as TradesPage['nextCursor'],
    queryFn: async ({ pageParam }): Promise<TradesPage> => {
      if (!targetUserId) return { rows: [], nextCursor: null };
      const client = isImpersonating && supabaseAdmin ? supabaseAdmin : supabase;
      let q = client
        .from('trades')
        .select(PROJECTION_COLUMNS)
        .eq('user_id', targetUserId)
        .is('deleted_at', null)
        .order('open_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(pageSize + 1); // fetch one extra to detect end-of-list

      // broker_ prefix → filter by broker_connection_id instead of portfolio_id
      if (portfolioId) {
        if (isBrokerId(portfolioId)) {
          q = q.eq('broker_connection_id', brokerConnId(portfolioId));
        } else {
          q = q.eq('portfolio_id', portfolioId);
        }
      }
      if (pageParam) {
        // (open_at, id) lexicographic cursor — covers the equal-timestamp case.
        q = q.or(
          `open_at.lt.${pageParam.open_at},and(open_at.eq.${pageParam.open_at},id.lt.${pageParam.id})`,
        );
      }

      const { data, error } = await q;
      if (error) {
        console.error('[useTradesPage] fetch error:', error.message);
        throw error;
      }
      const rows = (data ?? []) as TradeProjectionRow[];
      const hasMore = rows.length > pageSize;
      const trimmed = hasMore ? rows.slice(0, pageSize) : rows;
      const last = trimmed[trimmed.length - 1];
      const nextCursor: TradesPage['nextCursor'] =
        hasMore && last ? { open_at: last.open_at, id: last.id } : null;
      return { rows: trimmed, nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
