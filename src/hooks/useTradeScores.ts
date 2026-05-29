import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { scoreTrade, DEFAULT_WEIGHTS } from '@/lib/journal/scoring';
import type { ScoreWeights, ScoreBreakdown } from '@/lib/journal/scoring';
import type { Trade } from '@/hooks/useTradesData';

export type { ScoreWeights, ScoreBreakdown };

// ============================================================
// Types
// ============================================================

export type TradeScore = {
  tradeId: string;
  score: number;
  breakdown: ScoreBreakdown;
  computedAt: string;
};

// ============================================================
// useScoringConfig — reads/writes journal_scoring_config
// ============================================================

export function useScoringConfig() {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['journal-scoring-config', userId],
    queryFn: async (): Promise<ScoreWeights> => {
      const { data, error } = await supabase
        .from('journal_scoring_config')
        .select('weights')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      // No row → return defaults
      if (!data) return DEFAULT_WEIGHTS;
      return (data.weights as ScoreWeights) ?? DEFAULT_WEIGHTS;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const updateWeightsMutation = useMutation({
    mutationFn: async (weights: ScoreWeights) => {
      if (!userId) throw new Error('No user ID');
      const { error } = await supabase.from('journal_scoring_config').upsert(
        { user_id: userId, weights, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-scoring-config', userId] });
    },
  });

  return {
    weights: query.data ?? DEFAULT_WEIGHTS,
    isLoading: query.isLoading,
    updateWeights: (weights: ScoreWeights) => updateWeightsMutation.mutate(weights),
  };
}

// ============================================================
// useTradeScores — reads journal_trade_scores
// ============================================================

export function useTradeScores(tradeIds?: string[]) {
  const { id: userId } = useEffectiveUser();

  return useQuery({
    queryKey: ['journal-trade-scores', userId],
    queryFn: async (): Promise<TradeScore[]> => {
      let query = supabase
        .from('journal_trade_scores')
        .select('trade_id, score, breakdown, computed_at')
        .eq('user_id', userId!);

      if (tradeIds && tradeIds.length > 0) {
        query = query.in('trade_id', tradeIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map(row => ({
        tradeId: row.trade_id as string,
        score: Number(row.score),
        breakdown: row.breakdown as ScoreBreakdown,
        computedAt: row.computed_at as string,
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ============================================================
// useRecomputeScores — computes + upserts journal_trade_scores
// ============================================================

export function useRecomputeScores() {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trades,
      weights,
    }: {
      trades: Trade[];
      weights: ScoreWeights;
    }) => {
      if (!userId) throw new Error('No user ID');
      if (trades.length === 0) return;

      const now = new Date().toISOString();
      const rows = trades.map(trade => {
        const { score, breakdown } = scoreTrade(trade, weights);
        return {
          trade_id: trade.id,
          user_id: userId,
          score,
          breakdown,
          computed_at: now,
        };
      });

      // Upsert in batches of 100 to avoid payload limits
      const BATCH = 100;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { error } = await supabase
          .from('journal_trade_scores')
          .upsert(batch, { onConflict: 'trade_id' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-trade-scores', userId] });
    },
  });
}
