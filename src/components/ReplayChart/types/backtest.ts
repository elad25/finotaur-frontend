// types/backtest.ts

interface Symbol {
  symbol: string;
  name: string;
  category: 'crypto' | 'stocks' | 'forex' | 'futures' | 'indices';
  exchange: string;
  logo?: string;
  baseAsset?: string;
  quoteAsset?: string;
}

interface Timeframe {
  value: string; // '1m', '5m', '1h', etc.
  label: string; // '1 minute', '5 minutes', etc.
  seconds: number; // For calculations
  binanceInterval?: string; // API mapping
}

type ChartType = 'candles' | 'bars' | 'line' | 'area' | 'heikin-ashi';

type ReplaySpeed = 0.25 | 0.5 | 1 | 2 | 4 | 8 | 10;

interface Candle {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BacktestStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  maxDrawdown: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
}