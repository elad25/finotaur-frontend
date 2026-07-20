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
import {
  buildGapColumn,
  loadDepthHistory,
  needsGapColumn,
  pruneDepthHistory,
  saveDepthHistory,
} from './depthHistoryStore';

export interface LiveDepthColumnsOptions {
  /** Stable accessor to the current live order book (same shape useNt8OrderBook/useBinanceOrderBook expose). */
  getBook: () => { bids: Map<number, number>; asks: Map<number, number> };
  /** Sampling is paused (no columns appended) while false. */
  isLive: boolean;
  /** price × qty × notionalMultiplier = the "notional" value fed into DepthMatrixLayer's qToUsd-based pipeline. Default 1 (raw price×qty). */
  notionalMultiplier?: number;
  /** Bins whose notional falls below this are dropped. Default 0 — the futures (NT8) path has no dust/floor filtering of its own (Phase 1 "no manual thresholds" overhaul only touched the crypto sampling path, useDepthSlices.ts); DepthMatrixLayer's render-side floor/size-filter props no longer exist at all. */
  floorUsd?: number;
  /**
   * Stable per-source persistence key (e.g. "nt8|NQ") — when provided, the
   * ring is persisted to IndexedDB (depthHistoryStore.ts) so it survives
   * tab switches and page reloads, and restored on mount / whenever this
   * key changes (e.g. contract-root switch). Omit to keep the hook purely
   * in-memory (its original behavior).
   */
  persistKey?: string;
}

export interface LiveDepthColumnsState {
  columns: DecodedColumn[];
  binSize: number;
  /** Epoch ms of the first sample taken this mount, or (after a successful restore) the oldest restored column's t. */
  recordingSinceMs: number | null;
  /** Epoch ms of the oldest column restored from IndexedDB this mount, or null when nothing was restored (fresh session / no persistKey / stale >48h snapshot). Lets UI distinguish "restored" from "recording since connect". */
  restoredFromMs: number | null;
}

// How often the ring is opportunistically flushed to IndexedDB while
// sampling — independent of SAMPLE_INTERVAL_MS so a bridge disconnect
// mid-window doesn't lose more than ~30s of otherwise-persisted history
// (a final flush also happens on cleanup/unmount, see below).
const PERSIST_SAVE_INTERVAL_MS = 30_000;

// A restored snapshot is only seeded into the ring if its newest column is
// younger than this — mirrors flowStorePersistence.ts's PRUNE_MAX_AGE_MS;
// older than this and the history is stale enough that a blank/fresh start
// is more honest than a huge visible gap.
const RESTORE_MAX_AGE_MS = 48 * 60 * 60 * 1000;

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
  const { getBook, isLive, notionalMultiplier = 1, floorUsd = 0, persistKey } = opts;

  const [state, setState] = useState<LiveDepthColumnsState>({
    columns: [],
    binSize: 1,
    recordingSinceMs: null,
    restoredFromMs: null,
  });
  const ringRef = useRef<DecodedColumn[]>([]);
  const recordingSinceRef = useRef<number | null>(null);
  const restoredFromRef = useRef<number | null>(null);
  const lastSaveMsRef = useRef<number>(0);
  const persistKeyRef = useRef<string | undefined>(persistKey);
  // Gates sampling until this persistKey's restore attempt has settled
  // (hit, miss, or failure) — prevents the async loadDepthHistory()
  // resolution from clobbering a live sample that landed first. Starts
  // `true` when there's no persistKey to restore from (nothing to wait
  // for).
  const restoreReadyRef = useRef<boolean>(!persistKey);
  // Set once on a successful restore to the newest restored column — the
  // next live sample checks this to decide whether to splice in a
  // transparent gap column before it, then clears it (fires at most once
  // per restore).
  const pendingGapRef = useRef<DecodedColumn | null>(null);

  // Restore-on-mount / persistKey-change: flush the OLD key's ring (if
  // any), reset local state for the new key, then load + seed from
  // IndexedDB. Runs independently of `isLive` so a restored heatmap is
  // visible even before the bridge reconnects.
  useEffect(() => {
    const prevKey = persistKeyRef.current;
    const nextKey = persistKey;
    let cancelled = false;

    restoreReadyRef.current = !nextKey;

    if (prevKey !== nextKey) {
      if (prevKey && ringRef.current.length > 0) {
        void saveDepthHistory(prevKey, ringRef.current, { notionalMultiplier });
      }
      ringRef.current = [];
      recordingSinceRef.current = null;
      restoredFromRef.current = null;
      pendingGapRef.current = null;
      persistKeyRef.current = nextKey;
      setState({ columns: [], binSize: 1, recordingSinceMs: null, restoredFromMs: null });
    }

    if (!nextKey) return;

    void pruneDepthHistory();
    void loadDepthHistory(nextKey).then((loaded) => {
      if (cancelled) return;
      if (!loaded || loaded.columns.length === 0) {
        restoreReadyRef.current = true;
        return;
      }

      const newest = loaded.columns[loaded.columns.length - 1];
      if (Date.now() - newest.t >= RESTORE_MAX_AGE_MS) {
        // Stale — leave the ring empty, start fresh like a brand-new session.
        restoreReadyRef.current = true;
        return;
      }

      const oldest = loaded.columns[0];
      ringRef.current = loaded.columns.slice();
      recordingSinceRef.current = oldest.t;
      restoredFromRef.current = oldest.t;
      pendingGapRef.current = newest;

      setState({
        columns: ringRef.current.slice(),
        binSize: newest.binSize,
        recordingSinceMs: oldest.t,
        restoredFromMs: oldest.t,
      });
      restoreReadyRef.current = true;
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- notionalMultiplier is read only for the flush-on-switch save, not a restore trigger
  }, [persistKey]);

  useEffect(() => {
    if (!isLive) return;

    const sample = () => {
      if (!restoreReadyRef.current) return; // wait for this persistKey's restore to settle first

      const col = sampleBookToColumn(getBook(), { notionalMultiplier, floorUsd, nowMs: Date.now() });
      if (!col) return;

      if (recordingSinceRef.current === null) recordingSinceRef.current = col.t;

      if (pendingGapRef.current) {
        const afterColumn = pendingGapRef.current;
        pendingGapRef.current = null;
        if (needsGapColumn(afterColumn.t, col.t, SAMPLE_INTERVAL_MS)) {
          const gap = buildGapColumn(afterColumn, afterColumn.t + SAMPLE_INTERVAL_MS);
          appendColumnToRing(ringRef.current, gap, RING_CAP);
        }
      }

      const ring = appendColumnToRing(ringRef.current, col, RING_CAP);
      setState({
        columns: ring.slice(),
        binSize: col.binSize,
        recordingSinceMs: recordingSinceRef.current,
        restoredFromMs: restoredFromRef.current,
      });

      const key = persistKeyRef.current;
      if (key) {
        const now = Date.now();
        if (now - lastSaveMsRef.current >= PERSIST_SAVE_INTERVAL_MS) {
          lastSaveMsRef.current = now;
          void saveDepthHistory(key, ringRef.current, { notionalMultiplier });
        }
      }
    };

    sample();
    const id = setInterval(sample, SAMPLE_INTERVAL_MS);
    return () => {
      clearInterval(id);
      const key = persistKeyRef.current;
      if (key && ringRef.current.length > 0) {
        void saveDepthHistory(key, ringRef.current, { notionalMultiplier });
      }
    };
  }, [isLive, getBook, notionalMultiplier, floorUsd]);

  return state;
}
