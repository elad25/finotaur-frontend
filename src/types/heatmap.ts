export type MarketKey = 'stocks' | 'indices' | 'crypto' | 'futures' | 'forex' | 'commodities';

export type HeatmapItem = {
  symbol: string;
  name: string;
  group?: string;
  price: number;
  change: number;
  changePercent: number;
  weight?: number;
  meta?: Record<string, string | number>;
};

export type HeatmapResponse = {
  market: MarketKey;
  asOf: number;
  items: HeatmapItem[];
  provider: string;
  ttlSec: number;
  stale: boolean;
};
