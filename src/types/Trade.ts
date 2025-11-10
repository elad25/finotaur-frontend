// ================================================
// 🎯 CENTRALIZED TRADE TYPE DEFINITIONS
// File: src/types/trade.ts
// ✅ Single source of truth for Trade interface
// ================================================

export interface TradeMetrics {
  rr?: number;              // Risk:Reward ratio (e.g., 1:2 = 2)
  riskUSD?: number;         // Risk in USD
  rewardUSD?: number;       // Potential reward in USD
  riskPts?: number;         // Risk in points
  rewardPts?: number;       // Potential reward in points
  actual_r?: number;        // Actual R achieved (e.g., +2.5R or -1R)
}

export interface Trade {
  id: string;
  user_id?: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_price: number;
  stop_price: number;
  take_profit_price?: number;
  exit_price?: number;
  quantity: number;
  fees: number;
  open_at: string;          // ISO date string
  close_at?: string;        // ISO date string
  session?: string;         // e.g., "London", "NY", "Asia"
  strategy_id?: string;
  strategy_name?: string;
  setup?: string;           // e.g., "Breakout", "Pullback"
  notes?: string;
  screenshot_url?: string;
  asset_class?: string;     // e.g., "futures", "stocks", "forex"
  outcome?: "WIN" | "LOSS" | "BE" | "OPEN";
  pnl?: number;             // Stored P&L (calculated)
  quality_tag?: string;     // e.g., "A+", "B", "C"
  metrics?: TradeMetrics;
  created_at?: string;
  updated_at?: string;
}

export interface Strategy {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  rules?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StrategyPerformance {
  strategy_id: string;
  strategy_name: string;
  total_trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl: number;
  avg_r: number;
  profit_factor: number;
  expectancy: number;
}