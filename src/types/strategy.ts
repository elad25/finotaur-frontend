// ==========================================
// STRATEGY DATA CONTRACT
// ==========================================

export type StrategyStatus = 'active' | 'archived';

export type MarketType = 'Indices' | 'Stocks' | 'Forex' | 'Crypto' | 'Commodities';

export type SessionType = 'Asia' | 'London' | 'NY';

export interface Timeframes {
  htf: string[];        // Higher timeframes: ["H4", "H1"]
  execution: string[];  // Execution timeframes: ["M5", "M1"]
}

export interface ChecklistItem {
  id: string;
  text: string;
  weight?: number;  // For weighted Compliance calculation
}

export interface MediaRef {
  url: string;
  caption?: string;
}

export interface Strategy {
  // A. Identifiers & Meta
  id: string;
  name: string;
  description: string;
  status: StrategyStatus;
  isDefault: boolean;
  pinned: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;

  // B. Market/Time Context
  marketTypes: MarketType[];
  instruments: string[];  // Symbol strings like "AAPL", "NQ", "XAUUSD"
  sessionsPreferred: SessionType[];
  timeframes: Timeframes;

  // C. Risk/Performance Targets (Feed into Statistics)
  riskRewardTarget: number;           // Target R:R ratio (e.g., 3)
  maxRiskPerTradePct: number;         // Max risk per trade (% of capital)
  dailyMaxLossPct?: number;           // Daily stop-out threshold
  maxConsecutiveLosses?: number;      // Consecutive loss limit
  winRateTargetPct?: number;          // Target win rate
  targetProfitR?: number;             // Typical profit target in R

  // D. Applicable Rules (Enter Trade Form & Compliance Scoring)
  entryCriteria: ChecklistItem[];
  exitCriteria: ChecklistItem[];
  invalidConditions: ChecklistItem[];
  managementRules: ChecklistItem[];

  // E. Psychology & Quality
  psychologyFocus: string[];  // ["FOMO", "Revenge", "Hesitation"]
  qualityNotes: string;
  examples: MediaRef[];       // Screenshots/links to example trades
}

// ==========================================
// TRADE DATA CONTRACT
// ==========================================

export type TradeDirection = 'LONG' | 'SHORT';

export interface TradeCompliance {
  preChecked: string[];   // IDs of items checked before entry
  postChecked: string[];  // IDs checked on exit
  scorePct: number;       // Weighted compliance score
}

export interface Trade {
  id: string;
  strategyId: string | null;  // Link to Strategy
  
  // Direction (auto-calculated from entry/exit if needed)
  direction: TradeDirection;
  
  // Core trade data
  symbol: string;
  entry: number;
  stop: number;
  takeProfit: number;
  exit: number;
  qty: number;
  fees: number;
  
  // Context
  session: SessionType;
  timeframe: string;
  openedAt: Date;
  closedAt: Date;
  
  // Derived metrics (calculated)
  rMultiple: number;      // R gained/lost
  pnlUsd: number;         // P&L in dollars
  holdMinutes: number;    // Duration of trade
  riskUsd: number;        // Dollar risk (for Expectancy calculation)
  
  // Compliance (captured during trade)
  compliance: TradeCompliance;
  
  // Optional notes
  notes?: string;
  screenshots?: MediaRef[];
}

// ==========================================
// STRATEGY STATISTICS (Derived from Trades)
// ==========================================

export interface StrategyStatistics {
  strategyId: string;
  strategyName: string;
  
  // Core metrics
  winRate: number;              // wins / total
  totalTrades: number;
  netPnlUsd: number;           // sum(pnlUsd)
  netPnlR: number;             // sum(rMultiple)
  totalFees: number;           // sum(fees)
  
  // Performance metrics
  expectancyUsd: number;       // avg(pnlUsd)
  expectancyR: number;         // avg(rMultiple)
  avgRR: number;               // avg(rMultiple) for winners
  avgHoldMinutes: number;
  maxDrawdownPct: number;
  
  // Target vs Actual
  targetRR: number;            // From strategy.riskRewardTarget
  actualRRUtilization: number; // How often target RR was achieved
  
  // Compliance
  avgCompliancePct: number;    // avg(trade.compliance.scorePct)
  
  // Breakdowns
  longVsShort: {
    long: { count: number; winRate: number; netPnlR: number };
    short: { count: number; winRate: number; netPnlR: number };
  };
  
  bySession: Record<SessionType, {
    count: number;
    winRate: number;
    netPnlR: number;
  }>;
  
  bySymbol: Record<string, {
    count: number;
    winRate: number;
    netPnlR: number;
  }>;
  
  byTimeframe: Record<string, {
    count: number;
    winRate: number;
    netPnlR: number;
  }>;
  
  // Last trade
  lastTradeResult: 'win' | 'loss' | null;
  lastTradeDate: Date | null;
}

// ==========================================
// UI STATE & FORMS
// ==========================================

export interface StrategyFormData extends Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'> {}

export interface TradeFormData extends Omit<Trade, 'id' | 'rMultiple' | 'pnlUsd' | 'holdMinutes' | 'riskUsd'> {}

// Quick TL;DR for Overview tab
export interface StrategyTldr {
  strategyId: string;
  bullets: string[];  // 3-5 key points about how to execute
}

// Playbook gallery categories
export type PlaybookCategory = 'examples' | 'avoid' | 'ideal-setup' | 'mistakes';

export interface PlaybookItem {
  id: string;
  strategyId: string;
  category: PlaybookCategory;
  tradeId?: string;  // Link to actual trade if applicable
  media: MediaRef[];
  description: string;
  tags: string[];
}

// AI insights for strategy
export interface StrategyInsight {
  id: string;
  strategyId: string;
  type: 'warning' | 'tip' | 'success';
  message: string;
  metric?: string;  // Related metric (e.g., "NY session win rate")
  createdAt: Date;
}