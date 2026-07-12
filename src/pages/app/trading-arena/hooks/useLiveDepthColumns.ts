// src/pages/app/trading-arena/hooks/useLiveDepthColumns.ts
//
// In-memory, client-only live depth-column accumulator for the NT8 futures
// Liquidity heatmap. Deliberately NOT a port of
// src/pages/app/crypto/scanner/useDepthSlices.ts — that hook's job is
// mostly server-backed historical backfill (GET /api/crypto/depth-slices)
// plus a 5s live-edge append; there is no server-side depth-slice history
// for NT8 (the bridge is a pure client↔local-agent connection, nothing
// durable on FINOTAUR's servers), so "history" here only ever means
// "what this hook has sampled since the tab connected" — hence
// `recordingSinceMs` instead of a coverage-snap concept.
//
// Output shape (`DecodedColumn[]` + dominant `binSize`) is exactly what
// DepthMatrixLayer already consumes (see depthTypes.ts / useDepthSlices.ts)
// so LiquidityTab.tsx's futures branch can feed it into the SAME
// `wallRenderMode="matrix"` rendering path the crypto branch uses, with no
// changes to DepthMatrixLayer itself.
//
// ADAPTER TRADEOFF (flagged, not silently absorbed): DepthMatrixLayer
// decodes each bin's `q` as a USD notional via `qToUsd` (see
// useDepthSlices.ts's qToUsd/usdToQ — log-space uint16 encoding). Crypto
// depth naturally has a USD notional (price × base-asset qty). Futures
// resting size is in CONTRACTS, which has no single "USD value" without a
// point-value multiplier — this hook accepts an optional
// `notionalMultiplier` (callers pass the contract's point value, e.g. $20
// for NQ) so `price × qty × notionalMultiplier` produces a dollar-scaled
// figure the existing floor/color pipeline can filter and shade by. This
// is an approximation (not a real "USD locked in this order" figure — no
// margin/leverage semantics implied), not a redesign of DepthMatrixLayer.
//
// The sampling/ring logic below is factored into plain, exported functions
// (sampleBookToColumn / appendColumnToRing) so it's unit-testable without a
// React render harness — this codebase's established convention for hooks
// (see useLiquidityPreferences.ts/.test.ts's header comment). The hook
// itself is thin glue: an interval timer + refs + one setState per tick.

import { useEffect, useRef, useState } from 'react';
import type { BinRecord, DecodedColumn } from '@/pages/app/crypto/scanner/depthTypes';

export interface LiveDepthColumnsOptions {
  /** Stable accessor to the current live order book (same shape useNt8OrderBook/useBinanceOrderBook expose). */
  getBook: () => { bids: Map<number, number>; asks: Map<number, number> };
  /** Sampling is paused (no columns appended) while false. */
  isLive: boolean;
  /** price × qty × notionalMultiplier = the "notional" value fed into DepthMatrixLayer's qToUsd-based pipeline. Default 1 (raw price×qty). */
  notionalMultiplier?: number;
  /** Bins whose notional falls below this are dropped. Default 0 (no floor — LiquidityTab applies its own floor via depthMatrixFloorUsd on the render side). */
  floorUsd?: number;
}

export interface LiveDepthColumnsState {
  columns: DecodedColumn[];
  binSize: number;
  /** Epoch ms of the first sample taken this mount, or null before the first sample lands. */
  recordingSinceMs: number | null;
}

export const SAMPLE_INTERVAL_MS = 5_000;
// ~4h at one column per 5s.
export const RING_CAP = 2_880;

export function binFloor(price: number, binSize: number): number {
  return Math.floor(price / binSize) * binSize;
}

/** Encode a notional figure into the log-space uint16 `q` DepthMatrixLayer decodes via qToUsd. Mirrors useDepthSlices.ts's usdToQ. */
export function usdToQ(usd: number): number {
  return Math.round(Math.log1p(usd) * 1000);
}

/** Same clean-bin-size heuristic as useDepthSlices.ts's computeDepthBinSize — kept as an independent copy (this hook has no dependency on the crypto depth-slice module). */
export function computeBinSize(mid: number): number {
  const raw = mid * 0.0002;
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const ratio = raw / mag;
  if (ratio < 1.5) return mag;
  if (ratio < 3.5) return 2 * mag;
  if (ratio < 7.5) return 5 * mag;
  return 10 * mag;
}

export interface SampleBookOptions {
  notionalMultiplier: number;
  floorUsd: number;
  nowMs: number;
}

/**
 * Pure sampling step: reads a book snapshot ({bids,asks} Maps of price→qty)
 * and produces one DecodedColumn slotted onto the SAMPLE_INTERVAL_MS grid,
 * or null when the book is empty (no bids AND no asks — nothing to sample
 * yet, e.g. right after (re)connect before the first depth_snapshot).
 */
export function sampleBookToColumn(
  book: { bids: Map<number, number>; asks: Map<number, number> },
  opts: SampleBookOptions,
): DecodedColumn | null {
  const { bids, asks } = book;
  if (bids.size === 0 && asks.size === 0) return null;

  let bestBid = 0;
  let bestAsk = Infinity;
  for (const p of bids.keys()) if (p > bestBid) bestBid = p;
  for (const p of asks.keys()) if (p < bestAsk) bestAsk = p;
  if (bestBid === 0 && bestAsk === Infinity) return null;

  const mid = bestBid === 0 ? bestAsk : bestAsk === Infinity ? bestBid : (bestBid + bestAsk) / 2;
  const binSize = computeBinSize(mid);
  const { notionalMultiplier, floorUsd, nowMs } = opts;

  const bidBins = new Map<number, number>();
  for (const [price, qty] of bids) {
    if (price <= 0 || qty <= 0) continue;
    const notional = price * qty * notionalMultiplier;
    if (notional < floorUsd) continue;
    const bucket = binFloor(price, binSize);
    bidBins.set(bucket, (bidBins.get(bucket) ?? 0) + notional);
  }

  const askBins = new Map<number, number>();
  for (const [price, qty] of asks) {
    if (price <= 0 || qty <= 0) continue;
    const notional = price * qty * notionalMultiplier;
    if (notional < floorUsd) continue;
    const bucket = binFloor(price, binSize);
    askBins.set(bucket, (askBins.get(bucket) ?? 0) + notional);
  }

  const slotMs = Math.floor(nowMs / SAMPLE_INTERVAL_MS) * SAMPLE_INTERVAL_MS;

  const bidRecords: BinRecord[] = [];
  for (const [price, notional] of bidBins) {
    const q = usdToQ(notional);
    if (q > 0) bidRecords.push({ price, q });
  }
  const askRecords: BinRecord[] = [];
  for (const [price, notional] of askBins) {
    const q = usdToQ(notional);
    if (q > 0) askRecords.push({ price, q });
  }

  return { t: slotMs, anchor: mid, binSize, flags: 0, bids: bidRecords, asks: askRecords };
}

/**
 * Appends `col` to `ring` (mutates and returns `ring` for chaining), merging
 * into the last entry if it shares the same grid slot (`t`), and trims the
 * ring to `cap` entries from the front (oldest-first) when it grows past
 * the cap.
 */
export function appendColumnToRing(ring: DecodedColumn[], col: DecodedColumn, cap: number): DecodedColumn[] {
  const last = ring[ring.length - 1];
  if (last && last.t === col.t) {
    ring[ring.length - 1] = col;
  } else {
    ring.push(col);
    if (ring.length > cap) ring.splice(0, ring.length - cap);
  }
  return ring;
}

export function useLiveDepthColumns(opts: LiveDepthColumnsOptions): LiveDepthColumnsState {
  const { getBook, isLive, notionalMultiplier = 1, floorUsd = 0 } = opts;

  const [state, setState] = useState<LiveDepthColumnsState>({ columns: [], binSize: 1, recordingSinceMs: null });
  const ringRef = useRef<DecodedColumn[]>([]);
  const recordingSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLive) return;

    const sample = () => {
      const col = sampleBookToColumn(getBook(), { notionalMultiplier, floorUsd, nowMs: Date.now() });
      if (!col) return;

      if (recordingSinceRef.current === null) recordingSinceRef.current = col.t;

      const ring = appendColumnToRing(ringRef.current, col, RING_CAP);
      setState({ columns: ring.slice(), binSize: col.binSize, recordingSinceMs: recordingSinceRef.current });
    };

    sample();
    const id = setInterval(sample, SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isLive, getBook, notionalMultiplier, floorUsd]);

  return state;
}
