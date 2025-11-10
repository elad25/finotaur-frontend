import { useMemo } from 'react';

export interface StrategyStats {
  totalTrades: number;
  winRate: number;
  totalR: number;
  netPnL: number;
  wins: number;
  losses: number;
  breakeven: number;
  avgR: number;
  avgWinR: number;
  avgLossR: number;
  avgRR: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  expectancy: number;
  maxConsecutiveWins?: number;
  maxConsecutiveLosses?: number;
  longestWinStreak?: number;
  longestLossStreak?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  consistency?: number;
  avgTradeDuration?: number;
  stdDevR?: number;
  tradesHitting1R?: number;
  prematurelyClosed?: number;
}

export function getStrategyName(strategy: string | { id: string; name: string } | undefined): string {
  if (!strategy) return 'No Strategy';
  if (typeof strategy === 'string') return strategy;
  if (typeof strategy === 'object' && strategy.name) return strategy.name;
  return 'No Strategy';
}

/**
 * 🚀 OPTIMIZED: Single pass calculation
 */
export function calculateAllStats(trades: any[]): StrategyStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0, winRate: 0, totalR: 0, netPnL: 0,
      wins: 0, losses: 0, breakeven: 0, avgR: 0,
      avgWinR: 0, avgLossR: 0, avgRR: 0,
      largestWin: 0, largestLoss: 0, profitFactor: 0,
      expectancy: 0, maxConsecutiveWins: 0, maxConsecutiveLosses: 0,
      longestWinStreak: 0, longestLossStreak: 0, maxDrawdown: 0,
      sharpeRatio: 0, sortinoRatio: 0, consistency: 0,
      avgTradeDuration: 0, stdDevR: 0, tradesHitting1R: 0, prematurelyClosed: 0,
    };
  }

  let wins = 0, losses = 0, breakeven = 0;
  let totalR = 0, netPnL = 0;
  let totalWinR = 0, totalLossR = 0;
  let largestWin = 0, largestLoss = 0;
  let currentStreak = 0, maxConsecutiveWins = 0, maxConsecutiveLosses = 0;
  let lastOutcome = '';
  let rValues: number[] = [];
  let peakR = 0, maxDD = 0, runningR = 0;
  let durations: number[] = [];
  let negativeReturns: number[] = [];
  let tradesHitting1R = 0;
  let prematurelyClosed = 0;
  let totalWinAmount = 0;
  let totalLossAmount = 0;

  // 🚀 SINGLE PASS
  for (const trade of trades) {
    const r = trade.metrics?.rr || 0;
    const pnl = trade.pnl || 0;
    
    totalR += r;
    runningR += r;
    rValues.push(r);
    netPnL += pnl;

    if (r >= 1) tradesHitting1R++;
    
    if (trade.exit_price && trade.take_profit_price) {
      const side = trade.side;
      const reachedTP = side === 'LONG' 
        ? trade.exit_price >= trade.take_profit_price
        : trade.exit_price <= trade.take_profit_price;
      if (!reachedTP && r > 0) prematurelyClosed++;
    }

    const outcome = trade.outcome || (pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE');
    
    if (outcome === 'WIN') {
      wins++;
      totalWinR += r;
      totalWinAmount += pnl;
      if (r > largestWin) largestWin = r;
      currentStreak = lastOutcome === 'WIN' ? currentStreak + 1 : 1;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentStreak);
    } else if (outcome === 'LOSS') {
      losses++;
      totalLossR += Math.abs(r);
      totalLossAmount += Math.abs(pnl);
      if (Math.abs(r) > Math.abs(largestLoss)) largestLoss = r;
      negativeReturns.push(r);
      currentStreak = lastOutcome === 'LOSS' ? currentStreak + 1 : 1;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentStreak);
    } else {
      breakeven++;
      currentStreak = 0;
    }
    
    lastOutcome = outcome;
    
    if (runningR > peakR) peakR = runningR;
    const currentDD = peakR - runningR;
    if (currentDD > maxDD) maxDD = currentDD;
    
    if (trade.open_at && trade.close_at) {
      const duration = new Date(trade.close_at).getTime() - new Date(trade.open_at).getTime();
      durations.push(duration / (1000 * 60 * 60));
    }
  }

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgR = totalTrades > 0 ? totalR / totalTrades : 0;
  const avgWinR = wins > 0 ? totalWinR / wins : 0;
  const avgLossR = losses > 0 ? totalLossR / losses : 0;
  const avgRR = avgLossR > 0 ? avgWinR / avgLossR : 0;

  const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;
  const lossRate = totalTrades > 0 ? (losses / totalTrades) : 0;
  const expectancy = (winRate / 100 * avgWinR) - (lossRate * avgLossR);
  
  const meanR = avgR;
  const variance = rValues.reduce((sum, r) => sum + Math.pow(r - meanR, 2), 0) / totalTrades;
  const stdDevR = Math.sqrt(variance);
  const sharpeRatio = stdDevR > 0 ? meanR / stdDevR : 0;
  
  const downsideMean = negativeReturns.length > 0 
    ? negativeReturns.reduce((a, b) => a + b, 0) / negativeReturns.length : 0;
  const downsideVariance = negativeReturns.length > 0
    ? negativeReturns.reduce((sum, r) => sum + Math.pow(r - downsideMean, 2), 0) / negativeReturns.length : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStdDev > 0 ? meanR / downsideStdDev : 0;
  
  const consistency = stdDevR > 0 ? (meanR / stdDevR) * 100 : 0;
  const avgTradeDuration = durations.length > 0 
    ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  return {
    totalTrades, winRate, totalR, netPnL, wins, losses, breakeven,
    avgR, avgWinR, avgLossR, avgRR, largestWin, largestLoss,
    profitFactor, expectancy, maxConsecutiveWins, maxConsecutiveLosses,
    longestWinStreak: maxConsecutiveWins, longestLossStreak: maxConsecutiveLosses,
    maxDrawdown: maxDD, sharpeRatio, sortinoRatio, consistency,
    avgTradeDuration, stdDevR, tradesHitting1R, prematurelyClosed,
  };
}

/**
 * 🚀 OPTIMIZED: Calculate breakdown efficiently
 */
export function calculateBreakdown(trades: any[]) {
  const strategyMap = new Map<string, any[]>();
  trades.forEach(trade => {
    const strategyName = trade.strategy_name || 
                         getStrategyName(trade.strategy) || 
                         'No Strategy';
    if (!strategyMap.has(strategyName)) strategyMap.set(strategyName, []);
    strategyMap.get(strategyName)!.push(trade);
  });
  const byStrategy = Array.from(strategyMap.entries()).map(([name, trades]) => ({
    name,
    stats: calculateAllStats(trades)
  })).sort((a, b) => b.stats.totalR - a.stats.totalR);

  const assetMap = new Map<string, any[]>();
  trades.forEach(trade => {
    const asset = trade.symbol || 'Unknown';
    if (!assetMap.has(asset)) assetMap.set(asset, []);
    assetMap.get(asset)!.push(trade);
  });
  const byAsset = Array.from(assetMap.entries()).map(([name, trades]) => ({
    name, stats: calculateAllStats(trades)
  })).sort((a, b) => b.stats.totalR - a.stats.totalR);

  const sessionMap = new Map<string, any[]>();
  trades.forEach(trade => {
    const session = trade.session || 'No Session';
    if (!sessionMap.has(session)) sessionMap.set(session, []);
    sessionMap.get(session)!.push(trade);
  });
  const bySession = Array.from(sessionMap.entries()).map(([name, trades]) => ({
    name, stats: calculateAllStats(trades)
  })).sort((a, b) => b.stats.totalR - a.stats.totalR);

  const dayMap = new Map<string, any[]>();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  trades.forEach(trade => {
    if (trade.open_at) {
      const day = dayNames[new Date(trade.open_at).getDay()];
      if (!dayMap.has(day)) dayMap.set(day, []);
      dayMap.get(day)!.push(trade);
    }
  });
  const byDayOfWeek = dayNames.map(day => ({
    name: day,
    stats: calculateAllStats(dayMap.get(day) || [])
  }));

  const directionMap = new Map<string, any[]>();
  trades.forEach(trade => {
    const direction = trade.side || 'Unknown';
    if (!directionMap.has(direction)) directionMap.set(direction, []);
    directionMap.get(direction)!.push(trade);
  });
  const byDirection = Array.from(directionMap.entries()).map(([name, trades]) => ({
    name, stats: calculateAllStats(trades)
  }));

  return { byStrategy, byAsset, bySession, byDayOfWeek, byDirection };
}

/**
 * 🚀 Hook for memoized trade calculations
 */
export function useTradeCalculations(trades: any[], timeRange: string) {
  const filteredTrades = useMemo(() => {
    if (timeRange === 'ALL') return trades;
    
    const now = new Date();
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return trades.filter(t => new Date(t.open_at) >= cutoff);
  }, [trades, timeRange]);

  const currentStats = useMemo(() => 
    calculateAllStats(filteredTrades),
    [filteredTrades]
  );

  const previousStats = useMemo(() => {
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : timeRange === '90D' ? 90 : 30;
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);
    
    const previousTrades = trades.filter(t => {
      const date = new Date(t.open_at);
      return date >= previousStart && date < currentStart;
    });
    
    return calculateAllStats(previousTrades);
  }, [trades, timeRange]);

  const breakdown = useMemo(() => 
    calculateBreakdown(filteredTrades),
    [filteredTrades]
  );

  const changes = useMemo(() => ({
    winRateChange: currentStats.winRate - previousStats.winRate,
    pnlChange: currentStats.netPnL - previousStats.netPnL,
    avgRChange: currentStats.avgR - previousStats.avgR,
  }), [currentStats, previousStats]);

  return {
    filteredTrades,
    currentStats,
    previousStats,
    breakdown,
    changes,
  };
}