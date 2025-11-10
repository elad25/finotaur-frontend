import { useMemo } from 'react';
import { useTrades } from './useTradesData';
import { calculateActualR } from './useRiskSettings';

interface TradeWithCalculations {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_price: number;
  stop_price: number;
  take_profit_price?: number;
  exit_price?: number;
  quantity: number;
  fees: number;
  open_at: string;
  close_at?: string;
  session?: string;
  strategy_id?: string;
  strategy_name?: string;
  setup?: string;
  notes?: string;
  screenshot_url?: string;
  asset_class?: string;
  outcome?: "WIN" | "LOSS" | "BE" | "OPEN";
  pnl?: number;
  quality_tag?: string;
  multiplier?: number;
  created_at?: string;
  mistake?: string;
  next_time?: string;
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
  // 🔥 חישובים שנעשים פעם אחת
  _computed: {
    pnl: number;
    actualR: number | null;
    riskUSD: number;
    outcome: string;
    multiplier: number;
  };
}

interface Stats {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgR: number;
  wins: number;
  losses: number;
  breakeven: number;
}

/**
 * 🚀 OPTIMIZED: Hook שמחשב הכל פעם אחת ושומר בזיכרון
 * במקום לחשב בכל render - מחשבים רק כש-trades או oneR משתנים
 */
export function useOptimizedTrades(oneR: number) {
  const { data: rawTrades = [], isLoading, error } = useTrades();

  // 🔥 חישוב מראש של כל ה-trades עם ה-metrics שלהם
  const tradesWithCalculations = useMemo<TradeWithCalculations[]>(() => {
    return rawTrades.map(trade => {
      const pnl = trade.pnl ?? 0;
      const outcome = trade.outcome ?? 'OPEN';
      const actualR = trade.exit_price && oneR > 0 
        ? calculateActualR(pnl, oneR)
        : null;
      const riskUSD = trade.metrics?.riskUSD ?? 0;
      const multiplier = trade.multiplier ?? 1;

      return {
        ...trade,
        _computed: {
          pnl,
          actualR,
          riskUSD,
          outcome,
          multiplier,
        }
      };
    });
  }, [rawTrades, oneR]);

  // 🔥 חישוב stats פעם אחת
  const stats = useMemo<Stats>(() => {
    const closedTrades = tradesWithCalculations.filter(
      t => t.exit_price !== null && t.exit_price !== undefined
    );
    const total = closedTrades.length;
    
    if (total === 0) {
      return { 
        totalTrades: 0, 
        winRate: 0, 
        totalPnL: 0, 
        avgR: 0, 
        wins: 0, 
        losses: 0, 
        breakeven: 0 
      };
    }

    let wins = 0, losses = 0, breakeven = 0, totalPnL = 0, totalR = 0, rCount = 0;

    closedTrades.forEach(trade => {
      const { pnl, actualR, outcome } = trade._computed;
      
      if (outcome === "WIN") wins++;
      else if (outcome === "LOSS") losses++;
      else if (outcome === "BE") breakeven++;

      totalPnL += pnl;

      if (actualR !== null && actualR !== undefined) {
        totalR += actualR;
        rCount++;
      }
    });

    return {
      totalTrades: total,
      winRate: (wins / total) * 100,
      totalPnL,
      avgR: rCount > 0 ? totalR / rCount : 0,
      wins,
      losses,
      breakeven,
    };
  }, [tradesWithCalculations]);

  return {
    trades: tradesWithCalculations,
    stats,
    isLoading,
    error,
  };
}