// supabase RPC hook for full journal stats (F5 perf fix).
// Backs `get_user_journal_stats(p_user_id, p_portfolio_ids, p_from, p_to)` —
// the server-side equivalent of src/utils/statistics.ts:calculateStatistics().
//
// Consumers can swap in this hook to drop the client-side walk over the full
// trade array. At 5K-50K trades per user the win is large (200ms+ → <50ms).
//
// Wiring strategy: foundation-only in this session. Not yet replacing
// `useTradeStats` consumers on Overview / Statistics / Analytics — each screen
// migrates individually, with side-by-side numeric validation, in a follow-up.
//
// Realtime invalidation: the existing `useTrades` channel already invalidates
// `['trades', userId]` on postgres_changes. We mirror that here with our own
// invalidation listener so that if a screen uses ONLY this hook (not useTrades),
// it still stays fresh.

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { useEffectiveUser } from './useEffectiveUser';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export interface UserJournalStats {
  user_id: string;
  total_closed: number;
  wins: number;
  losses: number;
  breakeven: number;
  /** 0..1 (multiply by 100 in UI for percentage) */
  win_rate: number;
  net_pnl: number;
  gross_profit: number;
  gross_loss: number;
  avg_win: number;
  /** Positive number (absolute value of avg of losing trades) */
  avg_loss: number;
  /** gross_profit / gross_loss; null when undefined (no losses + has wins = Infinity equiv) */
  profit_factor: number | null;
  expectancy: number;
  largest_win: number;
  /** Negative number (min pnl among losing trades) */
  largest_loss: number;
  avg_rr: number;
}

interface UseUserJournalStatsOptions {
  /** When set, restricts stats to these portfolio_ids. Null/undefined = all portfolios. */
  portfolioIds?: string[] | null;
  /** Half-open [from, to) range over `open_at`. Both null/undefined = all time. */
  from?: Date | string | null;
  to?: Date | string | null;
}

function toIsoOrNull(v: Date | string | null | undefined): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return v;
}

export function useUserJournalStats(opts: UseUserJournalStatsOptions = {}) {
  const { id: userId } = useEffectiveUser();
  const { isImpersonating } = useImpersonation();
  const qc = useQueryClient();
  const targetUserId = userId;

  const portfolioIds = opts.portfolioIds && opts.portfolioIds.length > 0 ? [...opts.portfolioIds].sort() : null;
  const fromIso = toIsoOrNull(opts.from);
  const toIso = toIsoOrNull(opts.to);

  // Realtime invalidation — keep stats fresh when trades change.
  useEffect(() => {
    if (!targetUserId) return;
    const channel = supabase
      .channel(`journal-stats-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${targetUserId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['user_journal_stats', targetUserId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, qc]);

  return useQuery({
    queryKey: [
      'user_journal_stats',
      targetUserId,
      isImpersonating ? 'admin' : 'user',
      portfolioIds ?? 'all',
      fromIso ?? 'beginning',
      toIso ?? 'now',
    ],
    queryFn: async (): Promise<UserJournalStats | null> => {
      if (!targetUserId) return null;
      const client = isImpersonating && supabaseAdmin ? supabaseAdmin : supabase;
      const { data, error } = await client.rpc('get_user_journal_stats', {
        p_user_id: targetUserId,
        p_portfolio_ids: portfolioIds,
        p_from: fromIso,
        p_to: toIso,
      });
      if (error) {
        console.error('[useUserJournalStats] RPC error:', error.message);
        throw error;
      }
      if (!Array.isArray(data) || data.length === 0) {
        return {
          user_id: targetUserId,
          total_closed: 0,
          wins: 0,
          losses: 0,
          breakeven: 0,
          win_rate: 0,
          net_pnl: 0,
          gross_profit: 0,
          gross_loss: 0,
          avg_win: 0,
          avg_loss: 0,
          profit_factor: null,
          expectancy: 0,
          largest_win: 0,
          largest_loss: 0,
          avg_rr: 0,
        };
      }
      const row = data[0] as Record<string, unknown>;
      const num = (k: string): number => {
        const v = row[k];
        if (v == null) return 0;
        const n = typeof v === 'string' ? Number(v) : (v as number);
        return Number.isFinite(n) ? n : 0;
      };
      return {
        user_id: row.user_id as string,
        total_closed: num('total_closed'),
        wins: num('wins'),
        losses: num('losses'),
        breakeven: num('breakeven'),
        win_rate: num('win_rate'),
        net_pnl: num('net_pnl'),
        gross_profit: num('gross_profit'),
        gross_loss: num('gross_loss'),
        avg_win: num('avg_win'),
        avg_loss: num('avg_loss'),
        profit_factor: row.profit_factor == null ? null : Number(row.profit_factor),
        expectancy: num('expectancy'),
        largest_win: num('largest_win'),
        largest_loss: num('largest_loss'),
        avg_rr: num('avg_rr'),
      };
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });
}
