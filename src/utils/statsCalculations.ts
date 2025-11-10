// ================================================
// 🚀 OPTIMIZED: Stats Calculations
// ================================================
// All calculation functions extracted for reusability
// Single-pass algorithms for maximum performance
// ================================================

// ==========================================
// TYPES
// ==========================================

export interface Trade {
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
  strategy?: string | { id: string; name: string };
  strategy_name?: string;
  strategy_id?: string;
  setup?: string;
  notes?: string;
  screenshot_url?: string;
  asset_class?: string;
  outcome?: "WIN" | "LOSS" | "BE" | "OPEN";
  pnl?: number;
  quality_tag?: string;
  metrics?: {
    rr?: number;
    riskUSD?: number;
    rewardUSD?: number;
    riskPts?: number;
    rewardPts?: number;
    actual_r?: number;
  };
}

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

export interface BreakdownData {
  byStrategy: { name: string; stats: StrategyStats }[];
  byAsset: { name: string; stats: StrategyStats }[];
  bySession: { name: string; stats: StrategyStats }[];
  byDayOfWeek: { name: string; stats: StrategyStats }[];
  byDirection: { name: string; stats: StrategyStats }[];
}

// ==========================================
// 🚀 HELPER FUNCTIONS
// ==========================================

export function getStrategyName(strategy: string | { id: string; name: string } | undefined): string {
  if (!strategy) return 'No Strategy';
  if (typeof strategy === 'string') return strategy;
  if (typeof strategy === 'object' && strategy.name) return strategy.name;
  return 'No Strategy';
}

// ==========================================
// 🚀 CALCULATE ALL STATS - Single Pass
// ==========================================

export function calculateAllStats(trades: Trade[]): StrategyStats {
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

  // 🚀 SINGLE PASS - Calculate everything at once
  for (const trade of trades) {
    const r = trade.metrics?.rr || trade.metrics?.actual_r || 0;
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

// ==========================================
// 🚀 CALCULATE BREAKDOWN - Efficient Grouping
// ==========================================

export function calculateBreakdown(trades: Trade[]): BreakdownData {
  const strategyMap = new Map<string, Trade[]>();
  const assetMap = new Map<string, Trade[]>();
  const sessionMap = new Map<string, Trade[]>();
  const dayMap = new Map<string, Trade[]>();
  const directionMap = new Map<string, Trade[]>();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // 🚀 Single iteration to group all data
  trades.forEach(trade => {
    const strategyName = trade.strategy_name || getStrategyName(trade.strategy) || 'No Strategy';
    const asset = trade.symbol || 'Unknown';
    const session = trade.session || 'No Session';
    const direction = trade.side || 'Unknown';
    
    if (!strategyMap.has(strategyName)) strategyMap.set(strategyName, []);
    strategyMap.get(strategyName)!.push(trade);
    
    if (!assetMap.has(asset)) assetMap.set(asset, []);
    assetMap.get(asset)!.push(trade);
    
    if (!sessionMap.has(session)) sessionMap.set(session, []);
    sessionMap.get(session)!.push(trade);
    
    if (!directionMap.has(direction)) directionMap.set(direction, []);
    directionMap.get(direction)!.push(trade);
    
    if (trade.open_at) {
      const day = dayNames[new Date(trade.open_at).getDay()];
      if (!dayMap.has(day)) dayMap.set(day, []);
      dayMap.get(day)!.push(trade);
    }
  });
  
  const byStrategy = Array.from(strategyMap.entries()).map(([name, trades]) => ({
    name, stats: calculateAllStats(trades)
  })).sort((a, b) => b.stats.totalR - a.stats.totalR);
  
  const byAsset = Array.from(assetMap.entries()).map(([name, trades]) => ({
    name, stats: calculateAllStats(trades)
  })).sort((a, b) => b.stats.totalR - a.stats.totalR);
  
  const bySession = Array.from(sessionMap.entries()).map(([name, trades]) => ({
    name, stats: calculateAllStats(trades)
  })).sort((a, b) => b.stats.totalR - a.stats.totalR);
  
  const byDayOfWeek = dayNames.map(day => ({
    name: day,
    stats: calculateAllStats(dayMap.get(day) || [])
  }));
  
  const byDirection = Array.from(directionMap.entries()).map(([name, trades]) => ({
    name, stats: calculateAllStats(trades)
  }));

  return { byStrategy, byAsset, bySession, byDayOfWeek, byDirection };
}

// ==========================================
// 🚀 FIND BEST/WORST TRADES
// ==========================================

export interface BestWorstTrade {
  trade: Trade;
  r: number;
  date: string;
}

export function findBestWorstTrades(trades: Trade[]): { 
  best: BestWorstTrade | null; 
  worst: BestWorstTrade | null 
} {
  if (trades.length === 0) return { best: null, worst: null };

  let best: BestWorstTrade | null = null;
  let worst: BestWorstTrade | null = null;

  trades.forEach(trade => {
    const r = trade.metrics?.rr || trade.metrics?.actual_r || 0;
    const date = new Date(trade.open_at).toLocaleDateString();
    
    if (!best || r > best.r) {
      best = { trade, r, date };
    }
    if (!worst || r < worst.r) {
      worst = { trade, r, date };
    }
  });

  return { best, worst };
}

// ==========================================
// 🚀 GET MOMENTUM INDICATOR
// ==========================================

export function getMomentumIndicator(trades: Trade[]): { 
  score: number; 
  label: string; 
  color: string 
} {
  if (trades.length < 5) return { score: 50, label: 'Neutral', color: '#C9A646' };

  const recent = trades.slice(-5);
  const totalR = recent.reduce((sum, t) => sum + (t.metrics?.rr || t.metrics?.actual_r || 0), 0);
  const avgR = totalR / recent.length;

  if (avgR >= 1) return { score: 85, label: 'Strong Positive', color: '#00C46C' };
  if (avgR >= 0.5) return { score: 65, label: 'Positive', color: '#C9A646' };
  if (avgR >= 0) return { score: 50, label: 'Neutral', color: '#9A9A9A' };
  if (avgR >= -0.5) return { score: 35, label: 'Negative', color: '#FF6B6B' };
  return { score: 15, label: 'Strong Negative', color: '#E44545' };
}

// ==========================================
// 🚀 GENERATE AI INSIGHTS
// ==========================================

export interface AIInsight {
  type: 'strength' | 'weakness' | 'tip' | 'warning';
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function generateAIInsights(
  stats: StrategyStats, 
  breakdown: BreakdownData, 
  trades: Trade[]
): AIInsight[] {
  const insights: AIInsight[] = [];

  if (stats.winRate >= 60) {
    insights.push({
      type: 'strength',
      title: 'Exceptional Win Rate',
      description: `Your ${stats.winRate.toFixed(0)}% win rate is outstanding. Keep following your edge.`,
    });
  }

  if (stats.totalTrades >= 10) {
    const recentTrades = trades.slice(-10);
    const oldTrades = trades.slice(-20, -10);
    if (oldTrades.length > 0) {
      const recentPnL = recentTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const oldPnL = oldTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const efficiency = oldPnL !== 0 ? ((recentPnL - oldPnL) / Math.abs(oldPnL)) * 100 : 0;
      
      if (efficiency > 15) {
        insights.push({
          type: 'strength',
          title: 'Trading Efficiency Improved',
          description: `You're trading smarter. Efficiency improved by ${efficiency.toFixed(0)}% in recent trades.`,
        });
      }
    }
  }

  if (stats.avgLossR < 0.8 && stats.losses >= 3) {
    insights.push({
      type: 'strength',
      title: 'Superior Loss Control',
      description: `Average loss of ${Math.abs(stats.avgLossR).toFixed(2)}R shows excellent discipline in cutting losses.`,
    });
  }

  if (breakdown.byStrategy.length > 0) {
    const best = breakdown.byStrategy[0];
    if (best.stats.totalTrades >= 3 && best.stats.totalR > 0) {
      insights.push({
        type: 'tip',
        title: 'Top Strategy Identified',
        description: `${best.name} is your edge with +${best.stats.totalR.toFixed(1)}R. Allocate more capital here.`,
      });
    }
  }

  if ((stats.maxConsecutiveLosses || 0) >= 3) {
    insights.push({
      type: 'warning',
      title: 'Streak Management Needed',
      description: `${stats.maxConsecutiveLosses} consecutive losses detected. Implement mandatory breaks after 2 losses.`,
    });
  }

  if (breakdown.bySession.length > 0 && breakdown.byAsset.length > 0) {
    const bestSession = breakdown.bySession[0];
    const bestAsset = breakdown.byAsset[0];
    if (bestSession.stats.totalTrades >= 3 && bestAsset.stats.totalTrades >= 3) {
      insights.push({
        type: 'tip',
        title: 'Optimal Trading Combination',
        description: `${bestAsset.name} during ${bestSession.name} session averages ${bestSession.stats.avgRR.toFixed(1)} R:R.`,
      });
    }
  }

  if (stats.prematurelyClosed && stats.prematurelyClosed > stats.totalTrades * 0.3) {
    const percentage = ((stats.prematurelyClosed / stats.totalTrades) * 100).toFixed(0);
    insights.push({
      type: 'weakness',
      title: 'Early Exit Pattern Detected',
      description: `You closed ${percentage}% of winning trades early. This suggests loss aversion bias - let winners run.`,
    });
  }

  return insights;
}

// ==========================================
// 🚀 FIND BEST COMBINATIONS
// ==========================================

export function findBestCombinations(trades: Trade[]): any {
  const assetSessionMap = new Map<string, Trade[]>();
  const strategySessionMap = new Map<string, Trade[]>();
  const strategyAssetMap = new Map<string, Trade[]>();
  
  trades.forEach(trade => {
    const asset = trade.symbol || 'Unknown';
    const session = trade.session || 'No Session';
    const strategy = trade.strategy_name || getStrategyName(trade.strategy) || 'No Strategy';
    
    const asKey = `${asset}___${session}`;
    if (!assetSessionMap.has(asKey)) assetSessionMap.set(asKey, []);
    assetSessionMap.get(asKey)!.push(trade);
    
    const ssKey = `${strategy}___${session}`;
    if (!strategySessionMap.has(ssKey)) strategySessionMap.set(ssKey, []);
    strategySessionMap.get(ssKey)!.push(trade);
    
    const saKey = `${strategy}___${asset}`;
    if (!strategyAssetMap.has(saKey)) strategyAssetMap.set(saKey, []);
    strategyAssetMap.get(saKey)!.push(trade);
  });
  
  let bestAssetSession = null;
  let maxASR = -Infinity;
  
  assetSessionMap.forEach((trades, key) => {
    if (trades.length >= 2) {
      const stats = calculateAllStats(trades);
      if (stats.totalR > maxASR) {
        maxASR = stats.totalR;
        const [asset, session] = key.split('___');
        bestAssetSession = {
          asset, session,
          totalR: stats.totalR,
          winRate: stats.winRate,
          trades: trades.length,
        };
      }
    }
  });
  
  let bestStrategySession = null;
  let maxSSR = -Infinity;
  
  strategySessionMap.forEach((trades, key) => {
    if (trades.length >= 2) {
      const stats = calculateAllStats(trades);
      if (stats.totalR > maxSSR) {
        maxSSR = stats.totalR;
        const [strategy, session] = key.split('___');
        bestStrategySession = {
          strategy, session,
          totalR: stats.totalR,
          winRate: stats.winRate,
          trades: trades.length,
        };
      }
    }
  });
  
  let bestStrategyAsset = null;
  let maxSAR = -Infinity;
  
  strategyAssetMap.forEach((trades, key) => {
    if (trades.length >= 2) {
      const stats = calculateAllStats(trades);
      if (stats.totalR > maxSAR) {
        maxSAR = stats.totalR;
        const [strategy, asset] = key.split('___');
        bestStrategyAsset = {
          strategy, asset,
          totalR: stats.totalR,
          winRate: stats.winRate,
          trades: trades.length,
        };
      }
    }
  });
  
  let worstCombo = null;
  let minR = Infinity;
  
  assetSessionMap.forEach((trades, key) => {
    if (trades.length >= 2) {
      const stats = calculateAllStats(trades);
      if (stats.totalR < minR) {
        minR = stats.totalR;
        const [asset, session] = key.split('___');
        worstCombo = {
          description: `${asset} during ${session}`,
          totalR: stats.totalR,
          trades: trades.length,
        };
      }
    }
  });
  
  return {
    assetSession: bestAssetSession,
    strategySession: bestStrategySession,
    strategyAsset: bestStrategyAsset,
    worstCombo: worstCombo,
  };
}