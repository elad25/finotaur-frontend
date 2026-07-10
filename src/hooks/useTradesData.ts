// ================================================
// 🔥 OPTIMIZED: useTradesData - Ultra Performance
// ================================================
// ✅ Optimized trades fetching with screenshots support
// ✅ Stable references (no unnecessary recalculations)
// ✅ Smart refetch strategy
// ✅ Minimal DB load
// ✅ IMPERSONATION SUPPORT: uses real Supabase session swap
//    (admin-impersonate edge fn + ImpersonationContext).
//    The regular supabase client already carries the target
//    user's JWT — no service-role bypass needed.
// ================================================

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { tradeR } from '@/utils/rAggregates';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryClient';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useMemo, useRef, useEffect } from 'react';
import { isBrokerId, brokerConnId } from '@/hooks/usePortfolios';
import { excludeHiddenWhenAllAccounts } from '@/lib/journal/hiddenAccounts';
import { getDemoTrades } from '@/utils/demoJournalData';
import { useJournalDemoMode } from '@/hooks/useJournalDemoMode';
import { useJournalPreview } from '@/contexts/JournalPreviewContext';

// ================================================
// 🔥 ASSET MULTIPLIERS - For R calculation
// ================================================

const ASSET_MULTIPLIERS: Record<string, number> = {
  'ES': 50, 'MES': 5, 'NQ': 20, 'MNQ': 2, 'YM': 5,
  'RTY': 50, 'CL': 1000, 'GC': 100, 'SI': 5000,
  'ZB': 1000, 'ZN': 1000,
};

const getAssetMultiplier = (symbol: string): number => {
  const cleanSymbol = symbol?.toUpperCase()?.trim()?.replace(/\d+$/, '') || '';
  return ASSET_MULTIPLIERS[cleanSymbol] || 1;
};

// Contract-based R: pnl / risk_usd, where risk_usd is derived from the
// distance to stop. Returns null when we can't compute it (missing stop,
// missing exit, zero risk) — Tradovate fills don't carry stop orders, so
// most synced trades hit this case. Returning null lets the consumer fall
// back to user-1R (settings) instead of forcing a misleading 0.00R.
function calculateActualR(trade: any): number | null {
  if (!trade.exit_price || !trade.entry_price || !trade.stop_price || !trade.quantity) {
    return null;
  }

  const entry = Number(trade.entry_price);
  const stop = Number(trade.stop_price);
  const exit = Number(trade.exit_price);
  const quantity = Number(trade.quantity);
  const fees = Number(trade.fees || 0);
  const side = trade.side || 'LONG';
  const multiplier = trade.multiplier || getAssetMultiplier(trade.symbol || '');

  const priceDiff = side === 'LONG' ? exit - entry : entry - exit;
  const grossPnL = priceDiff * quantity * multiplier;
  const netPnL = grossPnL - fees;

  // Signed risk: a stop on the profit side (<= 0) is risk-free → no contract R.
  const signedRisk = side === 'LONG' ? entry - stop : stop - entry;
  if (signedRisk <= 0) return null;
  const riskUSD = signedRisk * quantity * multiplier;

  if (riskUSD <= 0) return null;
  return netPnL / riskUSD;
}

// ================================================
// 🎯 TYPES
// ================================================

export interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price?: number;
  stop_price: number;
  take_profit_price?: number;
  quantity: number;
  fees: number;
  fees_mode?: string;
  pnl?: number;
  outcome?: 'WIN' | 'LOSS' | 'BE' | 'OPEN';
  open_at: string;
  close_at?: string;
  session?: string;
  strategy_id?: string;
  strategy_name?: string;
  setup?: string;
  emotion?: string;
  notes?: string;
  mistake?: string;
  next_time?: string;
  screenshot_url?: string;
  screenshots?: string[];
  asset_class?: string;
  quality_tag?: string;
  broker?: string;
  portfolio_id?: string | null;
  external_id?: string;
  multiplier?: number;
  tags?: string[];
  // 🔥 ADD THESE FIELDS:
  input_mode?: 'summary' | 'risk-only';
  risk_usd?: number;
  reward_usd?: number;
  risk_pts?: number;
  reward_pts?: number;
  rr?: number;
  actual_r?: number;
  actual_user_r?: number;
  user_risk_r?: number;
  user_reward_r?: number;
  // Excursion data (backfilled / live-captured) — used by whatIfEngine RR + break-even scenarios
  mfe?: number | null;
  mae?: number | null;
  mfe_r?: number | null;
  mae_r?: number | null;
  /** Real DB ids of all underlying trades aggregated into this displayed row (copier/all-accounts grouping). */
  group_trade_ids?: string[];
  metrics?: {
    rr?: number;
    riskUSD?: number;
    rewardUSD?: number;
    riskPts?: number;
    rewardPts?: number;
    actual_r?: number;
    user_risk_r?: number;
    user_reward_r?: number;
  };
  created_at: string;
  updated_at: string;
  // Options (single-leg) — populated only when asset_class === 'options'
  option_type?: 'CALL' | 'PUT';
  strike_price?: number;
  expiration_date?: string;
  underlying_symbol?: string;
  option_outcome?: string | null;
  // Trade annotation taxonomy (DB migration applied 2026-06-15)
  setup_quality_rating?: number | null;
  mental_state?: number | null;
  checklist_results?: Record<string, boolean> | null;
  // User-set annotations on the trade-detail view
  trade_rating?: number | null;
  exit_reason?: string | null;
  // R-from-frozen-stop fields (populated by DB trigger)
  r_stop_price?: number | null;
  r_locked_at?: string | null;
  r_stop_set_at?: string | null;
  risk_class?: 'risk_defined' | 'risk_free' | 'no_stop' | null;
  locked_profit_usd?: number | null;
}
export interface TradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  totalPnL: number;
  avgR: number;
}

// ================================================
// 🔥 FETCH ALL TRADES
// Impersonation uses a real session swap — the regular supabase client
// already holds the target user's JWT, so RLS is satisfied automatically.
// ================================================

// ================================================
// 🔥 RAW PAGINATED FETCH - For TRADER mode (bypasses aggregateCopiedTrades)
// ================================================

const RAW_PAGE_SIZE = 1000;
const RAW_MAX_PAGES = 50; // hard safety cap: 50k rows

async function fetchAllTradesRaw(
  client: typeof supabase,
  userId: string,
  excludePortfolioIds?: string[],
): Promise<Trade[]> {
  const allRows: Trade[] = [];
  let page = 0;

  while (page < RAW_MAX_PAGES) {
    const from = page * RAW_PAGE_SIZE;
    let q = client
      .from('trades')
      .select(`*, strategies ( name )`)
      .eq('user_id', userId)
      .is('deleted_at', null);
    // all-accounts (TRADER raw) path: exclude hidden portfolios (e.g. WHISPER) — null-safe no-op when empty
    q = excludeHiddenWhenAllAccounts(q, true, excludePortfolioIds ?? []);
    const { data, error } = await q
      .order('open_at', { ascending: false })
      .range(from, from + RAW_PAGE_SIZE - 1);

    if (error) {
      console.error('fetchAllTradesRaw page error:', error.message);
      throw error;
    }

    const rows = (data ?? []) as any[];
    allRows.push(...rows);
    if (rows.length < RAW_PAGE_SIZE) break; // last page
    page++;
  }

  if (page >= RAW_MAX_PAGES) {
    console.warn(
      `fetchAllTradesRaw: hit safety cap of ${RAW_MAX_PAGES} pages (${allRows.length} rows). Some trades may be excluded.`,
    );
  }

  return allRows;
}

async function fetchAllTrades(
  userId: string,
  isImpersonating: boolean = false,
  portfolioId?: string | null,
  skipCopyAggregation?: boolean,
  excludePortfolioIds?: string[],
): Promise<Trade[]> {
  if (!userId) {
    console.log('❌ No user ID - skipping trades fetch');
    return [];
  }

  console.log('📊 Fetching trades for user:', userId, '| Impersonating:', isImpersonating, '| Portfolio:', portfolioId ?? 'ALL', '| SkipAgg:', skipCopyAggregation ?? false);

  try {
    const client = supabase;

    // TRADER mode: skip copy-aggregation, fetch every raw fill via paginated loop
    // so Supabase's 1000-row default cap doesn't silently truncate the dataset.
    // The caller (MyTrades) will group fills into decisions via normalizeTraderTrades.
    if (!portfolioId && skipCopyAggregation) {
      console.log('🔄 TRADER raw path: paginated fetch (bypassing aggregateCopiedTrades)');
      const rawRows = await fetchAllTradesRaw(client, userId, excludePortfolioIds);
      console.log(`✅ TRADER raw: fetched ${rawRows.length} fills`);
      return processRows(rawRows);
    }

    let query = client
      .from('trades')
      .select(`
        *,
        strategies (
          name
        )
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('open_at', { ascending: false });

    // 🔥 Portfolio filter: NULL = show all accounts, string = specific portfolio only
    // broker_ prefix → filter by broker_connection_id instead of portfolio_id
    if (portfolioId) {
      if (isBrokerId(portfolioId)) {
        query = query.eq('broker_connection_id', brokerConnId(portfolioId));
      } else {
        query = query.eq('portfolio_id', portfolioId);
      }
    } else {
      // all-accounts case: exclude hidden portfolios
      query = excludeHiddenWhenAllAccounts(query, true, excludePortfolioIds ?? []);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching trades:', error);
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} trades`);

    // 🔥 בדוק אם screenshots קיים
    if (data && data.length > 0) {
      console.log('📸 Sample trade data:', {
        id: data[0].id,
        symbol: data[0].symbol,
        screenshots: data[0].screenshots,
        screenshot_url: data[0].screenshot_url,
      });
    }

// 🚀 Process trades with strategy name AND calculate actual_r
    const processedTrades = processRows(data || []);

    if (!portfolioId) {
      return aggregateCopiedTrades(processedTrades, 'all-accounts');
    }

    return processedTrades;
  } catch (error) {
    console.error('❌ Failed to fetch trades:', error);
    throw error;
  }
}

/** Shared row-processing: injects strategy_name, multiplier, screenshots, metrics, actual_r. */
function processRows(data: any[]): Trade[] {
  return data.map(trade => {
      let metrics = trade.metrics || {};
      
      // 🔥 FIXED: Support both modes correctly
      if (trade.input_mode === 'risk-only') {
        // Risk-Only mode: use stored values from DB
        // actual_r is calculated from pnl / risk_usd when trade is created
        if (trade.actual_r !== null && trade.actual_r !== undefined) {
          metrics = { ...metrics, actual_r: Number(trade.actual_r) };
        }
        if (trade.actual_user_r !== null && trade.actual_user_r !== undefined) {
          metrics = { ...metrics, actual_user_r: Number(trade.actual_user_r) };
        }
      } else {
        // Summary mode: calculate if not already saved. Skip when contract-R
        // is uncomputable (no stop_price — e.g. broker-synced fills) so the
        // UI can fall back to user-1R from settings instead of locking onto 0.
        if (trade.exit_price && trade.actual_r == null) {
          const calculated_actual_r = calculateActualR(trade);
          if (calculated_actual_r !== null) {
            metrics = { ...metrics, actual_r: calculated_actual_r };
          }
        } else if (trade.actual_r != null) {
          metrics = { ...metrics, actual_r: Number(trade.actual_r) };
        }
      }

      return {
        ...trade,
        strategy_name: (trade.strategies as any)?.name || null,
        multiplier: trade.multiplier || getAssetMultiplier(trade.symbol || ''),
        screenshots: trade.screenshots || [],
        metrics,
        // 🔥 NEW: Also spread actual_r to top level for easier access
        actual_r: metrics.actual_r ?? trade.actual_r ?? null,
        actual_user_r: trade.actual_user_r ?? metrics.actual_user_r ?? null,
      };
    }) as Trade[];
}

// ================================================
// 🔥 PRIMARY HOOK - All Trades - WITH IMPERSONATION SUPPORT
// ================================================

export function useTrades(
  userId?: string,
  portfolioId?: string | null,
  options?: { skipCopyAggregation?: boolean },
  excludePortfolioIds?: string[],
) {
  const { id: effectiveUserId } = useEffectiveUser();
  const { isImpersonating } = useImpersonation();
  const qc = useQueryClient();
  const skipCopyAggregation = options?.skipCopyAggregation ?? false;

  // Use provided userId or fallback to effectiveUserId
  const targetUserId = userId || effectiveUserId;

  // 2026-05-18: Supabase Realtime on trades — sub-second latency from broker fill
  // to journal display. Previously: tradovate-sync cron runs every 5min, then the
  // trades query held a 5min staleTime with no refetchInterval and no realtime
  // listener — worst case 10 minutes from fill to UI. With this channel, INSERTs
  // from the edge function trigger an immediate invalidate.
  useEffect(() => {
    if (!targetUserId) return;
    const channel = supabase
      .channel(`trades-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${targetUserId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['trades', targetUserId] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });
          qc.invalidateQueries({ queryKey: ['has-any-trades'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, qc]);

  const { isDemo } = useJournalDemoMode();
  const { isPreview } = useJournalPreview();

  const query = useQuery({
    queryKey: [
      ...queryKeys.trades(targetUserId || ''),
      isImpersonating ? 'admin' : 'user',
      portfolioId ?? 'all',
      skipCopyAggregation ? 'raw' : 'agg',
      excludePortfolioIds && excludePortfolioIds.length > 0 ? `excl:${excludePortfolioIds.join(',')}` : 'excl:none',
    ],
    queryFn: () => fetchAllTrades(targetUserId!, isImpersonating, portfolioId, skipCopyAggregation, excludePortfolioIds),
    enabled: !!targetUserId,

    // Keep the previous account's rows visible while switching portfolios
    // instead of flashing a skeleton on every change.
    placeholderData: keepPreviousData,

    // 🚀 PERFORMANCE: Aggressive caching
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,

    // 🚀 FIXED: Smart refetch strategy
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    refetchInterval: false,
  });

  // Free-tier preview (JournalFeatureGate, e.g. Shadow / Revenge Radar): always
  // show the rich sample journal regardless of the user's real trade count —
  // these premium surfaces are gated to sample data, real journal pages
  // elsewhere are unaffected since the context only exists under gated routes.
  if (isPreview) {
    return { ...query, data: getDemoTrades() };
  }

  // Zero-trade users see a sample-filled journal on the /app/journal surface
  // only — home dashboard, AI Arena etc. must never render demo data.
  const inJournal = typeof window !== 'undefined' && window.location.pathname.startsWith('/app/journal');
  if (isDemo && inJournal && !query.isLoading && (!query.data || query.data.length === 0)) {
    return { ...query, data: getDemoTrades() };
  }
  return query;
}

// ================================================
// 🔥 OPTIMIZED: Stable Trade Stats (No Re-calculations)
// ================================================

export function useTradeStats(): {
  data: TradeStats | undefined;
  isLoading: boolean;
} {
  const { data: trades, isLoading } = useTrades();
  
  // 🚀 CRITICAL: Use stable reference to prevent re-calculations
  const tradesRef = useRef<Trade[]>([]);
  const statsRef = useRef<TradeStats | undefined>(undefined);
  
  // 🚀 Only recalculate if trades actually changed (deep comparison of IDs)
  useEffect(() => {
    if (!trades || trades.length === 0) {
      statsRef.current = undefined;
      return;
    }
    
    // Compare by IDs and updated_at to detect real changes
    const currentIds = trades.map(t => `${t.id}-${t.updated_at}`).join(',');
    const previousIds = tradesRef.current.map(t => `${t.id}-${t.updated_at}`).join(',');
    
    if (currentIds === previousIds) {
      // No change - skip recalculation
      return;
    }
    
    // Trades changed - recalculate
    tradesRef.current = trades;
    statsRef.current = calculateTradeStats(trades);
  }, [trades]);

  return { 
    data: statsRef.current, 
    isLoading 
  };
}

// 🚀 Extracted calculation function - 🔥 FIXED: Support Risk-Only mode
function calculateTradeStats(trades: Trade[]): TradeStats {
  const closedTrades = trades.filter(t => {
    if (t.input_mode === 'risk-only') {
      // 🔥 FIX: pnl can be 0 (break even) - check for existence, not truthiness
      return t.pnl !== null && t.pnl !== undefined;
    }
    return t.exit_price != null;
  });
  
  const total = closedTrades.length;
  if (total === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      winRate: 0,
      totalPnL: 0,
      avgR: 0,
    };
  }

  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let totalPnL = 0;
  let totalR = 0;
  let rCount = 0;

  // 🚀 OPTIMIZED: Single pass
  for (const trade of closedTrades) {
    const pnl = Number(trade.pnl) || 0;
    
    // 🔥 FIX: Calculate outcome for Risk-Only trades
    let outcome = trade.outcome || 'OPEN';
    if (trade.input_mode === 'risk-only' && trade.pnl !== null && trade.pnl !== undefined) {
      if (pnl > 0) outcome = 'WIN';
      else if (pnl < 0) outcome = 'LOSS';
      else outcome = 'BE';
    }
    
    // Canonical R: strategy-planned → stop-based, never global user-1R
    const actualR = tradeR(trade);

    if (outcome === 'WIN') wins++;
    else if (outcome === 'LOSS') losses++;
    else if (outcome === 'BE') breakeven++;

    totalPnL += pnl;

    if (actualR !== null) {
      totalR += actualR;
      rCount++;
    }
  }

  return {
    totalTrades: total,
    wins,
    losses,
    breakeven,
    winRate: (wins / total) * 100,
    totalPnL,
    avgR: rCount > 0 ? totalR / rCount : 0,
  };
}

// ================================================
// 🔥 SINGLE TRADE - By ID
// ================================================

export function useTrade(tradeId: string | null) {
  const { id: userId } = useEffectiveUser();
  const { isImpersonating } = useImpersonation();

  return useQuery({
    queryKey: [...queryKeys.tradeDetail(tradeId || ''), isImpersonating ? 'admin' : 'user'],
    queryFn: async () => {
      if (!tradeId || !userId) throw new Error('No trade ID or user ID');

      const { data, error } = await supabase
        .from('trades')
        .select(`
          *,
          strategies (
            name
          )
        `)
        .eq('id', tradeId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      
      // 🔥 Process with strategy name and screenshots
      return {
        ...data,
        strategy_name: (data.strategies as any)?.name || null,
        screenshots: data.screenshots || [],
      } as Trade;
    },
    enabled: !!tradeId && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// ================================================
// 🔥 CREATE TRADE - With Optimistic Update
// ================================================

export function useCreateTrade() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();
  const { isImpersonating } = useImpersonation();

  return useMutation({
    mutationFn: async (tradeData: Partial<Trade>) => {
      if (!userId) throw new Error('No user ID');

      console.log('📝 Creating trade for user:', userId);

      // 🔥 Always use regular supabase for mutations (they have user context)
      const { data, error } = await supabase
        .from('trades')
        .insert([{ ...tradeData, user_id: userId }])
        .select(`
          *,
          strategies (
            name
          )
        `)
        .single();

      if (error) throw error;

      console.log('✅ Trade created:', data.id);
      
      // 🔥 Process with strategy name and screenshots
      return {
        ...data,
        strategy_name: (data.strategies as any)?.name || null,
        screenshots: data.screenshots || [],
      } as Trade;
    },
    
    onMutate: async (newTrade) => {
      const queryKey = [...queryKeys.trades(userId || ''), isImpersonating ? 'admin' : 'user'];
      await queryClient.cancelQueries({ queryKey });

      const previousTrades = queryClient.getQueryData<Trade[]>(queryKey);

      if (previousTrades) {
        const optimisticTrade: Trade = {
          id: `temp-${Date.now()}`,
          user_id: userId!,
          symbol: newTrade.symbol || '',
          side: newTrade.side || 'LONG',
          entry_price: newTrade.entry_price || 0,
          stop_price: newTrade.stop_price || 0,
          quantity: newTrade.quantity || 0,
          fees: newTrade.fees || 0,
          open_at: new Date().toISOString(),
          outcome: 'OPEN',
          pnl: 0,
          multiplier: 1,
          screenshots: newTrade.screenshots || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...newTrade,
        } as Trade;

        queryClient.setQueryData<Trade[]>(queryKey, [optimisticTrade, ...previousTrades]);
      }

      return { previousTrades, queryKey };
    },
    
    onError: (err, newTrade, context) => {
      if (context?.previousTrades && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTrades);
      }
    },
    
    onSuccess: () => {
      // 🚀 Invalidate to trigger fresh fetch
      const queryKey = [...queryKeys.trades(userId || ''), isImpersonating ? 'admin' : 'user'];
      queryClient.invalidateQueries({ queryKey });
      // First real trade flips demo mode off immediately.
      queryClient.invalidateQueries({ queryKey: ['has-any-trades'] });
    },
  });
}

// ================================================
// 🔥 UPDATE TRADE - With Optimistic Update
// ================================================

export function useUpdateTrade() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();
  const { isImpersonating } = useImpersonation();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Trade> }) => {
      if (!userId) throw new Error('No user ID');

      console.log('✏️ Updating trade:', id);

      // 🔥 Always use regular supabase for mutations
      const { error: updateError } = await supabase
        .from('trades')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      const { data: updated, error: fetchError } = await supabase
        .from('trades')
        .select(`
          *,
          strategies (
            name
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      console.log('✅ Trade updated:', id);
      
      // 🔥 Process with strategy name and screenshots
      return {
        ...updated,
        strategy_name: (updated.strategies as any)?.name || null,
        screenshots: updated.screenshots || [],
      } as Trade;
    },
    
    onMutate: async ({ id, data }) => {
      const queryKey = [...queryKeys.trades(userId || ''), isImpersonating ? 'admin' : 'user'];
      await queryClient.cancelQueries({ queryKey });

      const previousTrades = queryClient.getQueryData<Trade[]>(queryKey);

      if (previousTrades) {
        queryClient.setQueryData<Trade[]>(
          queryKey,
          previousTrades.map(trade =>
            trade.id === id ? { 
              ...trade, 
              ...data, 
              screenshots: data.screenshots || trade.screenshots || [],
              updated_at: new Date().toISOString() 
            } : trade
          )
        );
      }

      return { previousTrades, queryKey };
    },
    
    onError: (err, variables, context) => {
      if (context?.previousTrades && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTrades);
      }
    },
    
    onSuccess: () => {
      const queryKey = [...queryKeys.trades(userId || ''), isImpersonating ? 'admin' : 'user'];
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// ================================================
// 🔥 DELETE TRADE - With Optimistic Update
// ================================================

export function useDeleteTrade() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();
  const { isImpersonating } = useImpersonation();

  return useMutation({
    mutationFn: async (tradeId: string) => {
      if (!userId) throw new Error('No user ID');

      console.log('🗑️ Deleting trade:', tradeId);

      // 🔥 Always use regular supabase for mutations
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId)
        .eq('user_id', userId);

      if (error) throw error;

      console.log('✅ Trade deleted:', tradeId);
      return tradeId;
    },
    
    onMutate: async (tradeId) => {
      const queryKey = [...queryKeys.trades(userId || ''), isImpersonating ? 'admin' : 'user'];
      await queryClient.cancelQueries({ queryKey });

      const previousTrades = queryClient.getQueryData<Trade[]>(queryKey);

      if (previousTrades) {
        queryClient.setQueryData<Trade[]>(queryKey, previousTrades.filter(t => t.id !== tradeId));
      }

      return { previousTrades, queryKey };
    },
    
    onError: (err, tradeId, context) => {
      if (context?.previousTrades && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTrades);
      }
    },
    
    onSuccess: () => {
      const queryKey = [...queryKeys.trades(userId || ''), isImpersonating ? 'admin' : 'user'];
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// ================================================
// 🔥 FILTERED QUERIES - Memoized with Stable References
// ================================================

export function useOpenTrades() {
  const { data: allTrades, isLoading } = useTrades();
  
  // 🚀 Stable reference - only changes when actual data changes
  const openTrades = useMemo(() => {
    if (!allTrades) return [];
    return allTrades.filter(t => t.outcome === 'OPEN');
  }, [allTrades]);

  return { data: openTrades, isLoading };
}

export function useStrategyTrades(strategyId: string | null) {
  const { data: allTrades, isLoading } = useTrades();

  const strategyTrades = useMemo(() => {
    if (!allTrades || !strategyId) return [];
    return allTrades.filter(t => t.strategy_id === strategyId);
  }, [allTrades, strategyId]);

  return { data: strategyTrades, isLoading };
}

export function useTradesByDateRange(startDate: string, endDate: string) {
  const { data: allTrades, isLoading } = useTrades();

  const filteredTrades = useMemo(() => {
    if (!allTrades || !startDate || !endDate) return [];
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    return allTrades.filter(t => {
      const tradeTime = new Date(t.open_at).getTime();
      return tradeTime >= start && tradeTime <= end;
    });
  }, [allTrades, startDate, endDate]);

  return { data: filteredTrades, isLoading };
}

// ================================================
// 🔥 BULK DELETE - With Optimistic Update
// ================================================

export function useBulkDeleteTrades() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();
  const { isImpersonating } = useImpersonation();

  return useMutation({
    mutationFn: async (tradeIds: string[]) => {
      if (!userId) throw new Error('No user ID');

      console.log('🗑️ Bulk deleting trades:', tradeIds.length);

      // 🔥 Always use regular supabase for mutations
      const { error } = await supabase
        .from('trades')
        .delete()
        .in('id', tradeIds)
        .eq('user_id', userId);

      if (error) throw error;
      
      console.log('✅ Bulk delete completed');
      return tradeIds;
    },
    
    onMutate: async (tradeIds) => {
      const queryKey = [...queryKeys.trades(userId || ''), isImpersonating ? 'admin' : 'user'];
      await queryClient.cancelQueries({ queryKey });

      const previousTrades = queryClient.getQueryData<Trade[]>(queryKey);

      if (previousTrades) {
        const tradeIdSet = new Set(tradeIds);
        queryClient.setQueryData<Trade[]>(queryKey, previousTrades.filter(t => !tradeIdSet.has(t.id)));
      }

      return { previousTrades, queryKey };
    },
    
    onError: (err, tradeIds, context) => {
      if (context?.previousTrades && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTrades);
      }
    },
    
    onSuccess: () => {
      const queryKey = [...queryKeys.trades(userId || ''), isImpersonating ? 'admin' : 'user'];
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

import { aggregateCopiedTrades, type AggregationMode } from '@/lib/tradeAggregation';
