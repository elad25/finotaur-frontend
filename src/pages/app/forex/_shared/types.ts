// ============================================================
// src/pages/app/forex/_shared/types.ts
// TypeScript interfaces for Forex Sprint-1 API payloads
// ============================================================

/** A single currency pair entry in the strength/heatmap response. */
export interface ForexStrengthPair {
  symbol: string;   // e.g. "EURUSD"
  base: string;     // e.g. "EUR"
  quote: string;    // e.g. "USD"
  price: number;
  chp: number;      // change percent
  change: number;   // absolute change
}

/** Response from /api/forex/heatmap */
export interface ForexHeatmapResponse {
  pairs: ForexStrengthPair[];
  ts: number;       // Unix ms timestamp of the data
  source: string;   // data provider identifier
}

/** A single OHLCV point in the DXY time series. */
export interface DXYPoint {
  t: number;  // Unix ms timestamp
  c: number;  // close price
}

/** Response from /api/forex/dxy/series */
export interface DXYSeriesResponse {
  symbol: string;   // e.g. "DXY"
  range: string;    // e.g. "1m", "3m", "1y"
  points: DXYPoint[];
  ts: number;       // Unix ms timestamp of the data
  source: string;
}

/** A single OHLCV intraday bar for a forex pair. */
export interface ForexIntradayBar {
  t: number;  // Unix ms timestamp (bar open)
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume (tick volume for FX)
}

/** Response from /api/forex/intraday/:symbol */
export interface ForexIntradayResponse {
  symbol: string;    // e.g. "EURUSD"
  interval: string;  // e.g. "5min", "15min", "1h"
  bars: ForexIntradayBar[];
  range: {
    start: number;   // Unix ms
    end: number;     // Unix ms
    label: string;   // human-readable, e.g. "Last 24h"
  };
  source: string;
}

/** A single entry in the movers list (gainers or losers). */
export interface ForexMover {
  symbol: string;
  base: string;
  quote: string;
  price: number;
  chp: number;      // change percent
  change: number;   // absolute change
}

/** Response from /api/forex/movers */
export interface ForexMoversResponse {
  gainers: ForexMover[];
  losers: ForexMover[];
  ts: number;       // Unix ms timestamp of the data
  source: string;
}
