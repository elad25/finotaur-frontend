// src/components/charting/orderflow/valueArea.ts
// Shared pure helper for the standard Value Area (70%-of-volume) algorithm —
// extracted from volumeProfile.ts (PR 3, F4) so footprintRender.ts's
// per-candle prepare pass (config.showValueArea) and the visible-range
// Volume Profile overlay (volumeProfile.ts) compute POC/VAH/VAL with a
// single source of truth instead of two independently-maintained copies.
//
// Deliberately generic over `{ price, vol }` rows (not tied to
// VolumeProfileRow or the footprint's MergedBin shape) so both callers can
// map their own row type into this contract without either depending on the
// other's module.

export interface ValueAreaInputRow {
  price: number;
  vol: number;
}

export interface ValueAreaResult {
  /** Index of the row with the largest vol (first one wins on ties). Null iff rows is empty. */
  pocIdx: number | null;
  /** Index of the Value Area High boundary row. Null iff rows is empty. */
  vahIdx: number | null;
  /** Index of the Value Area Low boundary row. Null iff rows is empty. */
  valIdx: number | null;
}

/**
 * Standard Value Area algorithm (TradingView/ATAS convention): find POC
 * (largest-volume row), then greedily expand the boundary toward whichever
 * neighbor row (one above the current high boundary, one below the current
 * low boundary) has the LARGER volume, accumulating until >= 70% of total
 * volume is enclosed. Ties prefer expanding upward (arbitrary but
 * deterministic).
 *
 * `rows` must already be sorted ascending by `price` — callers own that
 * ordering (both existing call sites already produce ascending-by-price
 * rows, so no sort happens here to avoid a redundant O(n log n) on an
 * already-sorted input).
 */
export function computeValueArea(rows: ValueAreaInputRow[]): ValueAreaResult {
  if (rows.length === 0) return { pocIdx: null, vahIdx: null, valIdx: null };

  let pocIdx = 0;
  let bestVol = rows[0].vol;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].vol > bestVol) {
      bestVol = rows[i].vol;
      pocIdx = i;
    }
  }

  const totalVol = rows.reduce((sum, r) => sum + r.vol, 0);
  if (totalVol <= 0) return { pocIdx, vahIdx: pocIdx, valIdx: pocIdx };

  const targetVol = totalVol * 0.7;

  let hi = pocIdx;
  let lo = pocIdx;
  let accumulated = rows[pocIdx].vol;

  while (accumulated < targetVol && (hi < rows.length - 1 || lo > 0)) {
    const nextHiVol = hi < rows.length - 1 ? rows[hi + 1].vol : -1;
    const nextLoVol = lo > 0 ? rows[lo - 1].vol : -1;

    if (nextHiVol < 0 && nextLoVol < 0) break; // both exhausted

    if (nextHiVol >= nextLoVol) {
      hi += 1;
      accumulated += nextHiVol;
    } else {
      lo -= 1;
      accumulated += nextLoVol;
    }
  }

  return { pocIdx, vahIdx: hi, valIdx: lo };
}
