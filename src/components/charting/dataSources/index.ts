/**
 * Data source router + symbol/interval mappers.
 *
 * Public API:
 *   - pickDataSource(symbol) → ChartDataSource
 *   - toYahooSymbol(brokerSymbol) → Yahoo-format symbol string | null
 *   - toBinanceSymbol(brokerSymbol) → Binance-format symbol string | null
 *   - pickInterval(durationMs) → Interval
 *
 * The router decides which source to use based on the RAW broker symbol
 * (e.g. `BTCUSDT` → Binance, `MNQM6` / `AAPL` / `^NDX` → Yahoo). Callers then
 * use the matching `toXxxSymbol` to resolve to the source's native format
 * BEFORE passing into FinotaurChart.
 */

import type { Bar, ChartDataSource, Interval } from '../types';
import type { UTCTimestamp } from 'lightweight-charts';
import { YahooFinanceSource } from './YahooFinanceSource';
import { BinanceSource } from './BinanceSource';
import { DatabentoCacheSource } from './DatabentoCacheSource';

export { YahooFinanceSource } from './YahooFinanceSource';
export { BinanceSource } from './BinanceSource';
export { DatabentoCacheSource } from './DatabentoCacheSource';

// ---------------------------------------------------------------------------
// Symbol pattern detection
// ---------------------------------------------------------------------------

const CRYPTO_PATTERN = /^[A-Z]{2,10}(USDT|USDC|BUSD|USD|BTC|ETH)$/;
const FUTURES_PATTERN = /^([A-Z]{1,4})([FGHJKMNQUVXZ])(\d{1,2})$/;

/**
 * ISO-4217 fiat currency codes used to disambiguate forex spot pairs from
 * crypto pairs. Both can end in "USD" (EURUSD vs BTCUSD) — the distinguishing
 * factor is that a forex pair is two fiat currency codes concatenated.
 */
const FIAT_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
  'SEK', 'NOK', 'DKK', 'SGD', 'HKD', 'MXN', 'ZAR', 'TRY', 'PLN', 'CNH', 'CZK', 'HUF',
]);

/**
 * True if the raw symbol is a forex spot pair (two fiat ISO-4217 codes, e.g.
 * EURUSD, GBPJPY). Tolerates an existing Yahoo `=X` suffix. Forex pairs must
 * NEVER route to Binance even though many end in "USD".
 */
export function isForexPair(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const s = raw.trim().toUpperCase().replace(/=X$/, '');
  if (s.length !== 6) return false;
  return FIAT_CURRENCIES.has(s.slice(0, 3)) && FIAT_CURRENCIES.has(s.slice(3, 6));
}

/** True if the raw broker symbol looks like a crypto pair routable to Binance. */
export function isCryptoSymbol(raw: string): boolean {
  const symbol = raw.trim().toUpperCase();
  if (isForexPair(symbol)) return false;
  return CRYPTO_PATTERN.test(symbol);
}

// ---------------------------------------------------------------------------
// Yahoo symbol mapping
// ---------------------------------------------------------------------------

/**
 * Futures root → Yahoo continuous front-month suffix.
 * `=F` denotes the continuous contract — historically and intraday-accurate
 * for the active month, which is what traders journal against.
 *
 * Supported roots cover the CME/CBOT/COMEX/NYMEX day-trader staples.
 */
const FUTURES_ROOT_TO_YAHOO: Record<string, string> = {
  ES: 'ES=F',
  MES: 'MES=F',
  NQ: 'NQ=F',
  MNQ: 'MNQ=F',
  RTY: 'RTY=F',
  M2K: 'M2K=F',
  YM: 'YM=F',
  MYM: 'MYM=F',
  GC: 'GC=F',
  MGC: 'MGC=F',
  SI: 'SI=F',
  SIL: 'SIL=F',
  HG: 'HG=F',
  CL: 'CL=F',
  MCL: 'MCL=F',
  NG: 'NG=F',
  ZN: 'ZN=F',
  ZB: 'ZB=F',
  ZC: 'ZC=F',
  ZS: 'ZS=F',
  ZW: 'ZW=F',
  '6E': '6E=F',
  '6B': '6B=F',
  '6J': '6J=F',
};

/**
 * Map a raw broker symbol to a Yahoo-format symbol.
 * Returns null if not mappable (caller should surface "symbol not available").
 *
 * Examples:
 *   MNQM6   → MNQ=F   (continuous front-month)
 *   AAPL    → AAPL    (equity passthrough)
 *   ^NDX    → ^NDX    (index passthrough)
 *   BTCUSDT → null    (crypto — caller should route to Binance instead)
 */
export function toYahooSymbol(
  raw: string | null | undefined,
  assetClass?: string | null,
): string | null {
  if (!raw) return null;
  const symbol = raw.trim().toUpperCase();
  if (!symbol) return null;

  // Forex spot pairs (Yahoo =X suffix) → passthrough unchanged, before any
  // other pattern matching. EURUSD=X is NOT a crypto pair despite ending in
  // USD — the =X suffix ensures it always routes to Yahoo, never Binance.
  if (symbol.endsWith('=X')) return symbol;

  // Forex spot pair (two fiat codes, e.g. EURUSD) → Yahoo `=X` form. Must come
  // before the crypto check because forex pairs also match CRYPTO_PATTERN.
  if (isForexPair(symbol)) return `${symbol}=X`;

  // Crypto → not Yahoo (route to Binance via pickDataSource)
  if (CRYPTO_PATTERN.test(symbol)) return null;

  // Futures contract → continuous
  const futuresMatch = symbol.match(FUTURES_PATTERN);
  if (futuresMatch) {
    const [, root] = futuresMatch;
    const mapped = FUTURES_ROOT_TO_YAHOO[root];
    if (mapped) return mapped;
    // Unknown root — try `<ROOT>=F` and let Yahoo's resolver decide
    return `${root}=F`;
  }

  // Bare futures root with no month/year code (e.g. the WHISPER tracker's
  // "RTY" / "NQ" / "GC") — map to the continuous front-month "<ROOT>=F".
  // Gated on a futures asset_class so equities that collide with a root
  // (e.g. CL=Colgate, SI, NG, GC) are NOT mis-mapped.
  const ac = (assetClass ?? '').toLowerCase();
  if ((ac === 'futures' || ac === 'future') && FUTURES_ROOT_TO_YAHOO[symbol]) {
    return FUTURES_ROOT_TO_YAHOO[symbol];
  }

  // Equity / index / anything else → passthrough
  return symbol;
}

// ---------------------------------------------------------------------------
// Binance symbol mapping
// ---------------------------------------------------------------------------

/**
 * Map a raw broker symbol to a Binance-format symbol.
 * Currently a passthrough+validate (Binance pairs are already in `BTCUSDT` form).
 * Returns null for non-crypto symbols.
 */
export function toBinanceSymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const symbol = raw.trim().toUpperCase();
  if (!symbol) return null;
  if (!isCryptoSymbol(symbol)) return null;
  return symbol;
}

// ---------------------------------------------------------------------------
// Databento-cached futures roots
// ---------------------------------------------------------------------------

/**
 * Futures roots with a fully-populated `backtest_candles` cache (Databento).
 * Routing these here bypasses Yahoo entirely for our core day-trading
 * instruments — the cache already has full coverage server-side.
 */
const DATABENTO_CACHED_ROOTS = new Set([
  'MNQ', 'NQ', 'MES', 'ES', 'MYM', 'YM', 'M2K', 'RTY', 'MGC', 'GC', 'SIL', 'SI', 'MCL', 'CL',
]);

/**
 * Extract the bare futures root from a raw or already-formatted symbol,
 * stripping either a broker month/year contract code (e.g. `MNQM6` → `MNQ`,
 * `ESH5` → `ES`) or a Yahoo continuous-contract `=F` suffix (e.g. `MNQ=F` →
 * `MNQ` — this is the shape the backtest symbol universe bakes in, see
 * `components/backtest/symbolUniverse.ts`). Bare roots with neither (e.g.
 * `NQ`) pass through unchanged.
 */
function extractFuturesRoot(raw: string): string {
  const symbol = raw.trim().toUpperCase();
  if (symbol.endsWith('=F')) return symbol.slice(0, -2);
  const futuresMatch = symbol.match(FUTURES_PATTERN);
  if (futuresMatch) return futuresMatch[1];
  return symbol;
}

/** True if the raw broker symbol resolves to one of our 14 Databento-cached futures roots. */
export function isDatabentoCachedSymbol(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return DATABENTO_CACHED_ROOTS.has(extractFuturesRoot(raw));
}

/**
 * Map a raw broker symbol to its Databento-cache symbol (the bare futures
 * root — matches the `p_symbol` values populated in `backtest_candles`).
 * Returns null if the symbol isn't one of our 14 cached roots.
 */
export function toDatabentoCacheSymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const root = extractFuturesRoot(raw);
  return DATABENTO_CACHED_ROOTS.has(root) ? root : null;
}

// ---------------------------------------------------------------------------
// Source router
// ---------------------------------------------------------------------------

// Singletons — sources are stateless so a single instance suffices and saves GC.
const yahooSource = new YahooFinanceSource();
const binanceSource = new BinanceSource();
const databentoCacheSource = new DatabentoCacheSource();

/**
 * Pick the right data source for the raw broker symbol.
 * Order: crypto pairs → Binance direct; our 14 cached futures roots →
 * DatabentoCacheSource; everything else (equities, indices, uncached
 * futures) → Yahoo via Edge Function (unchanged fallback).
 */
export function pickDataSource(raw: string | null | undefined) {
  if (raw && isCryptoSymbol(raw)) return binanceSource;
  if (raw && isDatabentoCachedSymbol(raw)) return databentoCacheSource;
  return yahooSource;
}

// ---------------------------------------------------------------------------
// Databento → Yahoo fallback (recent-trade coverage)
// ---------------------------------------------------------------------------

/**
 * Composite source for Databento-cached futures roots. Databento's CME license
 * only serves bars whose end is >=24h old, and the daily cache ingest lags
 * ~1-2 days — so a freshly-journaled futures trade has NO Databento bars at its
 * timestamp yet. This wrapper detects that gap (Databento returns nothing that
 * reaches the trade) and falls back to Yahoo's near-real-time continuous-front
 * data (`NQ=F` etc.) so recent trades still chart correctly. Historical trades
 * that ARE covered by the cache keep using Databento unchanged.
 */
export class DatabentoYahooFallbackSource implements ChartDataSource {
  constructor(
    private readonly yahooSymbol: string,
    private readonly coverageDeadlineSec: number,
  ) {}

  async getBars(
    symbol: string,
    interval: Interval,
    from: UTCTimestamp,
    to: UTCTimestamp,
  ): Promise<Bar[]> {
    let dbBars: Bar[] = [];
    try {
      dbBars = await databentoCacheSource.getBars(symbol, interval, from, to);
    } catch {
      dbBars = [];
    }
    const covered =
      dbBars.length > 0 &&
      (dbBars[dbBars.length - 1].time as number) >= this.coverageDeadlineSec;
    if (covered) return dbBars;

    // Databento cache doesn't reach the trade — use Yahoo (near-real-time).
    try {
      return await yahooSource.getBars(this.yahooSymbol, interval, from, to);
    } catch {
      // Yahoo failed too — return whatever Databento had (better than empty).
      return dbBars;
    }
  }
}

// ---------------------------------------------------------------------------
// Interval picker
// ---------------------------------------------------------------------------

/**
 * Choose an appropriate bar interval given the wall-clock window length.
 * Keeps total bar count well under any provider's per-request limit (1000)
 * and gives the trader enough resolution without overwhelming the chart.
 *
 * Examples:
 *   30 min trade        → 1m
 *   4 hr swing          → 5m
 *   1 day position      → 15m
 *   1 week swing        → 60m
 *   1 month investment  → 1d
 */
export function pickInterval(durationMs: number): Interval {
  const hours = Math.max(durationMs, 0) / (1000 * 60 * 60);
  if (hours < 2) return '1m';
  if (hours < 8) return '5m';
  if (hours < 24) return '15m';
  if (hours < 24 * 7) return '60m';
  return '1d';
}
