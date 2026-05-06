export interface ForexQuote {
  symbol: string;
  name: string;
  price: number;
  chp: number;
  change: number;
  high?: number;
  low?: number;
}

export interface ForexMoversResponse {
  gainers: ForexQuote[];
  losers: ForexQuote[];
  source?: string;
  marketStatus?: { isOpen: boolean; status: string; message: string };
  ts?: number;
  error?: string;
}

export interface MacroAssetLite {
  symbol: string;
  name: string;
  category: string;
  price: number | null;
  dailyChange: number | null;
  dailyChangePercent: number | null;
  weeklyChangePercent?: number | null;
  riskSentiment?: string;
}

export interface MacroSnapshotLite {
  timestamp: string;
  source: string;
  assets: MacroAssetLite[];
}
