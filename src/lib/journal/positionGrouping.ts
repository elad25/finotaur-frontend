// src/lib/journal/positionGrouping.ts
// ════════════════════════════════════════════════════════
// Shared position grouping + classic risk — the single source of truth for how
// the journal collapses copier-duplicated / scaled / micro+mini trade rows into
// one logical "decision", and how R (classic) is computed.
//
// Used by BOTH:
//   • normalizeTraderTrades  (TRADER scope — averages $ across copies)
//   • aggregateCopiedTrades  (ALL ACCOUNTS scope — sums $ across copies)
// so the two views can never disagree on grouping or on R.
//
// Grouping is NET-FLAT and CONTRACT-FAMILY aware: per (contract root, side),
// round-trip rows are single-linkage clustered by [open_at, close_at] overlap.
//   • Concurrent copier copies of one decision overlap → merge.
//   • Micro and mini of the same underlying (MNQ+NQ, MES+ES, …) share a root → merge.
//   • Separate flat→flat round-trips don't overlap → stay distinct.
//
// R is CLASSIC: realized P&L ÷ full-position risk (|avgEntry − stop| × qty × mult,
// i.e. trades.risk_usd). It does not depend on scale-in size or copier count, so
// the same trade reads the same R regardless of how it was sized.
// ════════════════════════════════════════════════════════

import { getAssetMultiplier } from '@/utils/tradeCalculations';

// Micro future root → its mini/standard root. Used so a Nasdaq trade sized across
// MNQ (micro) and NQ (mini) is one position. Roots not listed pass through as-is.
const MICRO_TO_MINI: Record<string, string> = {
  MNQ: 'NQ', MES: 'ES', MYM: 'YM', M2K: 'RTY', MGC: 'GC', MSI: 'SI', MHG: 'HG',
  MCL: 'CL', MBT: 'BTC', MET: 'ETH', M6E: '6E', M6A: '6A', M6B: '6B', M6C: '6C',
  M6S: '6S', MJY: '6J',
};
// Futures symbol = ROOT + MONTH(F G H J K M N Q U V X Z) + YEAR(1-2 digits), e.g. NQU6, MNQU6.
const FUTURES_RE = /^([A-Z0-9]+?)([FGHJKMNQUVXZ])(\d{1,2})$/;

/**
 * Contract-family key: micro and mini of the same underlying+expiry collapse to
 * the same value (MNQU6 → NQU6, MESZ5 → ESZ5). Non-futures symbols (stocks,
 * BTCUSD, …) are returned unchanged so they only group with their exact symbol.
 */
export function contractRoot(symbol?: string | null): string {
  const s = (symbol ?? '').trim().toUpperCase();
  const m = s.match(FUTURES_RE);
  if (!m) return s;
  const [, root, month, year] = m;
  const mini = MICRO_TO_MINI[root] ?? root;
  return `${mini}${month}${year}`;
}

function timeMs(ts?: string | null): number {
  if (!ts) return NaN;
  const v = new Date(ts).getTime();
  return Number.isFinite(v) ? v : NaN;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function partitionKey(trade: Record<string, any>): string {
  return `${contractRoot(trade.symbol)}|${trade.side ?? ''}`;
}

/**
 * Classic risk in $ for one row: full-position risk = |avgEntry − stop| × qty ×
 * multiplier. Prefers the stored trades.risk_usd; falls back to entry/stop/qty.
 * Returns null when there's no usable stop (UI then falls back to user-1R).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function classicRisk(trade: Record<string, any>): number | null {
  const stored = Number(trade.risk_usd);
  if (Number.isFinite(stored) && stored > 0) return stored;
  if (trade.stop_price == null) return null;
  const entry = Number(trade.entry_price);
  const stop = Number(trade.stop_price);
  const qty = Number(trade.quantity ?? 0);
  const mult =
    Number(trade.multiplier) > 0 ? Number(trade.multiplier) : getAssetMultiplier(trade.symbol || '');
  const dist = Math.abs(entry - stop);
  if (Number.isFinite(dist) && dist > 0 && qty > 0 && mult > 0) return dist * qty * mult;
  return null;
}

/** Σ classic risk across the decision's rows; null when no row has a usable stop. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function summedClassicRisk(trades: Record<string, any>[]): number | null {
  let sum = 0;
  for (const t of trades) {
    const r = classicRisk(t);
    if (r != null) sum += r;
  }
  return sum > 0 ? sum : null;
}

/**
 * Net-flat clustering: per (contract root, side), merge rows whose
 * [open_at, close_at] intervals overlap (single-linkage). A row with no/invalid
 * close is treated as still-open (close = +∞). Rows with an invalid open_at
 * never merge.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function clusterByOverlap<T extends Record<string, any>>(trades: T[]): T[][] {
  const partitions = new Map<string, T[]>();
  for (const trade of trades) {
    const key = partitionKey(trade);
    const part = partitions.get(key) ?? [];
    part.push(trade);
    partitions.set(key, part);
  }

  const clusters: T[][] = [];
  for (const part of partitions.values()) {
    const sorted = [...part].sort((a, b) => {
      const am = timeMs(a.open_at);
      const bm = timeMs(b.open_at);
      if (!Number.isFinite(am) && !Number.isFinite(bm)) return 0;
      if (!Number.isFinite(am)) return 1; // invalid open sorts last
      if (!Number.isFinite(bm)) return -1;
      return am - bm;
    });

    let cluster: T[] = [];
    let clusterMaxClose = -Infinity;
    for (const t of sorted) {
      const openMs = timeMs(t.open_at);
      const closeRaw = timeMs(t.close_at);
      const closeMs = Number.isFinite(closeRaw) ? closeRaw : Infinity;
      if (cluster.length === 0) {
        cluster = [t];
        clusterMaxClose = closeMs;
      } else if (Number.isFinite(openMs) && openMs <= clusterMaxClose) {
        cluster.push(t);
        clusterMaxClose = Math.max(clusterMaxClose, closeMs);
      } else {
        clusters.push(cluster);
        cluster = [t];
        clusterMaxClose = closeMs;
      }
    }
    if (cluster.length > 0) clusters.push(cluster);
  }
  return clusters;
}
