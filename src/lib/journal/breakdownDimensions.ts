/**
 * breakdownDimensions.ts
 *
 * Pure, React-free dimension logic for the journal Reports "Breakdowns" tab.
 * Everything here is a plain function over Trade[] → BreakdownRow[] (or a
 * per-trade label accessor for the cross-analysis matrix), so it is fully
 * unit-testable without mounting any component.
 *
 * Owns:
 *  - Grouping functions for every breakdown dimension (day/hour/session,
 *    risk, tags, asset class, symbols, strategy, duration, price range, month)
 *  - The flexible Cross-Analysis matrix builder + dimension registry
 *  - Per-dimension summary-card computation (best / worst / most active)
 */

import dayjs from 'dayjs';
import type { Trade } from '@/hooks/useTradesData';
import { getAssetClass } from '@/utils/tradeCalculations';
import type { BreakdownRow } from './breakdownKit';
import { emptyRow, accumulateTrade } from './breakdownKit';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Reorder Mon-Sun for display (trading week)
export const TRADING_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 … Sun=0

const R_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '< −2R',      min: -Infinity, max: -2 },
  { label: '−2R to −1R', min: -2,        max: -1 },
  { label: '−1R to 0R',  min: -1,        max: 0  },
  { label: '0R to 1R',   min: 0,         max: 1  },
  { label: '1R to 2R',   min: 1,         max: 2  },
  { label: '> 2R',       min: 2,         max: Infinity },
];

const RISK_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '< $50',     min: 0,   max: 50   },
  { label: '$50–$100',  min: 50,  max: 100  },
  { label: '$100–$200', min: 100, max: 200  },
  { label: '$200–$500', min: 200, max: 500  },
  { label: '> $500',    min: 500, max: Infinity },
];

/** Hold-time buckets, in minutes, from open_at → close_at. */
const DURATION_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '< 1m',   min: 0,    max: 1    },
  { label: '1–5m',   min: 1,    max: 5    },
  { label: '5–15m',  min: 5,    max: 15   },
  { label: '15–30m', min: 15,   max: 30   },
  { label: '30m–1h', min: 30,   max: 60   },
  { label: '1–4h',   min: 60,   max: 240  },
  { label: '4h–1d',  min: 240,  max: 1440 },
  { label: '> 1d',   min: 1440, max: Infinity },
];

/** Entry-price buckets. For futures this reflects contract price, not notional. */
const PRICE_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '< $5',      min: 0,   max: 5   },
  { label: '$5–$20',    min: 5,   max: 20  },
  { label: '$20–$50',   min: 20,  max: 50  },
  { label: '$50–$100',  min: 50,  max: 100 },
  { label: '$100–$500', min: 100, max: 500 },
  { label: '> $500',    min: 500, max: Infinity },
];

const UNSET_LABEL = '(unset)';

// ---------------------------------------------------------------------------
// Shared label helpers
// ---------------------------------------------------------------------------

/** Normalize raw asset-class strings to title-case display labels. */
export function normalizeAssetClassLabel(raw: string): string {
  switch (raw.toLowerCase().trim()) {
    case 'futures': return 'Futures';
    case 'stocks':  return 'Stocks';
    case 'options': return 'Options';
    case 'crypto':  return 'Crypto';
    case 'forex':   return 'Forex';
    default: {
      // Title-case fallback for unknown values
      const s = raw.trim();
      return s.length === 0 ? '(unknown)' : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    }
  }
}

/** Trade hold time in minutes (float), or null when open_at/close_at is missing/invalid. */
function tradeDurationMinutes(t: Trade): number | null {
  if (!t.open_at || !t.close_at) return null;
  const mins = dayjs(t.close_at).diff(dayjs(t.open_at), 'minute', true);
  return Number.isFinite(mins) && mins >= 0 ? mins : null;
}

function durationBucketLabel(t: Trade): string {
  const mins = tradeDurationMinutes(t);
  if (mins == null) return UNSET_LABEL;
  const b = DURATION_BUCKETS.find(bucket => mins >= bucket.min && mins < bucket.max);
  return b ? b.label : UNSET_LABEL;
}

function priceRangeLabel(t: Trade): string {
  const price = t.entry_price;
  if (price == null || !Number.isFinite(price)) return UNSET_LABEL;
  const b = PRICE_BUCKETS.find(bucket => price >= bucket.min && price < bucket.max);
  return b ? b.label : UNSET_LABEL;
}

function monthLabel(t: Trade): string {
  return dayjs(t.open_at).format('YYYY-MM');
}

// ---------------------------------------------------------------------------
// Grouping functions — Day & Time
// ---------------------------------------------------------------------------

export function groupByDow(trades: Trade[]): BreakdownRow[] {
  const map = new Map<number, BreakdownRow>(
    TRADING_DAYS.map(d => [d, emptyRow(DAY_NAMES[d])])
  );
  for (const t of trades) {
    const dow = dayjs(t.open_at).day(); // 0=Sun..6=Sat
    const row = map.get(dow);
    if (row) accumulateTrade(row, t);
  }
  return TRADING_DAYS.map(d => map.get(d)!);
}

export function groupByHour(trades: Trade[]): BreakdownRow[] {
  const map = new Map<number, BreakdownRow>();
  for (const t of trades) {
    const h = dayjs(t.open_at).hour();
    if (!map.has(h)) map.set(h, emptyRow(`${String(h).padStart(2, '0')}:00`));
    accumulateTrade(map.get(h)!, t);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, row]) => row);
}

export function groupBySession(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const t of trades) {
    const key = t.session ?? '(unset)';
    if (!map.has(key)) map.set(key, emptyRow(key));
    accumulateTrade(map.get(key)!, t);
  }
  return Array.from(map.values()).sort((a, b) => b.netPnl - a.netPnl);
}

// ---------------------------------------------------------------------------
// Grouping functions — Risk
// ---------------------------------------------------------------------------

export function groupByRBucket(trades: Trade[]): BreakdownRow[] {
  const rows = R_BUCKETS.map(b => emptyRow(b.label));
  for (const t of trades) {
    const r = t.actual_user_r ?? t.actual_r ?? t.rr ?? 0;
    const idx = R_BUCKETS.findIndex(b => r >= b.min && r < b.max);
    if (idx !== -1) accumulateTrade(rows[idx], t);
  }
  return rows;
}

export function groupByRiskUsd(trades: Trade[]): BreakdownRow[] {
  const rows = RISK_BUCKETS.map(b => emptyRow(b.label));
  const withRisk = trades.filter(t => t.risk_usd != null && t.risk_usd > 0);
  for (const t of withRisk) {
    const risk = t.risk_usd!;
    const idx = RISK_BUCKETS.findIndex(b => risk >= b.min && risk < b.max);
    if (idx !== -1) accumulateTrade(rows[idx], t);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Grouping functions — Tags & Asset Class
// ---------------------------------------------------------------------------

export function groupByTag(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const t of trades) {
    const tradeTags = t.tags && t.tags.length > 0 ? t.tags : ['(untagged)'];
    for (const tag of tradeTags) {
      if (!map.has(tag)) map.set(tag, emptyRow(tag));
      accumulateTrade(map.get(tag)!, t);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.netPnl - a.netPnl);
}

export function groupByAssetClass(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const t of trades) {
    const raw = t.asset_class ?? getAssetClass(t.symbol ?? '');
    const label = normalizeAssetClassLabel(raw);
    if (!map.has(label)) map.set(label, emptyRow(label));
    accumulateTrade(map.get(label)!, t);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Grouping functions — new dimensions
// ---------------------------------------------------------------------------

export function groupBySymbol(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const t of trades) {
    const key = t.symbol?.trim() || '(unknown)';
    if (!map.has(key)) map.set(key, emptyRow(key));
    accumulateTrade(map.get(key)!, t);
  }
  return Array.from(map.values()).sort((a, b) => b.netPnl - a.netPnl);
}

/** Standalone Strategy breakdown. Fallback label differs from the matrix's "(unset)" by design. */
export function groupByStrategy(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const t of trades) {
    const key = t.strategy_name?.trim() || 'No strategy';
    if (!map.has(key)) map.set(key, emptyRow(key));
    accumulateTrade(map.get(key)!, t);
  }
  return Array.from(map.values()).sort((a, b) => b.netPnl - a.netPnl);
}

export function groupByDuration(trades: Trade[]): BreakdownRow[] {
  const rows = DURATION_BUCKETS.map(b => emptyRow(b.label));
  for (const t of trades) {
    const mins = tradeDurationMinutes(t);
    if (mins == null) continue;
    const idx = DURATION_BUCKETS.findIndex(b => mins >= b.min && mins < b.max);
    if (idx !== -1) accumulateTrade(rows[idx], t);
  }
  return rows;
}

export function groupByPriceRange(trades: Trade[]): BreakdownRow[] {
  const rows = PRICE_BUCKETS.map(b => emptyRow(b.label));
  for (const t of trades) {
    const price = t.entry_price;
    if (price == null || !Number.isFinite(price)) continue;
    const idx = PRICE_BUCKETS.findIndex(b => price >= b.min && price < b.max);
    if (idx !== -1) accumulateTrade(rows[idx], t);
  }
  return rows;
}

/** Calendar-month rows (YYYY-MM), sorted chronologically ascending. */
export function groupByMonth(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const t of trades) {
    const key = monthLabel(t);
    if (!map.has(key)) map.set(key, emptyRow(key));
    accumulateTrade(map.get(key)!, t);
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------------------
// Top / Bottom N quick views
// ---------------------------------------------------------------------------

export interface TopBottomResult {
  top: BreakdownRow[];
  bottom: BreakdownRow[];
}

/** Top N (highest net P&L first) and bottom N (lowest net P&L first) rows. */
export function topBottomByNetPnl(rows: BreakdownRow[], n = 10): TopBottomResult {
  const sorted = [...rows].sort((a, b) => b.netPnl - a.netPnl);
  return {
    top: sorted.slice(0, n),
    bottom: sorted.slice(-n).reverse(),
  };
}

// ---------------------------------------------------------------------------
// Per-dimension summary cards (Best / Worst / Most Active)
// ---------------------------------------------------------------------------

export interface DimensionSummary {
  best: BreakdownRow | null;
  worst: BreakdownRow | null;
  mostActive: BreakdownRow | null;
}

/** Rows must have at least `minCount` trades to qualify for a summary slot. */
export function computeDimensionSummary(rows: BreakdownRow[], minCount = 3): DimensionSummary {
  const eligible = rows.filter(r => r.count >= minCount);
  if (eligible.length === 0) return { best: null, worst: null, mostActive: null };

  let best = eligible[0];
  let worst = eligible[0];
  let mostActive = eligible[0];
  for (const r of eligible) {
    if (r.netPnl > best.netPnl) best = r;
    if (r.netPnl < worst.netPnl) worst = r;
    if (r.count > mostActive.count) mostActive = r;
  }
  return { best, worst, mostActive };
}

// ---------------------------------------------------------------------------
// Cross-Analysis matrix — dimension accessors + registry
// ---------------------------------------------------------------------------

/** Maps a single trade to its label along one matrix axis. */
export type DimAccessor = (t: Trade) => string;

const dimDow: DimAccessor = t => DAY_NAMES[dayjs(t.open_at).day()];
const dimHour: DimAccessor = t => `${String(dayjs(t.open_at).hour()).padStart(2, '0')}:00`;
const dimSession: DimAccessor = t => t.session?.trim() || UNSET_LABEL;
const dimStrategy: DimAccessor = t => t.strategy_name?.trim() || UNSET_LABEL;
const dimAsset: DimAccessor = t => normalizeAssetClassLabel(t.asset_class ?? getAssetClass(t.symbol ?? ''));
// Matrix cells need one label per trade; a trade's first tag represents it here
// (the standalone Tags tab explodes multi-tag trades into every matching row instead).
const dimTag: DimAccessor = t => (t.tags && t.tags.length > 0 ? t.tags[0] : '(untagged)');
const dimRBucket: DimAccessor = t => {
  const r = t.actual_user_r ?? t.actual_r ?? t.rr ?? 0;
  const b = R_BUCKETS.find(bucket => r >= bucket.min && r < bucket.max);
  return b ? b.label : UNSET_LABEL;
};
const dimRiskSize: DimAccessor = t => {
  if (t.risk_usd == null || t.risk_usd <= 0) return UNSET_LABEL;
  const risk = t.risk_usd;
  const b = RISK_BUCKETS.find(bucket => risk >= bucket.min && risk < bucket.max);
  return b ? b.label : UNSET_LABEL;
};

/** Builds a per-trade accessor that buckets symbols into "top 10 by trade count" + "Other". */
export function makeSymbolTop10Accessor(trades: Trade[]): DimAccessor {
  const counts = new Map<string, number>();
  for (const t of trades) {
    const key = t.symbol?.trim() || '(unknown)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const top10 = new Set(
    Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sym]) => sym)
  );
  return (t: Trade) => {
    const key = t.symbol?.trim() || '(unknown)';
    return top10.has(key) ? key : 'Other';
  };
}

export interface MatrixDimensionDef {
  id: string;
  label: string;
  /** Some accessors (e.g. symbol top-10) need the full trade set to bucket correctly. */
  getAccessor: (trades: Trade[]) => DimAccessor;
}

export const MATRIX_DIMENSIONS: MatrixDimensionDef[] = [
  { id: 'dow',        label: 'Day of Week',      getAccessor: () => dimDow },
  { id: 'hour',       label: 'Hour',             getAccessor: () => dimHour },
  { id: 'session',    label: 'Session',          getAccessor: () => dimSession },
  { id: 'symbol',     label: 'Symbol (Top 10)',  getAccessor: makeSymbolTop10Accessor },
  { id: 'strategy',   label: 'Strategy',         getAccessor: () => dimStrategy },
  { id: 'tag',        label: 'Tag',              getAccessor: () => dimTag },
  { id: 'assetClass', label: 'Asset Class',      getAccessor: () => dimAsset },
  { id: 'rBucket',    label: 'R-Multiple',       getAccessor: () => dimRBucket },
  { id: 'riskSize',   label: 'Risk Size',        getAccessor: () => dimRiskSize },
  { id: 'duration',   label: 'Duration',         getAccessor: () => durationBucketLabel },
  { id: 'priceRange', label: 'Price Range',      getAccessor: () => priceRangeLabel },
  { id: 'month',      label: 'Month',            getAccessor: () => monthLabel },
];

// ---------------------------------------------------------------------------
// Matrix builder
// ---------------------------------------------------------------------------

/** Above this many distinct keys on an axis, cap to the top N by trade count. */
const MATRIX_CAP_THRESHOLD = 30;
/** How many keys survive capping. */
const MATRIX_MAX_AXIS = 20;

export interface MatrixResult {
  rowKeys: string[];
  colKeys: string[];
  cells: Map<string, BreakdownRow>;
  bestCell: { rowKey: string; colKey: string; row: BreakdownRow } | null;
  /** True when either axis was truncated to the top MATRIX_MAX_AXIS keys by trade count. */
  capped: boolean;
}

export function buildMatrix(
  trades: Trade[],
  rowAccessor: DimAccessor,
  colAccessor: DimAccessor,
): MatrixResult {
  const cells = new Map<string, BreakdownRow>();
  const rowTotals = new Map<string, number>(); // rowKey → netPnl, for sorting
  const rowCounts = new Map<string, number>(); // rowKey → trade count, for capping
  const colCounts = new Map<string, number>(); // colKey → trade count, for capping
  const colSet = new Set<string>();

  for (const t of trades) {
    const rk = rowAccessor(t);
    const ck = colAccessor(t);
    const key = `${rk}||${ck}`;
    if (!cells.has(key)) cells.set(key, emptyRow(rk));
    accumulateTrade(cells.get(key)!, t);
    rowTotals.set(rk, (rowTotals.get(rk) ?? 0) + (t.pnl ?? 0));
    rowCounts.set(rk, (rowCounts.get(rk) ?? 0) + 1);
    colCounts.set(ck, (colCounts.get(ck) ?? 0) + 1);
    colSet.add(ck);
  }

  // Sort rows by total netPnl desc, keep '(unset)' last
  let rowKeys = Array.from(rowTotals.keys()).sort((a, b) => {
    if (a === UNSET_LABEL) return 1;
    if (b === UNSET_LABEL) return -1;
    return (rowTotals.get(b) ?? 0) - (rowTotals.get(a) ?? 0);
  });

  // Sort cols alphabetically, keep '(unset)' last
  let colKeys = Array.from(colSet).sort((a, b) => {
    if (a === UNSET_LABEL) return 1;
    if (b === UNSET_LABEL) return -1;
    return a.localeCompare(b);
  });

  let capped = false;
  if (rowKeys.length > MATRIX_CAP_THRESHOLD) {
    rowKeys = [...rowKeys]
      .sort((a, b) => (rowCounts.get(b) ?? 0) - (rowCounts.get(a) ?? 0))
      .slice(0, MATRIX_MAX_AXIS)
      .sort((a, b) => (rowTotals.get(b) ?? 0) - (rowTotals.get(a) ?? 0));
    capped = true;
  }
  if (colKeys.length > MATRIX_CAP_THRESHOLD) {
    colKeys = [...colKeys]
      .sort((a, b) => (colCounts.get(b) ?? 0) - (colCounts.get(a) ?? 0))
      .slice(0, MATRIX_MAX_AXIS)
      .sort((a, b) => a.localeCompare(b));
    capped = true;
  }

  const rowKeySet = new Set(rowKeys);
  const colKeySet = new Set(colKeys);

  // Find best cell: highest netPnl among rendered cells with count >= 3
  let bestCell: MatrixResult['bestCell'] = null;
  for (const [key, row] of cells.entries()) {
    if (row.count < 3) continue;
    const [rowKey, colKey] = key.split('||');
    if (!rowKeySet.has(rowKey) || !colKeySet.has(colKey)) continue;
    if (bestCell === null || row.netPnl > bestCell.row.netPnl) {
      bestCell = { rowKey, colKey, row };
    }
  }

  return { rowKeys, colKeys, cells, bestCell, capped };
}
