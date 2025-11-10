import { useMemo } from 'react';
import { useTrades } from './useTradesData';
import {
  calculateAllStats,
  calculateBreakdown,
  generateAIInsights,
  findBestWorstTrades,
  getMomentumIndicator,
  type Trade,
} from '@/utils/statsCalculations';

type TimeRange = '7D' | '30D' | '90D' | 'ALL';

export function useAnalyticsData(timeRange: TimeRange) {
  const { data: allTrades = [], isLoading, isError } = useTrades();
  
  // 🚀 חישוב ONCE - closedTrades
  const closedTrades = useMemo(
    () => allTrades.filter((t: any) => t.exit_price),
    [allTrades]
  );
  
  // 🚀 חישוב ONCE - filteredTrades לפי timeRange
  const filteredTrades = useMemo(() => {
    if (timeRange === 'ALL') return closedTrades;
    
    const now = Date.now();
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    
    return closedTrades.filter((t: any) => new Date(t.open_at).getTime() >= cutoff);
  }, [closedTrades, timeRange]);
  
  // 🚀 חישוב ONCE - previous period trades
  const previousTrades = useMemo(() => {
    if (timeRange === 'ALL') return [];
    
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 90;
    const now = Date.now();
    const currentStart = now - days * 24 * 60 * 60 * 1000;
    const previousStart = currentStart - days * 24 * 60 * 60 * 1000;
    
    return closedTrades.filter((t: any) => {
      const time = new Date(t.open_at).getTime();
      return time >= previousStart && time < currentStart;
    });
  }, [closedTrades, timeRange]);
  
  // 🚀 חישוב ONCE - stats
  const stats = useMemo(
    () => calculateAllStats(filteredTrades as Trade[]),
    [filteredTrades]
  );
  
  const previousStats = useMemo(
    () => calculateAllStats(previousTrades as Trade[]),
    [previousTrades]
  );
  
  // 🚀 חישוב ONCE - breakdown (יקר!)
  const breakdown = useMemo(
    () => calculateBreakdown(filteredTrades as Trade[]),
    [filteredTrades]
  );
  
  // 🚀 חישוב ONCE - insights
  const insights = useMemo(
    () => generateAIInsights(stats, breakdown, filteredTrades as Trade[]),
    [stats, breakdown, filteredTrades]
  );
  
  // 🚀 חישוב ONCE - best/worst
  const bestWorst = useMemo(
    () => findBestWorstTrades(filteredTrades as Trade[]),
    [filteredTrades]
  );
  
  // 🚀 חישוב ONCE - momentum
  const momentum = useMemo(
    () => getMomentumIndicator(filteredTrades as Trade[]),
    [filteredTrades]
  );
  
  // 🚀 חישוב ONCE - changes
  const changes = useMemo(() => ({
    winRateChange: stats.winRate - previousStats.winRate,
    pnlChange: stats.netPnL - previousStats.netPnL,
    avgRChange: stats.avgR - previousStats.avgR,
  }), [stats, previousStats]);
  
  return {
    allTrades,
    closedTrades,
    filteredTrades,
    stats,
    previousStats,
    breakdown,
    insights,
    bestWorst,
    momentum,
    changes,
    isLoading,
    isError,
  };
}