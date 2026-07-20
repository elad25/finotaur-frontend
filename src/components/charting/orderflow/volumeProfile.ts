// src/components/charting/orderflow/volumeProfile.ts
// Pure aggregation for the ATAS-style Volume Profile overlay. No React, no
// canvas — VolumeProfileLayer.tsx consumes this to know what to draw.
//
// Range-agnostic by design: this module only aggregates whatever
// FlowCandleView[] window the caller passes in — it has no opinion on
// whether that window is the chart's current visible time range or a
// session-anchored range. VolumeProfileLayer.tsx picks the window (visible
// range, or [sessionStartSec, +Inf) in SESSION mode — see its
// `sessionStartSec` prop) and passes the resulting candles here.

import type { FlowBin, FlowCandleView } from './types';
import { computeValueArea } from './valueArea';

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

  const { pocIdx, vahIdx, valIdx } = computeValueArea(
    rows.map((r) => ({ price: r.binPrice, vol: r.totalVol })),
  );
  const poc = pocIdx === null ? null : rows[pocIdx].binPrice;
  const vah = vahIdx === null ? null : rows[vahIdx].binPrice;
  const val = valIdx === null ? null : rows[valIdx].binPrice;

  return { rows, poc, vah, val, maxRowVol };
}

/** Convenience: split a row's total into buy/sell fractions for rendering. */
export function rowBuySellFractions(row: FlowBin | VolumeProfileRow): { buyFrac: number; sellFrac: number } {
  const total = row.buyVol + row.sellVol;
  if (total <= 0) return { buyFrac: 0, sellFrac: 0 };
  return { buyFrac: row.buyVol / total, sellFrac: row.sellVol / total };
}
