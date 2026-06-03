/**
 * Ticker data loader — sync Vite JSON imports.
 *
 * Two sources:
 *  - ticker-universe.json  — always present; 2,500 entries, lightweight
 *  - seo-tickers.json      — enriched data; placeholder ships if not yet generated
 *
 * All lookups are case-insensitive (ticker uppercased before map key lookup).
 */

import universeRaw from '@/data/ticker-universe.json';
import enrichedRaw from '@/data/seo-tickers.json';
import type {
  TickerUniverseFile,
  TickerUniverseEntry,
  SeoTickersFile,
  SeoTickerData,
} from './types';

// ---------------------------------------------------------------------------
// Cast the JSON imports to their typed shapes
// ---------------------------------------------------------------------------
const universe = universeRaw as unknown as TickerUniverseFile;
const enriched = enrichedRaw as unknown as SeoTickersFile;

// ---------------------------------------------------------------------------
// Internal cache — built once on first call, reused thereafter
// ---------------------------------------------------------------------------
let _universeMap: Map<string, TickerUniverseEntry> | null = null;
let _enrichedMap: Map<string, SeoTickerData> | null = null;
let _sortedUniverse: TickerUniverseEntry[] | null = null;

function getUniverseMap(): Map<string, TickerUniverseEntry> {
  if (!_universeMap) {
    _universeMap = new Map(
      universe.tickers.map((t) => [t.ticker.toUpperCase(), t]),
    );
  }
  return _universeMap;
}

function getEnrichedMap(): Map<string, SeoTickerData> {
  if (!_enrichedMap) {
    _enrichedMap = new Map(
      Object.entries(enriched.tickers).map(([k, v]) => [k.toUpperCase(), v]),
    );
  }
  return _enrichedMap;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns both raw JSON objects for diagnostic use.
 * Prefer the individual helpers below for component use.
 */
export function loadAllTickers(): {
  universe: TickerUniverseFile;
  enriched: SeoTickersFile;
} {
  return { universe, enriched };
}

/**
 * Case-insensitive lookup in the enriched seo-tickers.json.
 * Falls back to a minimal SeoTickerData built from the universe entry if
 * the enriched file doesn't contain this ticker (e.g. placeholder is active).
 *
 * Returns null only when the ticker is absent from both files.
 */
export function getTickerData(ticker: string): SeoTickerData | null {
  const upper = ticker.toUpperCase();

  // Try enriched first
  const enrichedEntry = getEnrichedMap().get(upper);
  if (enrichedEntry) return enrichedEntry;

  // Fall back to universe entry — build a minimal SeoTickerData
  const universeEntry = getUniverseMap().get(upper);
  if (!universeEntry) return null;

  const fallback: SeoTickerData = {
    ticker: universeEntry.ticker,
    name: universeEntry.name,
    sector: universeEntry.sector,
    industry: universeEntry.industry,
    type: universeEntry.type,
    description: null,
    price: { last: null, change_pct: null, as_of: null },
    fundamentals: {
      marketCap: null,
      revenue: null,
      netIncome: null,
      eps: null,
      pe: null,
      roe: null,
      debtToEquity: null,
      dividendPerShare: null,
      fundamentalsPrice: null,
    },
    news: [],
    fetched_at: universe.generated_at,
  };

  return fallback;
}

/**
 * Full sorted universe list — alphabetical by ticker symbol.
 * Used by ResearchIndexPage to display the browsable directory.
 */
export function listAllTickers(): TickerUniverseEntry[] {
  if (!_sortedUniverse) {
    _sortedUniverse = [...universe.tickers].sort((a, b) =>
      a.ticker.localeCompare(b.ticker),
    );
  }
  return _sortedUniverse;
}

/**
 * Returns up to `limit` peers from the same sector, excluding `currentTicker`.
 * Returns an empty array when sector is null.
 */
export function getPeersBySector(
  currentTicker: string,
  sector: string | null,
  limit: number,
): TickerUniverseEntry[] {
  if (!sector) return [];
  const upper = currentTicker.toUpperCase();
  return listAllTickers()
    .filter((t) => t.ticker.toUpperCase() !== upper && t.sector === sector)
    .slice(0, limit);
}
