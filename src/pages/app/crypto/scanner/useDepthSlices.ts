// src/pages/app/crypto/scanner/useDepthSlices.ts
//
// Data client for the depth-slice API.
//
// Responsibilities:
//   - Fetch historical slices for the visible window (and lazily backfill
//     as the user pans left) via GET /api/crypto/depth-slices
//   - Decode slices in a Web Worker (depthDecode.worker.ts)
//   - Append live-edge columns every 5s from the caller-supplied live book
//   - Re-bucket columns whose binSize differs from the dominant binSize
//     (merging by SUM of decoded USD, then re-quantizing)
//   - Return the final DecodedColumn[] array and the dominant binSize

import { useState, useEffect, useRef, useCallback } from 'react';
import type { RawSlice, DecodedColumn, BinRecord } from './depthTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SliceResolution = '5s' | '1m';

export interface DepthSliceState {
  columns: DecodedColumn[];
  binSize: number;        // dominant bin size across all loaded columns
  resolution: SliceResolution;
}

export interface DepthSlicesOptions {
  symbol: string;
  /** Visible window start (unix ms) — determines fetch range */
  fromMs: number;
  /** Visible window end (unix ms) */
  toMs: number;
  /** Current chart bar spacing in px — determines resolution tier */
  barSpacingPx: number;
  /** Current chart candle interval in ms */
  candleIntervalMs: number;
  /** Stable accessor to the current live order book */
  getBook: () => { bids: Map<number, number>; asks: Map<number, number> };
  /** Floor filter: bins with decoded USD < floorUsd are treated as q=0 */
  floorUsd?: number;
  /** True when the connection is live (enables 5s live-edge appends) */
  isLive?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Round a price DOWN to the nearest bin boundary. */
function binFloor(price: number, binSize: number): number {
  return Math.floor(price / binSize) * binSize;
}

/**
 * Compute a clean bin size ≈ mid * 0.0002, rounded to 1/2/5 × 10^n.
 * Intentionally finer than the wall-layer's 0.0005 to capture the texture.
 */
export function computeDepthBinSize(mid: number): number {
  const raw = mid * 0.0002;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const ratio = raw / mag;
  if (ratio < 1.5) return mag;
  if (ratio < 3.5) return 2 * mag;
  if (ratio < 7.5) return 5 * mag;
  return 10 * mag;
}

/** Decode log-space q → USD notional */
export function qToUsd(q: number): number {
  return Math.expm1(q / 1000);
}

/** Encode USD notional → log-space q (uint16) */
function usdToQ(usd: number): number {
  return Math.round(Math.log1p(usd) * 1000);
}

/**
 * Re-bucket a DecodedColumn whose binSize differs from the target dominant binSize.
 * Merges bins by SUM of decoded USD, then re-quantizes back to q.
 */
function rebucketColumn(col: DecodedColumn, targetBinSize: number, floorUsd: number): DecodedColumn {
  if (col.binSize === targetBinSize) return col;

  function rebucketSide(records: BinRecord[]): BinRecord[] {
    const acc = new Map<number, number>(); // binFloor(price, targetBinSize) → total USD
    for (const r of records) {
      const usd = qToUsd(r.q);
      if (usd < floorUsd) continue;
      const bucket = binFloor(r.price, targetBinSize);
      acc.set(bucket, (acc.get(bucket) ?? 0) + usd);
    }
    const out: BinRecord[] = [];
    for (const [price, totalUsd] of acc) {
      const q = usdToQ(totalUsd);
      if (q > 0) out.push({ price, q });
    }
    return out;
  }

  return {
    ...col,
    binSize: targetBinSize,
    bids: rebucketSide(col.bids),
    asks: rebucketSide(col.asks),
  };
}

/** Choose resolution tier based on how wide each slice column would be in px. */
function chooseResolution(barSpacingPx: number, candleIntervalMs: number): SliceResolution {
  const sliceMs5s = 5_000;
  const sliceMs1m = 60_000;
  // Preferred is 5s; fall back to 1m if 5s columns would be sub-pixel.
  const width5s = barSpacingPx * (sliceMs5s / candleIntervalMs);
  return width5s >= 1 ? '5s' : '1m';
}

/** API max spans */
const MAX_SPAN_5S = 2 * 60 * 60 * 1000;    // 2h in ms
const MAX_SPAN_1M = 48 * 60 * 60 * 1000;   // 48h in ms

function maxSpan(res: SliceResolution): number {
  return res === '5s' ? MAX_SPAN_5S : MAX_SPAN_1M;
}

/** Grid step (ms) for a resolution tier — the uniform spacing between columns. */
function stepMsFor(res: SliceResolution): number {
  return res === '5s' ? 5_000 : 60_000;
}

// ── Dominant bin size ─────────────────────────────────────────────────────────

function dominantBinSize(columns: DecodedColumn[]): number {
  if (columns.length === 0) return 1;
  const counts = new Map<number, number>();
  for (const col of columns) {
    counts.set(col.binSize, (counts.get(col.binSize) ?? 0) + 1);
  }
  let best = 1;
  let bestCount = 0;
  for (const [size, count] of counts) {
    if (count > bestCount) { best = size; bestCount = count; }
  }
  return best;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

const LIVE_EDGE_INTERVAL_MS = 5_000;
const WORKER_TIMEOUT_MS = 10_000;

export function useDepthSlices(opts: DepthSlicesOptions): DepthSliceState {
  const {
    symbol,
    fromMs,
    toMs,
    barSpacingPx,
    candleIntervalMs,
    getBook,
    floorUsd = 1_000,
    isLive = false,
  } = opts;

  // All decoded columns (historical + live edge), sorted by t ascending.
  const [state, setState] = useState<DepthSliceState>({
    columns: [],
    binSize: 1,
    resolution: '5s',
  });

  // Worker instance — created once per hook mount.
  const workerRef = useRef<Worker | null>(null);
  // Pending decode requests: id → resolve callback.
  const pendingRef = useRef<Map<number, (cols: DecodedColumn[]) => void>>(new Map());
  const nextIdRef = useRef<number>(0);

  // Historical columns keyed by t (ms) — de-duplicated across paginated fetches.
  const historicalRef = useRef<Map<number, DecodedColumn>>(new Map());
  // Live-edge columns keyed by their slot time (rounded to 5s boundary).
  const liveEdgeRef = useRef<Map<number, DecodedColumn>>(new Map());
  // Track which [from, to, res] windows have already been fetched.
  const fetchedWindowsRef = useRef<Array<{ from: number; to: number; res: SliceResolution }>>([]);

  const resolutionRef = useRef<SliceResolution>('5s');

  // ── Worker lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const w = new Worker(
      new URL('./depthDecode.worker.ts', import.meta.url),
      { type: 'module' },
    );

    w.onmessage = (evt: MessageEvent) => {
      const msg = evt.data as { type: string; columns: DecodedColumn[]; id: number };
      if (msg.type !== 'decoded') return;
      const resolve = pendingRef.current.get(msg.id);
      if (resolve) {
        pendingRef.current.delete(msg.id);
        resolve(msg.columns);
      }
    };

    workerRef.current = w;

    return () => {
      w.terminate();
      workerRef.current = null;
      pendingRef.current.clear();
    };
  }, []);

  // ── Decode via worker ─────────────────────────────────────────────────────
  const decodeSlices = useCallback((slices: RawSlice[]): Promise<DecodedColumn[]> => {
    return new Promise((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) { reject(new Error('Worker not ready')); return; }

      const id = nextIdRef.current++;
      pendingRef.current.set(id, resolve);

      // Timeout guard
      const timer = setTimeout(() => {
        if (pendingRef.current.has(id)) {
          pendingRef.current.delete(id);
          reject(new Error('Worker decode timeout'));
        }
      }, WORKER_TIMEOUT_MS);

      const origResolve = pendingRef.current.get(id)!;
      pendingRef.current.set(id, (cols) => {
        clearTimeout(timer);
        origResolve(cols);
      });

      worker.postMessage({ type: 'decode', slices, id });
    });
  }, []);

  // ── Rebuild state from refs ───────────────────────────────────────────────
  // Emits columns on a CONTIGUOUS uniform time grid at the active resolution
  // step. The renderer (DepthMatrixLayer) stretches a single 1px-per-column
  // bitmap linearly across [firstT, lastT], which is only correct when columns
  // are uniformly spaced. Historical (5s or 60s) + always-5s live samples +
  // dropped samples are NOT uniform, so we snap every real column onto its grid
  // slot and fill missing slots with transparent gap columns (flags bit0). This
  // is what keeps each liquidity streak aligned to the candle at its real time —
  // without it, walls drifted in time and appeared to "remain" after price had
  // already traded through them.
  const rebuildState = useCallback((res: SliceResolution) => {
    const stepMs = stepMsFor(res);

    // Snap every real column onto its resolution grid slot. Live-edge columns
    // are sampled every 5s regardless of resolution, so at 1m they collapse
    // into 60s slots — the most recent observation for a slot wins.
    const bySlot = new Map<number, DecodedColumn>();
    const placeOnGrid = (col: DecodedColumn) => {
      const slot = Math.floor(col.t / stepMs) * stepMs;
      const prev = bySlot.get(slot);
      if (!prev || col.t >= prev.t) bySlot.set(slot, { ...col, t: slot });
    };
    for (const col of historicalRef.current.values()) placeOnGrid(col);
    for (const col of liveEdgeRef.current.values())   placeOnGrid(col);

    if (bySlot.size === 0) {
      setState({ columns: [], binSize: 1, resolution: res });
      return;
    }

    const realCols = Array.from(bySlot.values());
    const domSize = dominantBinSize(realCols);

    let minSlot = Infinity;
    let maxSlot = -Infinity;
    for (const slot of bySlot.keys()) {
      if (slot < minSlot) minSlot = slot;
      if (slot > maxSlot) maxSlot = slot;
    }

    // Safety cap so a stale far-past slot can't allocate an unbounded grid.
    const MAX_GRID_COLS = 8_640; // 12h @ 5s — well above any real view window
    const rawCount = Math.floor((maxSlot - minSlot) / stepMs) + 1;
    const gridStart = rawCount > MAX_GRID_COLS
      ? maxSlot - (MAX_GRID_COLS - 1) * stepMs
      : minSlot;

    const columns: DecodedColumn[] = [];
    for (let t = gridStart; t <= maxSlot; t += stepMs) {
      const real = bySlot.get(t);
      if (real) {
        columns.push(rebucketColumn(real, domSize, floorUsd));
      } else {
        // Transparent gap column — DepthMatrixLayer skips it (flags & 1).
        columns.push({ t, anchor: 0, binSize: domSize, flags: 1, bids: [], asks: [] });
      }
    }

    setState({ columns, binSize: domSize, resolution: res });
  }, [floorUsd]);

  // ── Fetch historical window ───────────────────────────────────────────────
  const fetchWindow = useCallback(async (
    sym: string,
    winFrom: number,
    winTo: number,
    res: SliceResolution,
  ) => {
    // Skip if already fetched
    const already = fetchedWindowsRef.current.some(
      w => w.from <= winFrom && w.to >= winTo && w.res === res,
    );
    if (already) return;

    // Chunk into API-allowed spans
    const span = maxSpan(res);
    let cursor = winFrom;
    while (cursor < winTo) {
      const chunkTo = Math.min(cursor + span, winTo);
      const url = `/api/crypto/depth-slices?symbol=${sym}&from=${cursor}&to=${chunkTo}&res=${res}`;
      try {
        const resp = await fetch(url);
        if (!resp.ok) break;
        const data = await resp.json() as { symbol: string; res: string; slices: RawSlice[] };
        if (data.slices && data.slices.length > 0) {
          const decoded = await decodeSlices(data.slices);
          for (const col of decoded) {
            historicalRef.current.set(col.t, col);
          }
          rebuildState(res);
        }
      } catch {
        // Network errors: stop silently — heatmap degrades gracefully
        break;
      }
      cursor = chunkTo;
    }

    // Mark as fetched regardless of partial failure
    fetchedWindowsRef.current.push({ from: winFrom, to: winTo, res });
  }, [decodeSlices, rebuildState]);

  // ── Fetch on window or resolution change ─────────────────────────────────
  useEffect(() => {
    if (!symbol || fromMs >= toMs) return;

    const res = chooseResolution(barSpacingPx, candleIntervalMs);
    resolutionRef.current = res;

    // Reset on symbol or resolution change
    const prevRes = state.resolution;
    if (res !== prevRes) {
      historicalRef.current.clear();
      liveEdgeRef.current.clear();
      fetchedWindowsRef.current = [];
    }

    fetchWindow(symbol, fromMs, toMs, res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, fromMs, toMs, barSpacingPx, candleIntervalMs, fetchWindow]);

  // ── Live edge: sample book every 5s ──────────────────────────────────────
  useEffect(() => {
    if (!isLive) return;

    const sampleLiveEdge = () => {
      const { bids, asks } = getBook();
      if (bids.size === 0 && asks.size === 0) return;

      // Determine mid price
      let bestBid = 0;
      let bestAsk = Infinity;
      for (const p of bids.keys()) if (p > bestBid) bestBid = p;
      for (const p of asks.keys()) if (p < bestAsk) bestAsk = p;
      if (bestBid === 0 && bestAsk === Infinity) return;

      const mid = bestBid === 0 ? bestAsk
        : bestAsk === Infinity ? bestBid
        : (bestBid + bestAsk) / 2;

      const binSize = computeDepthBinSize(mid);
      const anchor = mid;

      // Bin bids
      const bidBins = new Map<number, number>();
      for (const [price, qty] of bids) {
        if (price <= 0 || qty <= 0) continue;
        const usd = price * qty;
        if (usd < floorUsd) continue;
        const bucket = binFloor(price, binSize);
        bidBins.set(bucket, (bidBins.get(bucket) ?? 0) + usd);
      }

      // Bin asks
      const askBins = new Map<number, number>();
      for (const [price, qty] of asks) {
        if (price <= 0 || qty <= 0) continue;
        const usd = price * qty;
        if (usd < floorUsd) continue;
        const bucket = binFloor(price, binSize);
        askBins.set(bucket, (askBins.get(bucket) ?? 0) + usd);
      }

      const nowMs = Date.now();
      // Round down to 5s boundary
      const slotMs = Math.floor(nowMs / 5_000) * 5_000;

      const bidRecords: BinRecord[] = [];
      for (const [price, usd] of bidBins) {
        const q = usdToQ(usd);
        if (q > 0) bidRecords.push({ price, q });
      }

      const askRecords: BinRecord[] = [];
      for (const [price, usd] of askBins) {
        const q = usdToQ(usd);
        if (q > 0) askRecords.push({ price, q });
      }

      const col: DecodedColumn = {
        t: slotMs,
        anchor,
        binSize,
        flags: 0,
        bids: bidRecords,
        asks: askRecords,
      };

      liveEdgeRef.current.set(slotMs, col);

      // Keep live edge from growing unboundedly: retain last 720 slots (1h at 5s)
      if (liveEdgeRef.current.size > 720) {
        const keys = Array.from(liveEdgeRef.current.keys()).sort((a, b) => a - b);
        for (let i = 0; i < keys.length - 720; i++) {
          liveEdgeRef.current.delete(keys[i]);
        }
      }

      rebuildState(resolutionRef.current);
    };

    sampleLiveEdge();
    const id = setInterval(sampleLiveEdge, LIVE_EDGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isLive, getBook, floorUsd, rebuildState]);

  return state;
}
