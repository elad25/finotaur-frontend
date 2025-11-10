import dayjs from "dayjs";

// ============================================
// TYPES
// ============================================

export type Trade = {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_price: number;
  exit_price?: number;
  stop_price: number;
  take_profit_price?: number;
  quantity: number;
  fees: number;
  open_at: string;
  close_at?: string;
  outcome?: "WIN" | "LOSS" | "BE" | "OPEN";
  pnl?: number;
  strategy?: string;
  trade_type?: string;
  session?: "Asia" | "London" | "NY";
  metrics?: {
    rr?: number;
    riskUSD?: number;
    rewardUSD?: number;
    riskPts?: number;
    rewardPts?: number;
  };
};

export type Session = "Asia" | "London" | "NY" | "Other";
export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export interface StatisticsMetrics {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  avgRR: number;
  profitFactor: number;
  expectancy: number;
  netPnL: number;
  grossProfit: number;
  grossLoss: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgHoldingTime: number; // in minutes
}

export interface SymbolStats {
  symbol: string;
  trades: number;
  winRate: number;
  avgRR: number;
  netPnL: number;
  profitFactor: number;
  expectancy: number;
  maxDD: number;
}

export interface StrategyStats {
  strategy: string;
  trades: number;
  winRate: number;
  avgRR: number;
  profitFactor: number;
  expectancy: number;
  netPnL: number;
  maxDD: number;
}

export interface SessionStats {
  session: Session;
  trades: number;
  winRate: number;
  avgRR: number;
  netPnL: number;
  profitFactor: number;
}

export interface TimeStats {
  hour: number;
  trades: number;
  winRate: number;
  avgRR: number;
  netPnL: number;
}

export interface DistributionBin {
  range: string;
  min: number;
  max: number;
  count: number;
  trades: Trade[];
}

// ============================================
// CORE CALCULATIONS
// ============================================

/**
 * Calculate P&L with multiplier support
 */
export function computePnL(trade: Trade): number {
  // Use pre-calculated PnL if available
  if (trade.pnl !== undefined && trade.pnl !== null) {
    return trade.pnl;
  }

  // Can't calculate without exit price
  if (!trade.exit_price) return 0;

  const priceDiff =
    trade.side === "LONG"
      ? trade.exit_price - trade.entry_price
      : trade.entry_price - trade.exit_price;

  // Calculate multiplier from metrics if available
  const multiplier =
    trade.metrics?.riskUSD && trade.metrics?.riskPts
      ? Math.abs(trade.metrics.riskUSD / trade.metrics.riskPts / trade.quantity)
      : 1;

  const grossPnL = priceDiff * trade.quantity * multiplier;
  return grossPnL - trade.fees;
}

/**
 * Calculate ACTUAL R:R based on EXIT price (not planned TP)
 */
export function computeRR(trade: Trade): number {
  const pnl = computePnL(trade);

  // Try to use pre-calculated risk from metrics
  if (trade.metrics?.riskUSD && trade.metrics.riskUSD !== 0) {
    return pnl / Math.abs(trade.metrics.riskUSD);
  }

  // Fallback: calculate risk from entry and stop
  if (trade.entry_price && trade.stop_price && trade.quantity) {
    const riskPerShare = Math.abs(trade.entry_price - trade.stop_price);
    const multiplier =
      trade.metrics?.riskUSD && trade.metrics?.riskPts
        ? Math.abs(trade.metrics.riskUSD / trade.metrics.riskPts / trade.quantity)
        : 1;
    const calculatedRisk = riskPerShare * trade.quantity * multiplier;

    if (calculatedRisk > 0) {
      return pnl / calculatedRisk;
    }
  }

  return 0;
}

/**
 * Calculate holding time in minutes
 */
export function computeHoldingTime(trade: Trade): number {
  if (!trade.close_at) return 0;
  const entry = dayjs(trade.open_at);
  const exit = dayjs(trade.close_at);
  return exit.diff(entry, "minute");
}

/**
 * Calculate Win Rate (excluding BE if specified)
 */
export function calculateWinRate(trades: Trade[], excludeBE: boolean = false): number {
  const closed = trades.filter((t) => t.exit_price);
  if (closed.length === 0) return 0;

  const wins = closed.filter((t) => computePnL(t) > 0).length;
  const losses = closed.filter((t) => computePnL(t) < 0).length;
  const breakeven = closed.filter((t) => computePnL(t) === 0).length;

  const total = excludeBE ? wins + losses : wins + losses + breakeven;
  if (total === 0) return 0;

  return wins / total;
}

/**
 * Calculate Average R:R
 */
export function calculateAvgRR(trades: Trade[]): number {
  const closed = trades.filter((t) => t.exit_price);
  const rrList = closed.map((t) => computeRR(t)).filter((rr) => rr !== 0);

  if (rrList.length === 0) return 0;
  return rrList.reduce((sum, rr) => sum + rr, 0) / rrList.length;
}

/**
 * Calculate Profit Factor = ΣWins / |ΣLosses|
 */
export function calculateProfitFactor(trades: Trade[]): number {
  const closed = trades.filter((t) => t.exit_price);
  const wins = closed.filter((t) => computePnL(t) > 0);
  const losses = closed.filter((t) => computePnL(t) < 0);

  const totalWins = wins.reduce((sum, t) => sum + computePnL(t), 0);
  const totalLosses = Math.abs(losses.reduce((sum, t) => sum + computePnL(t), 0));

  if (totalLosses === 0) return totalWins > 0 ? Infinity : 0;
  return totalWins / totalLosses;
}

/**
 * Calculate Expectancy = (WinRate × Avg Win) − ((1 − WinRate) × Avg Loss)
 */
export function calculateExpectancy(trades: Trade[]): number {
  const closed = trades.filter((t) => t.exit_price);
  if (closed.length === 0) return 0;

  const wins = closed.filter((t) => computePnL(t) > 0);
  const losses = closed.filter((t) => computePnL(t) < 0);

  const winRate = calculateWinRate(trades);
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + computePnL(t), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + computePnL(t), 0) / losses.length) : 0;

  return winRate * avgWin - (1 - winRate) * avgLoss;
}

/**
 * Calculate Max Drawdown = max peak-to-trough in cumulative P&L
 */
export function calculateMaxDrawdown(trades: Trade[]): number {
  const closed = trades
    .filter((t) => t.exit_price && t.open_at)
    .sort((a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime());

  let peak = 0;
  let trough = 0;
  let maxDD = 0;
  let cumulative = 0;

  for (const trade of closed) {
    cumulative += computePnL(trade);

    if (cumulative > peak) {
      peak = cumulative;
      trough = cumulative;
    }

    if (cumulative < trough) {
      trough = cumulative;
      maxDD = Math.min(maxDD, trough - peak);
    }
  }

  return maxDD;
}

// ============================================
// COMPREHENSIVE STATISTICS
// ============================================

export function calculateStatistics(trades: Trade[]): StatisticsMetrics {
  const closed = trades.filter((t) => t.exit_price);
  const open = trades.filter((t) => !t.exit_price);

  const wins = closed.filter((t) => computePnL(t) > 0);
  const losses = closed.filter((t) => computePnL(t) < 0);
  const breakeven = closed.filter((t) => computePnL(t) === 0);

  const netPnL = closed.reduce((sum, t) => sum + computePnL(t), 0);
  const grossProfit = wins.reduce((sum, t) => sum + computePnL(t), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + computePnL(t), 0));

  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

  const largestWin = wins.length > 0 ? Math.max(...wins.map((t) => computePnL(t))) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => computePnL(t))) : 0;

  const holdingTimes = closed.map((t) => computeHoldingTime(t)).filter((h) => h > 0);
  const avgHoldingTime = holdingTimes.length > 0 ? holdingTimes.reduce((sum, h) => sum + h, 0) / holdingTimes.length : 0;

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades: open.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    winRate: calculateWinRate(trades),
    avgRR: calculateAvgRR(trades),
    profitFactor: calculateProfitFactor(trades),
    expectancy: calculateExpectancy(trades),
    netPnL,
    grossProfit,
    grossLoss,
    maxDrawdown: calculateMaxDrawdown(trades),
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    avgHoldingTime,
  };
}

// ============================================
// DATA PROCESSING & GROUPING
// ============================================

/**
 * Get session from timestamp
 */
export function getSession(timestamp: string): Session {
  const hour = dayjs(timestamp).hour();
  
  // Asia: 20:00-02:00 UTC (8PM-2AM)
  if (hour >= 20 || hour < 2) return "Asia";
  
  // London: 02:00-11:00 UTC (2AM-11AM)
  if (hour >= 2 && hour < 11) return "London";
  
  // NY: 11:00-20:00 UTC (11AM-8PM)
  if (hour >= 11 && hour < 20) return "NY";
  
  return "Other";
}

/**
 * Group trades by symbol
 */
export function groupBySymbol(trades: Trade[]): SymbolStats[] {
  const symbolMap = new Map<string, Trade[]>();

  trades.forEach((trade) => {
    const existing = symbolMap.get(trade.symbol) || [];
    symbolMap.set(trade.symbol, [...existing, trade]);
  });

  return Array.from(symbolMap.entries()).map(([symbol, symbolTrades]) => ({
    symbol,
    trades: symbolTrades.filter((t) => t.exit_price).length,
    winRate: calculateWinRate(symbolTrades),
    avgRR: calculateAvgRR(symbolTrades),
    netPnL: symbolTrades.filter((t) => t.exit_price).reduce((sum, t) => sum + computePnL(t), 0),
    profitFactor: calculateProfitFactor(symbolTrades),
    expectancy: calculateExpectancy(symbolTrades),
    maxDD: calculateMaxDrawdown(symbolTrades),
  }));
}

/**
 * Group trades by strategy
 */
export function groupByStrategy(trades: Trade[]): StrategyStats[] {
  const strategyMap = new Map<string, Trade[]>();

  trades.forEach((trade) => {
    const strategy = trade.strategy || "No Strategy";
    const existing = strategyMap.get(strategy) || [];
    strategyMap.set(strategy, [...existing, trade]);
  });

  return Array.from(strategyMap.entries()).map(([strategy, strategyTrades]) => ({
    strategy,
    trades: strategyTrades.filter((t) => t.exit_price).length,
    winRate: calculateWinRate(strategyTrades),
    avgRR: calculateAvgRR(strategyTrades),
    profitFactor: calculateProfitFactor(strategyTrades),
    expectancy: calculateExpectancy(strategyTrades),
    netPnL: strategyTrades.filter((t) => t.exit_price).reduce((sum, t) => sum + computePnL(t), 0),
    maxDD: calculateMaxDrawdown(strategyTrades),
  }));
}

/**
 * Group trades by session
 */
export function groupBySession(trades: Trade[]): SessionStats[] {
  const sessionMap = new Map<Session, Trade[]>();

  trades.forEach((trade) => {
    const session = trade.session || getSession(trade.open_at);
    const existing = sessionMap.get(session) || [];
    sessionMap.set(session, [...existing, trade]);
  });

  return Array.from(sessionMap.entries()).map(([session, sessionTrades]) => ({
    session,
    trades: sessionTrades.filter((t) => t.exit_price).length,
    winRate: calculateWinRate(sessionTrades),
    avgRR: calculateAvgRR(sessionTrades),
    netPnL: sessionTrades.filter((t) => t.exit_price).reduce((sum, t) => sum + computePnL(t), 0),
    profitFactor: calculateProfitFactor(sessionTrades),
  }));
}

/**
 * Group trades by day of week
 */
export function groupByDayOfWeek(trades: Trade[]): { day: DayOfWeek; stats: SessionStats }[] {
  const dayMap = new Map<DayOfWeek, Trade[]>();
  const days: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  trades.forEach((trade) => {
    const day = dayjs(trade.open_at).format("dddd") as DayOfWeek;
    const existing = dayMap.get(day) || [];
    dayMap.set(day, [...existing, trade]);
  });

  return days.map((day) => {
    const dayTrades = dayMap.get(day) || [];
    return {
      day,
      stats: {
        session: day as any,
        trades: dayTrades.filter((t) => t.exit_price).length,
        winRate: calculateWinRate(dayTrades),
        avgRR: calculateAvgRR(dayTrades),
        netPnL: dayTrades.filter((t) => t.exit_price).reduce((sum, t) => sum + computePnL(t), 0),
        profitFactor: calculateProfitFactor(dayTrades),
      },
    };
  });
}

/**
 * Group trades by hour
 */
export function groupByHour(trades: Trade[]): TimeStats[] {
  const hourMap = new Map<number, Trade[]>();

  trades.forEach((trade) => {
    const hour = dayjs(trade.open_at).hour();
    const existing = hourMap.get(hour) || [];
    hourMap.set(hour, [...existing, trade]);
  });

  return Array.from({ length: 24 }, (_, hour) => {
    const hourTrades = hourMap.get(hour) || [];
    return {
      hour,
      trades: hourTrades.filter((t) => t.exit_price).length,
      winRate: calculateWinRate(hourTrades),
      avgRR: calculateAvgRR(hourTrades),
      netPnL: hourTrades.filter((t) => t.exit_price).reduce((sum, t) => sum + computePnL(t), 0),
    };
  });
}

/**
 * Build equity curve (cumulative P&L)
 */
export function buildEquityCurve(trades: Trade[], includeOpen: boolean = false): { date: string; equity: number; tradeId: string }[] {
  const filtered = includeOpen ? trades : trades.filter((t) => t.exit_price);
  const sorted = [...filtered]
    .filter((t) => t.open_at)
    .sort((a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime());

  let cumulative = 0;
  return sorted.map((trade) => {
    const pnl = computePnL(trade);
    cumulative += pnl;
    return {
      date: dayjs(trade.open_at).format("MMM DD"),
      equity: Math.round(cumulative * 100) / 100,
      tradeId: trade.id,
    };
  });
}

/**
 * Create P&L distribution bins
 */
export function createDistribution(trades: Trade[], binSize: number = 100): DistributionBin[] {
  const closed = trades.filter((t) => t.exit_price);
  const pnls = closed.map((t) => computePnL(t));

  if (pnls.length === 0) return [];

  const minPnL = Math.min(...pnls);
  const maxPnL = Math.max(...pnls);

  const minBin = Math.floor(minPnL / binSize) * binSize;
  const maxBin = Math.ceil(maxPnL / binSize) * binSize;

  const bins: DistributionBin[] = [];

  for (let i = minBin; i < maxBin; i += binSize) {
    const tradesInBin = closed.filter((t) => {
      const pnl = computePnL(t);
      return pnl >= i && pnl < i + binSize;
    });

    bins.push({
      range: `$${i} to $${i + binSize}`,
      min: i,
      max: i + binSize,
      count: tradesInBin.length,
      trades: tradesInBin,
    });
  }

  return bins;
}

/**
 * Calculate rolling metrics (for charts)
 */
export function calculateRollingMetrics(trades: Trade[], window: number = 20): {
  date: string;
  winRate: number;
  avgRR: number;
}[] {
  const closed = trades
    .filter((t) => t.exit_price && t.open_at)
    .sort((a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime());

  if (closed.length < window) return [];

  const results: { date: string; winRate: number; avgRR: number }[] = [];

  for (let i = window - 1; i < closed.length; i++) {
    const windowTrades = closed.slice(i - window + 1, i + 1);
    results.push({
      date: dayjs(closed[i].open_at).format("MMM DD"),
      winRate: calculateWinRate(windowTrades) * 100,
      avgRR: calculateAvgRR(windowTrades),
    });
  }

  return results;
}

/**
 * Calculate risk buckets
 */
export function groupByRiskSize(trades: Trade[]): { bucket: string; stats: SessionStats }[] {
  const buckets = [
    { name: "Small (0-$100)", min: 0, max: 100 },
    { name: "Medium ($100-$500)", min: 100, max: 500 },
    { name: "Large ($500+)", min: 500, max: Infinity },
  ];

  return buckets.map((bucket) => {
    const bucketTrades = trades.filter((t) => {
      const risk = t.metrics?.riskUSD || 0;
      return risk >= bucket.min && risk < bucket.max;
    });

    return {
      bucket: bucket.name,
      stats: {
        session: bucket.name as any,
        trades: bucketTrades.filter((t) => t.exit_price).length,
        winRate: calculateWinRate(bucketTrades),
        avgRR: calculateAvgRR(bucketTrades),
        netPnL: bucketTrades.filter((t) => t.exit_price).reduce((sum, t) => sum + computePnL(t), 0),
        profitFactor: calculateProfitFactor(bucketTrades),
      },
    };
  });
}

/**
 * Calculate holding time buckets
 */
export function groupByHoldingTime(trades: Trade[]): { bucket: string; stats: SessionStats }[] {
  const buckets = [
    { name: "<5 min", min: 0, max: 5 },
    { name: "5-30 min", min: 5, max: 30 },
    { name: "30-120 min", min: 30, max: 120 },
    { name: "2h+", min: 120, max: Infinity },
  ];

  return buckets.map((bucket) => {
    const bucketTrades = trades.filter((t) => {
      const holdingTime = computeHoldingTime(t);
      return holdingTime >= bucket.min && holdingTime < bucket.max;
    });

    return {
      bucket: bucket.name,
      stats: {
        session: bucket.name as any,
        trades: bucketTrades.filter((t) => t.exit_price).length,
        winRate: calculateWinRate(bucketTrades),
        avgRR: calculateAvgRR(bucketTrades),
        netPnL: bucketTrades.filter((t) => t.exit_price).reduce((sum, t) => sum + computePnL(t), 0),
        profitFactor: calculateProfitFactor(bucketTrades),
      },
    };
  });
}

/**
 * Calculate direction stats (Long vs Short)
 */
export function groupByDirection(trades: Trade[]): { direction: "LONG" | "SHORT"; stats: StatisticsMetrics }[] {
  const longTrades = trades.filter((t) => t.side === "LONG");
  const shortTrades = trades.filter((t) => t.side === "SHORT");

  return [
    { direction: "LONG" as const, stats: calculateStatistics(longTrades) },
    { direction: "SHORT" as const, stats: calculateStatistics(shortTrades) },
  ];
}