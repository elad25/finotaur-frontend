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
// R is INITIAL-1R (credits scale-in): realized P&L ÷ the risk on the table at the
// INITIAL entry = |firstEntry − stop| × firstQty × mult. The whole merged position
// uses ONE unified stop — the widest (initial/protective) stop across its legs
// (lowest price for a long, highest for a short) — so copier copies / micro+mini
// that each recorded a slightly different (e.g. trailed) stop don't distort R.
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

/** True when the symbol's root is a micro contract (MNQ, MES, M2K, …). */
function isMicroSymbol(symbol?: string | null): boolean {
  const m = (symbol ?? '').trim().toUpperCase().match(FUTURES_RE);
  return m ? Object.prototype.hasOwnProperty.call(MICRO_TO_MINI, m[1]) : false;
}

/**
 * Symbol to DISPLAY for a merged decision. When a position mixes micro and
 * mini/standard contracts of the same family (e.g. MNQU6 + NQU6), show the
 * MICRO symbol so every row of that family reads uniformly (Elad's 2026-06-30
 * request: "if there's a micro+mini combination, make it one micro row").
 * A pure mini/standard (or non-futures) cluster keeps the representative's own
 * symbol. Display-only — grouping, P&L, quantity and R are unaffected.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function displaySymbol(cluster: Record<string, any>[]): string {
  const micro = cluster.find((t) => isMicroSymbol(t.symbol));
  const rep = cluster[0];
  return String((micro ?? rep)?.symbol ?? '');
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

/** First entry leg of a row: partial_entries[0], falling back to entry_price/quantity. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function firstLeg(trade: Record<string, any>): { price: number; qty: number } {
  const legs = Array.isArray(trade.partial_entries) ? trade.partial_entries : [];
  const first = legs.length > 0 ? legs[0] : undefined;
  return {
    price: Number(first?.price ?? trade.entry_price),
    qty: Number(first?.quantity ?? trade.quantity ?? 0),
  };
}

/**
 * One unified stop for a whole merged decision: the WIDEST (initial/protective)
 * stop across its legs — lowest price for a long, highest for a short. Using the
 * widest stop avoids letting a tighter (trailed / copier-variant) stop on one leg
 * inflate R. Null when no leg has a usable stop.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unifiedStop(cluster: Record<string, any>[]): number | null {
  const isShort = (cluster[0]?.side ?? '').toString().toUpperCase() === 'SHORT';
  const stops = cluster
    .filter((t) => t.stop_price != null) // Number(null)===0 is finite — exclude before mapping
    .map((t) => Number(t.stop_price))
    .filter((s) => Number.isFinite(s));
  if (stops.length === 0) return null;
  return isShort ? Math.max(...stops) : Math.min(...stops);
}

/**
 * INITIAL-1R risk in $ for a whole decision: Σ over legs of
 * |firstEntry − unifiedStop| × firstQty × mult. Credits scale-in (P&L is earned
 * on the grown size, risk stays anchored to the initial entry). Returns null when
 * there's no usable stop (UI then falls back to user-1R from settings).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function summedInitialRisk(cluster: Record<string, any>[]): number | null {
  const stop = unifiedStop(cluster);
  if (stop == null) return null;
  let sum = 0;
  for (const t of cluster) {
    const { price, qty } = firstLeg(t);
    const mult =
      Number(t.multiplier) > 0 ? Number(t.multiplier) : getAssetMultiplier(t.symbol || '');
    const dist = Math.abs(price - stop);
    if (Number.isFinite(price) && Number.isFinite(qty) && dist > 0 && qty > 0 && mult > 0) {
      sum += dist * qty * mult;
    }
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
