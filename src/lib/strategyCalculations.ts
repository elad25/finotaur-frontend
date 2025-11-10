import { Trade, TradeDirection, Strategy, StrategyStatistics, TradeCompliance, ChecklistItem } from '@/types/strategy';

// ==========================================
// TRADE CALCULATIONS
// ==========================================

/**
 * Calculate trade direction from entry and exit prices
 */
export function calculateDirection(entry: number, exit: number): TradeDirection {
  return exit > entry ? 'LONG' : 'SHORT';
}

/**
 * Calculate R-Multiple (risk-reward ratio achieved)
 */
export function calculateRMultiple(
  entry: number,
  exit: number,
  stop: number,
  direction: TradeDirection
): number {
  const risk = Math.abs(entry - stop);
  if (risk === 0) return 0;
  
  const profit = direction === 'LONG' 
    ? (exit - entry)
    : (entry - exit);
  
  return profit / risk;
}

/**
 * Calculate P&L in USD
 */
export function calculatePnlUsd(
  entry: number,
  exit: number,
  qty: number,
  fees: number,
  direction: TradeDirection
): number {
  const grossPnl = direction === 'LONG'
    ? (exit - entry) * qty
    : (entry - exit) * qty;
  
  return grossPnl - fees;
}

/**
 * Calculate risk in USD
 */
export function calculateRiskUsd(
  entry: number,
  stop: number,
  qty: number
): number {
  return Math.abs(entry - stop) * qty;
}

/**
 * Calculate hold duration in minutes
 */
export function calculateHoldMinutes(openedAt: Date, closedAt: Date): number {
  return Math.round((closedAt.getTime() - openedAt.getTime()) / (1000 * 60));
}

/**
 * Auto-populate derived trade metrics
 */
export function enrichTrade(trade: Omit<Trade, 'rMultiple' | 'pnlUsd' | 'holdMinutes' | 'riskUsd'>): Trade {
  const direction = trade.direction || calculateDirection(trade.entry, trade.exit);
  
  return {
    ...trade,
    direction,
    rMultiple: calculateRMultiple(trade.entry, trade.exit, trade.stop, direction),
    pnlUsd: calculatePnlUsd(trade.entry, trade.exit, trade.qty, trade.fees, direction),
    riskUsd: calculateRiskUsd(trade.entry, trade.stop, trade.qty),
    holdMinutes: calculateHoldMinutes(trade.openedAt, trade.closedAt),
  };
}

// ==========================================
// COMPLIANCE CALCULATIONS
// ==========================================

/**
 * Calculate compliance score based on checked items and their weights
 */
export function calculateComplianceScore(
  allItems: ChecklistItem[],
  checkedIds: string[]
): number {
  if (allItems.length === 0) return 100;
  
  const totalWeight = allItems.reduce((sum, item) => sum + (item.weight || 1), 0);
  const checkedWeight = allItems
    .filter(item => checkedIds.includes(item.id))
    .reduce((sum, item) => sum + (item.weight || 1), 0);
  
  return Math.round((checkedWeight / totalWeight) * 100);
}

/**
 * Calculate overall trade compliance from strategy rules
 */
export function calculateTradeCompliance(
  strategy: Strategy,
  preChecked: string[],
  postChecked: string[]
): TradeCompliance {
  const allCriteria = [
    ...strategy.entryCriteria,
    ...strategy.exitCriteria,
    ...strategy.managementRules,
  ];
  
  const allChecked = [...new Set([...preChecked, ...postChecked])];
  
  return {
    preChecked,
    postChecked,
    scorePct: calculateComplianceScore(allCriteria, allChecked),
  };
}

// ==========================================
// STRATEGY STATISTICS
// ==========================================

/**
 * Calculate comprehensive statistics for a strategy
 */
export function calculateStrategyStatistics(
  strategy: Strategy,
  trades: Trade[]
): StrategyStatistics {
  const strategyTrades = trades.filter(t => t.strategyId === strategy.id);
  
  if (strategyTrades.length === 0) {
    return createEmptyStatistics(strategy);
  }
  
  const wins = strategyTrades.filter(t => t.rMultiple > 0);
  const losses = strategyTrades.filter(t => t.rMultiple <= 0);
  
  const longTrades = strategyTrades.filter(t => t.direction === 'LONG');
  const shortTrades = strategyTrades.filter(t => t.direction === 'SHORT');
  
  // Core metrics
  const winRate = (wins.length / strategyTrades.length) * 100;
  const netPnlUsd = strategyTrades.reduce((sum, t) => sum + t.pnlUsd, 0);
  const netPnlR = strategyTrades.reduce((sum, t) => sum + t.rMultiple, 0);
  const totalFees = strategyTrades.reduce((sum, t) => sum + t.fees, 0);
  
  // Expectancy
  const expectancyUsd = netPnlUsd / strategyTrades.length;
  const expectancyR = netPnlR / strategyTrades.length;
  
  // Average R:R for winners
  const avgRR = wins.length > 0
    ? wins.reduce((sum, t) => sum + t.rMultiple, 0) / wins.length
    : 0;
  
  // Average hold time
  const avgHoldMinutes = strategyTrades.reduce((sum, t) => sum + t.holdMinutes, 0) / strategyTrades.length;
  
  // Max drawdown (simplified - running equity low)
  const maxDrawdownPct = calculateMaxDrawdown(strategyTrades);
  
  // Target utilization
  const hitTarget = strategyTrades.filter(t => t.rMultiple >= strategy.riskRewardTarget).length;
  const actualRRUtilization = (hitTarget / strategyTrades.length) * 100;
  
  // Compliance
  const avgCompliancePct = strategyTrades.reduce((sum, t) => sum + t.compliance.scorePct, 0) / strategyTrades.length;
  
  // Last trade
  const sortedTrades = [...strategyTrades].sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime());
  const lastTrade = sortedTrades[0];
  
  return {
    strategyId: strategy.id,
    strategyName: strategy.name,
    winRate,
    totalTrades: strategyTrades.length,
    netPnlUsd,
    netPnlR,
    totalFees,
    expectancyUsd,
    expectancyR,
    avgRR,
    avgHoldMinutes,
    maxDrawdownPct,
    targetRR: strategy.riskRewardTarget,
    actualRRUtilization,
    avgCompliancePct,
    longVsShort: {
      long: calculateDirectionStats(longTrades),
      short: calculateDirectionStats(shortTrades),
    },
    bySession: calculateSessionBreakdown(strategyTrades),
    bySymbol: calculateSymbolBreakdown(strategyTrades),
    byTimeframe: calculateTimeframeBreakdown(strategyTrades),
    lastTradeResult: lastTrade ? (lastTrade.rMultiple > 0 ? 'win' : 'loss') : null,
    lastTradeDate: lastTrade ? lastTrade.closedAt : null,
  };
}

function createEmptyStatistics(strategy: Strategy): StrategyStatistics {
  return {
    strategyId: strategy.id,
    strategyName: strategy.name,
    winRate: 0,
    totalTrades: 0,
    netPnlUsd: 0,
    netPnlR: 0,
    totalFees: 0,
    expectancyUsd: 0,
    expectancyR: 0,
    avgRR: 0,
    avgHoldMinutes: 0,
    maxDrawdownPct: 0,
    targetRR: strategy.riskRewardTarget,
    actualRRUtilization: 0,
    avgCompliancePct: 0,
    longVsShort: {
      long: { count: 0, winRate: 0, netPnlR: 0 },
      short: { count: 0, winRate: 0, netPnlR: 0 },
    },
    bySession: {} as any,
    bySymbol: {},
    byTimeframe: {},
    lastTradeResult: null,
    lastTradeDate: null,
  };
}

function calculateDirectionStats(trades: Trade[]) {
  if (trades.length === 0) {
    return { count: 0, winRate: 0, netPnlR: 0 };
  }
  
  const wins = trades.filter(t => t.rMultiple > 0).length;
  return {
    count: trades.length,
    winRate: (wins / trades.length) * 100,
    netPnlR: trades.reduce((sum, t) => sum + t.rMultiple, 0),
  };
}

function calculateSessionBreakdown(trades: Trade[]): Record<string, any> {
  const sessions = ['Asia', 'London', 'NY'] as const;
  const breakdown: any = {};
  
  for (const session of sessions) {
    const sessionTrades = trades.filter(t => t.session === session);
    breakdown[session] = calculateDirectionStats(sessionTrades);
  }
  
  return breakdown;
}

function calculateSymbolBreakdown(trades: Trade[]): Record<string, any> {
  const symbols = [...new Set(trades.map(t => t.symbol))];
  const breakdown: any = {};
  
  for (const symbol of symbols) {
    const symbolTrades = trades.filter(t => t.symbol === symbol);
    breakdown[symbol] = calculateDirectionStats(symbolTrades);
  }
  
  return breakdown;
}

function calculateTimeframeBreakdown(trades: Trade[]): Record<string, any> {
  const timeframes = [...new Set(trades.map(t => t.timeframe))];
  const breakdown: any = {};
  
  for (const timeframe of timeframes) {
    const tfTrades = trades.filter(t => t.timeframe === timeframe);
    breakdown[timeframe] = calculateDirectionStats(tfTrades);
  }
  
  return breakdown;
}

function calculateMaxDrawdown(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  
  let peak = 0;
  let maxDD = 0;
  let runningTotal = 0;
  
  // Sort by close date
  const sorted = [...trades].sort((a, b) => a.closedAt.getTime() - b.closedAt.getTime());
  
  for (const trade of sorted) {
    runningTotal += trade.rMultiple;
    
    if (runningTotal > peak) {
      peak = runningTotal;
    }
    
    const drawdown = peak - runningTotal;
    if (drawdown > maxDD) {
      maxDD = drawdown;
    }
  }
  
  return peak > 0 ? (maxDD / peak) * 100 : 0;
}

// ==========================================
// FORMATTING HELPERS
// ==========================================

export function formatPnl(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${value.toFixed(2)}`;
}

export function formatR(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}R`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}