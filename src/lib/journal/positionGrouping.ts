// src/lib/journal/positionGrouping.ts
// ════════════════════════════════════════════════════════
// Shared position grouping + initial-1R risk — the single source of truth for
// how the journal collapses copier-duplicated / scaled trade rows into one
// logical "decision", and how R is anchored to the INITIAL entry's risk.
//
// Used by BOTH:
//   • normalizeTraderTrades  (TRADER scope — averages $ across copies)
//   • aggregateCopiedTrades  (ALL ACCOUNTS scope — sums $ across copies)
// so the two views can never disagree on grouping or on R.
//
// Grouping is NET-FLAT: per (symbol, side), round-trip rows are single-linkage
// clustered by [open_at, close_at] interval overlap. Concurrent copier copies
// of one decision overlap → merge; separate flat→flat round-trips don't overlap
// → stay distinct. No fixed time window.
//
// R is relative to the INITIAL 1R: |firstEntry − stop| × firstQty × multiplier
// (read from partial_entries[0], falling back to the row's entry_price/quantity).
// ════════════════════════════════════════════════════════

import { getAssetMultiplier } from '@/utils/tradeCalculations';

function timeMs(ts?: string | null): number {
  if (!ts) return NaN;
  const v = new Date(ts).getTime();
  return Number.isFinite(v) ? v : NaN;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function partitionKey(trade: Record<string, any>): string {
  return `${(trade.symbol ?? '').trim().toUpperCase()}|${trade.side ?? ''}`;
}

/**
 * Risk in $ committed at the INITIAL entry: |firstEntryPrice − stop| × firstQty
 * × multiplier. Reads partial_entries[0] when present, else falls back to the
 * row's entry_price/quantity. Returns null when there's no usable stop (so the
 * UI can fall back to user-1R from settings instead of locking onto a bogus R).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initialEntryRisk(trade: Record<string, any>): number | null {
  if (trade.stop_price == null) return null;
  const legs = Array.isArray(trade.partial_entries) ? trade.partial_entries : [];
  const first = legs.length > 0 ? legs[0] : undefined;
  const price0 = Number(first?.price ?? trade.entry_price);
  const qty0 = Number(first?.quantity ?? trade.quantity ?? 0);
  const stop = Number(trade.stop_price);
  const mult =
    Number(trade.multiplier) > 0 ? Number(trade.multiplier) : getAssetMultiplier(trade.symbol || '');
  const dist = Math.abs(price0 - stop);
  if (
    Number.isFinite(price0) &&
    Number.isFinite(stop) &&
    Number.isFinite(qty0) &&
    dist > 0 &&
    qty0 > 0 &&
    mult > 0
  ) {
    return dist * qty0 * mult;
  }
  return null;
}

/** Σ initial-1R across the decision's copies; null when no copy has a usable stop. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function summedInitialRisk(trades: Record<string, any>[]): number | null {
  let sum = 0;
  for (const t of trades) {
    const r = initialEntryRisk(t);
    if (r != null) sum += r;
  }
  return sum > 0 ? sum : null;
}

/**
 * Net-flat clustering: per (symbol, side), merge rows whose [open_at, close_at]
 * intervals overlap (single-linkage). A row with no/invalid close is treated as
 * still-open (close = +∞). Rows with an invalid open_at never merge.
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
