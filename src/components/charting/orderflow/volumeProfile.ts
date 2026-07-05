// src/components/charting/orderflow/volumeProfile.ts
// Pure aggregation for the ATAS-style Volume Profile overlay. No React, no
// canvas — VolumeProfileLayer.tsx consumes this to know what to draw.
//
// v1 scope: VISIBLE-RANGE profile only (aggregates whatever FlowCandleView[]
// window the caller passes in — typically the chart's current visible time
// range). Session-anchored profiles (reset at a fixed session boundary, e.g.
// 00:00 UTC or exchange open) are a common ATAS/Bookmap mode too, but need a
// session-boundary policy decision (which timezone? which session?) that is
// out of scope here.
// TODO(session-mode): add a `mode: 'visible' | 'session'` param once a
// session-boundary convention is chosen for crypto (24/7 market — "session"
// would need to be an arbitrary UTC-day or exchange-funding-window cut).

import type { FlowBin, FlowCandleView } from './types';

/** One row of the profile: an absolute price bin with split buy/sell volume. */
export interface VolumeProfileRow {
  /** Bucketed price = binPrice (same bucketing as FlowBinStore's rowSize). */
  binPrice: number;
  buyVol: number;
  sellVol: number;
  totalVol: number;
}

export interface VolumeProfile {
  /** Rows sorted ascending by binPrice. Empty when no candles/volume in range. */
  rows: VolumeProfileRow[];
  /** Point of Control — binPrice of the single highest-volume row. Null if rows is empty. */
  poc: number | null;
  /** Value Area High — top price boundary of the 70%-volume band around POC. */
  vah: number | null;
  /** Value Area Low — bottom price boundary of the 70%-volume band around POC. */
  val: number | null;
  /** Sum of totalVol across all rows — used by the renderer to scale row widths. */
  maxRowVol: number;
}

const EMPTY_PROFILE: VolumeProfile = { rows: [], poc: null, vah: null, val: null, maxRowVol: 0 };

/**
 * Aggregates buy/sell volume by absolute price bin across every candle in
 * `candles` (the caller filters to the desired range — visible range for v1).
 * Bins that already share a binPrice (e.g. adjacent candles trading at the
 * same level) are summed together — the profile is a horizontal histogram
 * over the whole range, not per-candle.
 */
export function computeVolumeProfile(candles: FlowCandleView[]): VolumeProfile {
  if (candles.length === 0) return EMPTY_PROFILE;

  const byPrice = new Map<number, { buyVol: number; sellVol: number }>();
  for (const candle of candles) {
    for (const bin of candle.bins) {
      const existing = byPrice.get(bin.binPrice);
      if (existing) {
        existing.buyVol += bin.buyVol;
        existing.sellVol += bin.sellVol;
      } else {
        byPrice.set(bin.binPrice, { buyVol: bin.buyVol, sellVol: bin.sellVol });
      }
    }
  }

  if (byPrice.size === 0) return EMPTY_PROFILE;

  const rows: VolumeProfileRow[] = Array.from(byPrice.entries())
    .map(([binPrice, v]) => ({
      binPrice,
      buyVol: v.buyVol,
      sellVol: v.sellVol,
      totalVol: v.buyVol + v.sellVol,
    }))
    .sort((a, b) => a.binPrice - b.binPrice);

  const maxRowVol = rows.reduce((max, r) => Math.max(max, r.totalVol), 0);

  const pocIdx = computePocIndex(rows);
  const poc = pocIdx === null ? null : rows[pocIdx].binPrice;

  const { vahIdx, valIdx } = computeValueArea(rows, pocIdx);
  const vah = vahIdx === null ? null : rows[vahIdx].binPrice;
  const val = valIdx === null ? null : rows[valIdx].binPrice;

  return { rows, poc, vah, val, maxRowVol };
}

/** Index of the row with the largest totalVol (first one wins on ties). */
function computePocIndex(rows: VolumeProfileRow[]): number | null {
  if (rows.length === 0) return null;
  let bestIdx = 0;
  let bestVol = rows[0].totalVol;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].totalVol > bestVol) {
      bestVol = rows[i].totalVol;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Standard Value Area algorithm (TradingView/ATAS convention):
 * start at POC, greedily expand the boundary toward whichever neighbor row
 * (one above the current high boundary, one below the current low boundary)
 * has the LARGER volume, accumulating until >= 70% of total volume is
 * enclosed. Ties prefer expanding upward (arbitrary but deterministic).
 */
function computeValueArea(
  rows: VolumeProfileRow[],
  pocIdx: number | null,
): { vahIdx: number | null; valIdx: number | null } {
  if (pocIdx === null || rows.length === 0) return { vahIdx: null, valIdx: null };

  const totalVol = rows.reduce((sum, r) => sum + r.totalVol, 0);
  if (totalVol <= 0) return { vahIdx: pocIdx, valIdx: pocIdx };

  const targetVol = totalVol * 0.7;

  let hi = pocIdx;
  let lo = pocIdx;
  let accumulated = rows[pocIdx].totalVol;

  while (accumulated < targetVol && (hi < rows.length - 1 || lo > 0)) {
    const nextHiVol = hi < rows.length - 1 ? rows[hi + 1].totalVol : -1;
    const nextLoVol = lo > 0 ? rows[lo - 1].totalVol : -1;

    if (nextHiVol < 0 && nextLoVol < 0) break; // both exhausted

    if (nextHiVol >= nextLoVol) {
      hi += 1;
      accumulated += nextHiVol;
    } else {
      lo -= 1;
      accumulated += nextLoVol;
    }
  }

  return { vahIdx: hi, valIdx: lo };
}

/** Convenience: split a row's total into buy/sell fractions for rendering. */
export function rowBuySellFractions(row: FlowBin | VolumeProfileRow): { buyFrac: number; sellFrac: number } {
  const total = row.buyVol + row.sellVol;
  if (total <= 0) return { buyFrac: 0, sellFrac: 0 };
  return { buyFrac: row.buyVol / total, sellFrac: row.sellVol / total };
}
