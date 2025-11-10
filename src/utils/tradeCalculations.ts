// ================================================================
// CENTRALIZED TRADE CALCULATIONS - SINGLE SOURCE OF TRUTH
// ================================================================
// This file contains ALL trade calculation logic used across the app
// DO NOT duplicate these calculations elsewhere

// 🎯 ASSET MULTIPLIERS - SINGLE SOURCE OF TRUTH
export const ASSET_MULTIPLIERS: Record<string, { class: string; mult: number }> = {
  // E-mini Futures
  NQ: { class: "futures", mult: 20 },
  MNQ: { class: "futures", mult: 2 },
  ES: { class: "futures", mult: 50 },
  MES: { class: "futures", mult: 5 },
  YM: { class: "futures", mult: 5 },
  MYM: { class: "futures", mult: 0.5 },
  RTY: { class: "futures", mult: 50 },
  M2K: { class: "futures", mult: 5 },
  
  // Energy
  CL: { class: "futures", mult: 1000 },
  MCL: { class: "futures", mult: 100 },
  QM: { class: "futures", mult: 500 },
  NG: { class: "futures", mult: 10000 },
  QG: { class: "futures", mult: 2500 },
  
  // Metals
  GC: { class: "futures", mult: 100 },
  MGC: { class: "futures", mult: 10 },
  SI: { class: "futures", mult: 5000 },
  SIL: { class: "futures", mult: 1000 },
  
  // Bonds
  ZB: { class: "futures", mult: 1000 },
  ZN: { class: "futures", mult: 1000 },
  ZF: { class: "futures", mult: 1000 },
  ZT: { class: "futures", mult: 2000 },
  
  // Currencies
  "6E": { class: "futures", mult: 12.5 },
  M6E: { class: "futures", mult: 6.25 },
  
  // Crypto
  BTC: { class: "futures", mult: 5 },
  MBT: { class: "futures", mult: 0.1 },
} as const;

// Helper: Get multiplier for symbol
export function getAssetMultiplier(symbol: string): number {
  if (!symbol) return 1;
  const symbolUpper = symbol.toUpperCase().trim();
  return ASSET_MULTIPLIERS[symbolUpper]?.mult || 1;
}

// Helper: Get asset class for symbol
export function getAssetClass(symbol: string): string {
  if (!symbol) return 'stocks';
  const symbolUpper = symbol.toUpperCase().trim();
  return ASSET_MULTIPLIERS[symbolUpper]?.class || 'stocks';
}

// Helper: Detect asset class from symbol (auto-detection)
export function detectAssetClass(symbol: string): string | null {
  if (!symbol) return null;
  const symbolUpper = symbol.toUpperCase().trim();
  return ASSET_MULTIPLIERS[symbolUpper]?.class || null;
}

// ================================================================
// CORE CALCULATION FUNCTIONS
// ================================================================

export interface TradeMetrics {
  riskPts: number;
  rewardPts: number;
  riskUSD: number;
  rewardUSD: number;
  rr: number; // Planned R:R (e.g., 1:2.5)
  actual_r?: number; // Actual R achieved (e.g., +1.8R)
  // 🔥 User's personal R multiples
  user_risk_r?: number; // How many R's the user is risking (based on their 1R setting)
  user_reward_r?: number; // How many R's the user can make (based on their 1R setting)
  user_actual_r?: number; // How many R's the user actually made (based on their 1R setting)
}

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
  pnl?: number;
  outcome?: "WIN" | "LOSS" | "BE" | "OPEN";
  metrics?: TradeMetrics;
  // Additional fields
  rr?: number;
  risk_usd?: number;
  reward_usd?: number;
  risk_pts?: number;
  reward_pts?: number;
  actual_r?: number;
  user_risk_r?: number;
  user_reward_r?: number;
  user_actual_r?: number;
  strategy_id?: string;
  strategy_name?: string;
  open_at: string;
  close_at?: string;
}

/**
 * Calculate planned R:R ratio based on entry, stop, and take profit
 * This is the PLAN before trade execution
 */
export function calculatePlannedRR(
  entryPrice: number,
  stopPrice: number,
  takeProfitPrice: number | undefined,
  side: "LONG" | "SHORT"
): number {
  if (!takeProfitPrice || takeProfitPrice <= 0) return 0;
  if (entryPrice <= 0 || stopPrice <= 0) return 0;
  
  const riskPts = Math.abs(entryPrice - stopPrice);
  const rewardPts = Math.abs(entryPrice - takeProfitPrice);
  
  // Validate direction
  if (side === "LONG") {
    if (stopPrice >= entryPrice || takeProfitPrice <= entryPrice) return 0;
  } else {
    if (stopPrice <= entryPrice || takeProfitPrice >= entryPrice) return 0;
  }
  
  return riskPts > 0 ? rewardPts / riskPts : 0;
}

/**
 * Calculate actual R based on REAL exit price
 * This is what ACTUALLY happened
 */
export function calculateActualR(
  entryPrice: number,
  stopPrice: number,
  exitPrice: number,
  quantity: number,
  symbol: string,
  side: "LONG" | "SHORT",
  fees: number = 0
): number {
  if (!exitPrice || exitPrice <= 0) return 0;
  
  const multiplier = getAssetMultiplier(symbol);
  
  // Calculate risk (what you could have lost)
  const riskPts = Math.abs(entryPrice - stopPrice);
  const riskUSD = riskPts * quantity * multiplier;
  
  if (riskUSD === 0) return 0;
  
  // Calculate actual P&L
  const priceDiff = side === "LONG" 
    ? exitPrice - entryPrice
    : entryPrice - exitPrice;
  
  const grossPnL = priceDiff * quantity * multiplier;
  const netPnL = grossPnL - fees;
  
  // Actual R = (What you made or lost) / (What you risked)
  return netPnL / riskUSD;
}

/**
 * Calculate P&L from trade data
 * Returns NET P&L after fees
 */
export function calculatePnL(trade: Trade): number {
  // Use stored PnL if available
  if (trade.pnl !== undefined && trade.pnl !== null) {
    return trade.pnl;
  }
  
  // If no exit, P&L is 0
  if (!trade.exit_price || trade.exit_price <= 0) {
    return 0;
  }
  
  const multiplier = getAssetMultiplier(trade.symbol);
  
  // Calculate price difference based on side
  const priceDiff = trade.side === "LONG" 
    ? trade.exit_price - trade.entry_price
    : trade.entry_price - trade.exit_price;
  
  const grossPnL = priceDiff * trade.quantity * multiplier;
  const netPnL = grossPnL - trade.fees;
  
  return netPnL;
}

/**
 * Calculate all trade metrics for display
 * @param oneRValue - User's configured 1R value (from risk settings). If provided, calculates user_risk_r and user_reward_r
 */
export function calculateTradeMetrics(
  entryPrice: number,
  stopPrice: number,
  takeProfitPrice: number | undefined,
  exitPrice: number | undefined,
  quantity: number,
  symbol: string,
  side: "LONG" | "SHORT",
  fees: number = 0,
  oneRValue?: number // 🔥 User's 1R setting
): TradeMetrics {
  const multiplier = getAssetMultiplier(symbol);
  
  // Risk calculation (points and USD)
  const riskPts = Math.abs(entryPrice - stopPrice);
  const riskUSD = riskPts * quantity * multiplier;
  
  // Reward calculation (points and USD)
  const rewardPts = takeProfitPrice ? Math.abs(entryPrice - takeProfitPrice) : 0;
  const rewardUSD = rewardPts * quantity * multiplier;
  
  // Planned R:R (traditional calculation)
  const rr = calculatePlannedRR(entryPrice, stopPrice, takeProfitPrice, side);
  
  // Actual R (only if trade is closed) - traditional calculation
  const actual_r = exitPrice 
    ? calculateActualR(entryPrice, stopPrice, exitPrice, quantity, symbol, side, fees)
    : undefined;
  
  // 🔥 User's personal R multiples (based on their 1R setting)
  let user_risk_r: number | undefined;
  let user_reward_r: number | undefined;
  let user_actual_r: number | undefined;
  
  if (oneRValue && oneRValue > 0) {
    // Calculate how many R's the user is risking
    user_risk_r = riskUSD / oneRValue;
    
    // Calculate how many R's the user can potentially make
    user_reward_r = rewardUSD / oneRValue;
    
    // Calculate how many R's the user actually made (if trade closed)
    if (exitPrice && actual_r !== undefined) {
      const actualPnL = calculatePnL({
        entry_price: entryPrice,
        exit_price: exitPrice,
        stop_price: stopPrice,
        quantity,
        symbol,
        side,
        fees,
      } as Trade);
      
      user_actual_r = actualPnL / oneRValue;
    }
  }
  
  return {
    riskPts,
    rewardPts,
    riskUSD,
    rewardUSD,
    rr,
    actual_r,
    user_risk_r,
    user_reward_r,
    user_actual_r,
  };
}

/**
 * Determine trade outcome
 */
export function getTradeOutcome(pnl: number, hasExit: boolean): "WIN" | "LOSS" | "BE" | "OPEN" {
  if (!hasExit) return "OPEN";
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "BE";
}

/**
 * Calculate outcome from trade
 */
export function calculateOutcome(pnl: number): "WIN" | "LOSS" | "BE" | "OPEN" {
  if (pnl === 0) return "OPEN";
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "BE";
}

/**
 * Auto-detect trade side from prices
 */
export function autoDetectSide(params: {
  entryPrice: number;
  stopPrice: number;
  takeProfitPrice?: number;
}): "LONG" | "SHORT" | null {
  const { entryPrice, stopPrice, takeProfitPrice } = params;
  
  if (!entryPrice || !stopPrice || !takeProfitPrice) return null;
  
  if (takeProfitPrice > entryPrice && stopPrice < entryPrice) return "LONG";
  if (takeProfitPrice < entryPrice && stopPrice > entryPrice) return "SHORT";
  
  return null;
}

/**
 * Get R:R color class for UI
 */
export function getRRColorClass(rr: number): string {
  if (rr < 1) return "text-red-400";
  if (rr < 1.5) return "text-orange-400";
  if (rr < 2) return "text-yellow-400";
  return "text-emerald-400";
}

/**
 * Get quantity label based on asset class
 */
export function getQuantityLabel(assetClass: string): string {
  switch (assetClass) {
    case "futures": return "Contracts";
    case "forex": return "Lots";
    case "crypto": return "Units";
    default: return "Shares";
  }
}

/**
 * Calculate duration between two timestamps
 */
export function calculateDuration(openAt: string, closeAt?: string): string {
  const start = new Date(openAt);
  const end = closeAt ? new Date(closeAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

// ================================================================
// AGGREGATE STATISTICS
// ================================================================

export interface AggregateStats {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  totalPnL: number;
  avgPnL: number;
  avgR: number;
  avgWinR: number;
  avgLossR: number;
  bestTrade: number;
  worstTrade: number;
  expectancy: number;
  profitFactor: number;
  maxDrawdown: number;
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
}

/**
 * Calculate aggregate statistics from array of trades
 * This is optimized for large datasets
 */
export function calculateStats(trades: Trade[]): AggregateStats {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      closedTrades: 0,
      openTrades: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      winRate: 0,
      totalPnL: 0,
      avgPnL: 0,
      avgR: 0,
      avgWinR: 0,
      avgLossR: 0,
      bestTrade: 0,
      worstTrade: 0,
      expectancy: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      currentStreak: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
    };
  }
  
  let wins = 0, losses = 0, breakeven = 0;
  let totalPnL = 0;
  let totalR = 0, totalWinR = 0, totalLossR = 0;
  let rCount = 0, winRCount = 0, lossRCount = 0;
  let bestTrade = 0, worstTrade = 0;
  let totalWinAmount = 0, totalLossAmount = 0;
  
  // Drawdown tracking
  let peak = 0, maxDD = 0;
  let runningPnL = 0;
  
  // Streak tracking
  let currentStreak = 0, longestWinStreak = 0, longestLossStreak = 0;
  let lastOutcome: string | null = null;
  let currentWinStreak = 0, currentLossStreak = 0;
  
  const closedTrades = trades.filter(t => t.exit_price && t.exit_price > 0);
  const openTrades = trades.length - closedTrades.length;
  
  // Process each closed trade
  for (const trade of closedTrades) {
    const pnl = calculatePnL(trade);
    const outcome = getTradeOutcome(pnl, true);
    
    // Count outcomes
    if (outcome === "WIN") wins++;
    else if (outcome === "LOSS") losses++;
    else if (outcome === "BE") breakeven++;
    
    // Accumulate P&L
    totalPnL += pnl;
    runningPnL += pnl;
    
    // Track best/worst
    if (pnl > bestTrade) bestTrade = pnl;
    if (pnl < worstTrade) worstTrade = pnl;
    
    // 🔥 FIXED: Use actual_r from top level OR metrics OR calculate
    const actualR = trade.actual_r ?? 
                    trade.metrics?.actual_r ?? 
                    calculateActualR(
                      trade.entry_price,
                      trade.stop_price,
                      trade.exit_price!,
                      trade.quantity,
                      trade.symbol,
                      trade.side,
                      trade.fees
                    );
    
    if (actualR !== 0) {
      totalR += actualR;
      rCount++;
      
      if (actualR > 0) {
        totalWinR += actualR;
        winRCount++;
        totalWinAmount += pnl;
      } else if (actualR < 0) {
        totalLossR += Math.abs(actualR);
        lossRCount++;
        totalLossAmount += Math.abs(pnl);
      }
    }
    
    // Track drawdown
    if (runningPnL > peak) peak = runningPnL;
    const currentDD = peak - runningPnL;
    if (currentDD > maxDD) maxDD = currentDD;
    
    // Track streaks
    if (outcome === lastOutcome && outcome !== "BE") {
      currentStreak++;
    } else {
      if (lastOutcome === "WIN" && currentWinStreak < currentStreak) {
        longestWinStreak = currentStreak;
      }
      if (lastOutcome === "LOSS" && currentLossStreak < currentStreak) {
        longestLossStreak = currentStreak;
      }
      currentStreak = 1;
    }
    
    lastOutcome = outcome;
    if (outcome === "WIN") currentWinStreak = currentStreak;
    if (outcome === "LOSS") currentLossStreak = currentStreak;
  }
  
  // Final streak check
  if (lastOutcome === "WIN" && currentStreak > longestWinStreak) {
    longestWinStreak = currentStreak;
  }
  if (lastOutcome === "LOSS" && currentStreak > longestLossStreak) {
    longestLossStreak = currentStreak;
  }
  
  const totalClosed = closedTrades.length;
  const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
  const avgPnL = totalClosed > 0 ? totalPnL / totalClosed : 0;
  const avgR = rCount > 0 ? totalR / rCount : 0;
  const avgWinR = winRCount > 0 ? totalWinR / winRCount : 0;
  const avgLossR = lossRCount > 0 ? totalLossR / lossRCount : 0;
  
  // Expectancy = (Win% × AvgWin) - (Loss% × AvgLoss)
  const expectancy = (winRate / 100) * avgWinR - ((100 - winRate) / 100) * avgLossR;
  
  // Profit Factor = Total Wins / Total Losses
  const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;
  
  return {
    totalTrades: trades.length,
    closedTrades: totalClosed,
    openTrades,
    wins,
    losses,
    breakeven,
    winRate,
    totalPnL,
    avgPnL,
    avgR,
    avgWinR,
    avgLossR,
    bestTrade,
    worstTrade,
    expectancy,
    profitFactor,
    maxDrawdown: maxDD,
    currentStreak: lastOutcome === "WIN" ? currentStreak : (lastOutcome === "LOSS" ? -currentStreak : 0),
    longestWinStreak,
    longestLossStreak,
  };
}