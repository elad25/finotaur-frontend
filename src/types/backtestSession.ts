// ==========================================
// BACKTEST SESSION DATA CONTRACT
// ==========================================
// Foundation model for the backtesting onboarding flow (Phase 1).
// A "session" is a self-contained backtest run: symbol, balance, date range,
// optionally linked to one of the user's Strategies (our "Playbook").
// Persisted client-side via useBacktestSessionStore (no DB schema change).

export type BacktestAssetType = 'forex' | 'stocks' | 'crypto' | 'futures';

export type BacktestSessionStatus = 'active' | 'archived';

export interface BacktestDateRange {
  /** ISO date string (yyyy-mm-dd) — inclusive start. */
  from: string;
  /** ISO date string (yyyy-mm-dd) — inclusive end. */
  to: string;
}

export interface BacktestSession {
  // A. Identity & meta
  id: string;
  name: string;
  description?: string;

  // B. Strategy link (our "Playbook") — optional, mirrors TradeZella "Connect to Playbook"
  strategyId?: string | null;
  strategyName?: string | null;

  // C. Market config
  assetType: BacktestAssetType;
  symbol: string;
  /** Chart timeframe value (e.g. '1m', '5m', '1h'). Defaults to '1m'. */
  timeframe: string;

  // D. Account config
  startBalance: number;
  /** Leverage. Reference platform uses 1:1; kept configurable for later phases. */
  leverage: number;

  // E. Replay window
  dateRange: BacktestDateRange;

  // F. Lifecycle
  status: BacktestSessionStatus;
  createdAt: string;
  updatedAt: string;
}

/** Fields the user provides in the "Create new session" modal. */
export interface CreateBacktestSessionInput {
  name: string;
  description?: string;
  strategyId?: string | null;
  strategyName?: string | null;
  assetType: BacktestAssetType;
  symbol: string;
  timeframe?: string;
  startBalance: number;
  leverage?: number;
  dateRange: BacktestDateRange;
}

export const ASSET_TYPE_LABELS: Record<BacktestAssetType, string> = {
  forex: 'Forex',
  stocks: 'Stocks',
  crypto: 'Crypto',
  futures: 'Futures',
};

/**
 * Curated symbol lists per asset type for the create-session dropdown.
 * These match symbols the replay engine can resolve; extend as data coverage grows.
 */
export const SYMBOLS_BY_ASSET: Record<BacktestAssetType, string[]> = {
  forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'XAUUSD'],
  stocks: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN'],
  crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD'],
  futures: ['ES', 'NQ', 'YM', 'GC', 'CL'],
};

/** Asset types that are not yet fully supported (rendered as "Soon" — mirrors reference). */
export const COMING_SOON_ASSETS: BacktestAssetType[] = ['futures'];
