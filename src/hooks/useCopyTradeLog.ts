// src/hooks/useCopyTradeLog.ts
// ═══════════════════════════════════════════════════════════════
// Paginated copy trade history.
// ═══════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

export interface CopyTradeLogEntry {
  id: string;
  copy_rule_id: string | null;
  source_trade_id: string | null;
  copied_trade_id: string | null;
  action: 'open' | 'close' | 'skipped' | 'error';
  source_qty: number | null;
  copied_qty: number | null;
  source_symbol: string;
  target_symbol: string;
  ratio_applied: number | null;
  symbol_map_applied: boolean;
  skip_reason: string | null;
  error_message: string | null;
  created_at: string;
  // ── computed display field (derived below)
  status: 'success' | 'skipped' | 'failed';
  original_quantity: number | null;
  copied_quantity: number | null;
}

async function fetchCopyLog(userId: string, limit = 50): Promise<CopyTradeLogEntry[]> {
  const { data, error } = await supabase
    .from('copy_trade_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }

  return (data ?? []).map(row => ({
    ...row,
    status: row.action === 'error'   ? 'failed'
          : row.action === 'skipped' ? 'skipped'
          : 'success',
    original_quantity: row.source_qty,
    copied_quantity:   row.copied_qty,
  }));
}

export function useCopyTradeLog(limit = 50) {
  const { id: userId } = useEffectiveUser();

  const query = useQuery({
    queryKey:  ['copy_trade_log', userId, limit],
    queryFn:   () => fetchCopyLog(userId!, limit),
    enabled:   !!userId,
staleTime:       30 * 1000,
    gcTime:          10 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  const successCount = (query.data ?? []).filter(e => e.status === 'success').length;
  const skippedCount = (query.data ?? []).filter(e => e.status === 'skipped').length;
  const failedCount  = (query.data ?? []).filter(e => e.status === 'failed').length;

  return {
    log: query.data ?? [],
    isLoading: query.isLoading,
    successCount,
    skippedCount,
    failedCount,
    refetch: query.refetch,
  };
}