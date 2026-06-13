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

// ============================================================
// Sprint-2 types — AI commentary, calendar, CB rates, COT,
// correlation, and macro cockpit payloads
// ============================================================

/** Response from /api/forex/commentary */
export interface ForexCommentaryResponse {
  commentary: string;
  generated_at: string;
  model: string | null;
  source: string;
}

/** A single central-bank rate entry. */
export interface CBRate {
  bank: string;
  currency: string;
  rate: number | null;
  lastChangeDate: string | null;
  lastChangeDir: string | null;
  nextMeeting: string | null;
  note?: string;
}

/** A carry-trade differential entry. */
export interface CarryEntry {
  symbol: string;
  base: string;
  quote: string;
  differential: number;
}

/** Response from /api/forex/cb-rates */
export interface ForexCBRatesResponse {
  banks: CBRate[];
  carry: CarryEntry[];
  asOf: string;
  source: string;
}

/** COT (Commitment of Traders) net position for a currency. */
export interface COTPosition {
  currency: string;
  reportDate: string;
  noncommLong: number;
  noncommShort: number;
  net: number;
  wowChange: number;
  openInterest: number;
}

/** Response from /api/forex/cot */
export interface ForexCOTResponse {
  positions: COTPosition[];
  ts: number;
  source: string;
}

/** Response from /api/forex/correlation */
export interface ForexCorrelationResponse {
  window: string;
  symbols: string[];
  matrix: number[][];
  ts: number;
  source: string;
}

/** A generic macro indicator label/value pair. */
export interface MacroIndicator {
  label: string;
  value: string | number | null;
  date: string | null;
}

/** Response from /api/forex/macro/:currency */
export interface ForexMacroResponse {
  currency: string;
  policyRate: CBRate | null;
  cot: COTPosition | null;
  indicators: MacroIndicator[];
  aiSummary: string;
  generated_at: string;
  source: string;
}
