// trading/types.ts - TRADING SPECIFIC TYPES
export interface BacktestStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  grossProfit: number;
  grossLoss: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  totalR: number;
  averageR: number;
  openPositions: number;
  currentBalance: number;
  currentEquity: number;
}