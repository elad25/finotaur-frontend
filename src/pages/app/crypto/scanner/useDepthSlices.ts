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
//   - (phase 2, "pulled-liquidity memory") Persist the merged column set to
//     IndexedDB (depthHistoryStore.ts, shared with the NT8
//     useLiveDepthColumns.ts hook) under `binance|<symbol>`, and restore it
//     on mount so the heatmap survives symbol switches, tab switches, and
//     reloads even though `crypto_depth_slices` is UNLOGGED server-side
//     (wiped on every DB restart). See rebuildState's comment below for why
//     the merge is a dedupe-by-t "fill the gaps" join (mergeRestoredColumns
//     in depthHistoryStore.ts) rather than the NT8 ring's splice-a-gap
//     approach — this hook already re-derives its visible columns from two
//     source maps onto a uniform grid every render, so a third source
//     (restoredRef) feeding that same pipeline is the smallest fit.

import { useState, useEffect, useRef, useCallback } from 'react';
import type { RawSlice, DecodedColumn, BinRecord } from './depthTypes';
import {
  capColumnsForSave,
  loadDepthHistory,
  mergeRestoredColumns,
  pruneDepthHistory,
  saveDepthHistory,
} from '@/pages/app/trading-arena/hooks/depthHistoryStore';
import { dustCutoffUsd, qToUsd } from '@/components/charting/depthSignificance';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SliceResolution = '5s' | '1m';

export interface DepthSliceState {
  columns: DecodedColumn[];
  binSize: number;        // dominant bin size across all loaded columns
  resolution: SliceResolution;
  /** Epoch ms of the oldest column restored from IndexedDB this mount, or null when nothing was restored (fresh session / no prior save / stale >48h snapshot). Mirrors useLiveDepthColumns.ts's field of the same name. */
  restoredFromMs: number | null;
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
  /**
   * Optional caller-supplied absolute floor (USD) — combined with (i.e. takes
   * whichever is stricter than) the technical dust cutoff that is ALWAYS
   * applied regardless of this value (see dustCutoffUsd in
   * depthSignificance.ts). Default 0: with no caller floor, bins are dropped
   * ONLY when they're below the dust cutoff — i.e. (almost) the whole book is
   * kept. MarketScanner.tsx still passes its own absolute floor pill value
   * here for its own (out-of-scope) coarser filtering needs; LiquidityTab.tsx
   * no longer passes this at all (Phase 1 — manual thresholds removed).
   */
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

/**
 * Decode log-space q → USD notional. Canonical implementation moved to
 * depthSignificance.ts (2026-07-20) so the worker-safe raster core can use
 * it without importing this react-hook module; re-exported here so every
 * existing importer keeps working unchanged. Stays the exact inverse of
 * `usdToQ` below.
 */
export { qToUsd } from '@/components/charting/depthSignificance';

/** Encode USD notional → log-space q (uint16) */
function usdToQ(usd: number): number {
  return Math.round(Math.log1p(usd) * 1000);
}

// Safety cap on bins retained per side of a single column, applied AFTER
// dust removal. A hyperactive/fragmented book can still leave thousands of
// small-but-not-dust bins post-aggregation; capping to the top N by notional
// bounds per-column payload/render cost without reintroducing a manual
// visibility threshold (this is a computational bound, not a display filter
// — see depthSignificance.ts's header comment for the same distinction).
const MAX_BINS_PER_SIDE = 500;

/**
 * Drops bins below the combined [dust cutoff, caller floor] threshold and
 * caps the result to MAX_BINS_PER_SIDE by notional (top-N). `floor` is the
 * caller-supplied floorUsd (default 0 — see useDepthSlices' own floorUsd
 * option doc): when 0, the effective cutoff is pure dust removal; a caller
 * that still wants a coarser absolute floor (MarketScanner.tsx's own
 * floor pills) keeps that behavior by taking whichever cutoff is higher.
 */
function applySignificanceCutoff(acc: Map<number, number>, floor: number): Array<[number, number]> {
  const dustCutoff = dustCutoffUsd(Array.from(acc.values()));
  const cutoff = Math.max(dustCutoff, floor);

  let entries: Array<[number, number]> = [];
  for (const entry of acc) {
    if (entry[1] >= cutoff) entries.push(entry);
  }

  if (entries.length > MAX_BINS_PER_SIDE) {
    entries.sort((a, b) => b[1] - a[1]);
    entries = entries.slice(0, MAX_BINS_PER_SIDE);
  }

  return entries;
}

/**
 * Re-bucket a DecodedColumn whose binSize differs from the target dominant binSize.
 * Merges bins by SUM of decoded USD, then re-quantizes back to q.
 *
 * Bins are aggregated FIRST (all records, unconditionally), then the
 * technical dust cutoff (dustCutoffUsd — 0.02% of this side's total
 * notional, clamped to [$10, $2000]) is computed from the AGGREGATED bin
 * totals and applied — see depthSignificance.ts. This replaces the old fixed
 * $floorUsd bin-drop: the data now carries (almost) everything, and only
 * literal computational noise is excluded before it ever reaches the
 * renderer's continuous significance mapping (DepthMatrixLayer.tsx).
 */
function rebucketColumn(col: DecodedColumn, targetBinSize: number, floorUsd: number): DecodedColumn {
  if (col.binSize === targetBinSize) return col;

  function rebucketSide(records: BinRecord[]): BinRecord[] {
    const acc = new Map<number, number>(); // binFloor(price, targetBinSize) → total USD
    for (const r of records) {
      const usd = qToUsd(r.q);
      const bucket = binFloor(r.price, targetBinSize);
      acc.set(bucket, (acc.get(bucket) ?? 0) + usd);
    }

    const entries = applySignificanceCutoff(acc, floorUsd);

    const out: BinRecord[] = [];
    for (const [price, totalUsd] of entries) {
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

// Per-request chunk spans, sized so each response stays under Supabase
// PostgREST's global 1000-row cap (the server's PAGE_SIZE=3000 is not
// honored while that cap exists). 960 rows/chunk leaves a 40-row margin.
const CHUNK_SPAN_5S = 80 * 60 * 1000;      // 80 min @ 5s = 960 rows
const CHUNK_SPAN_1M = 16 * 60 * 60 * 1000; // 16 h  @ 1m = 960 rows
function chunkSpan(res: SliceResolution): number {
  return res === '5s' ? CHUNK_SPAN_5S : CHUNK_SPAN_1M;
}

/** Grid step (ms) for a resolution tier — the uniform spacing between columns. */
function stepMsFor(res: SliceResolution): number {
  return res === '5s' ? 5_000 : 60_000;
}

// ── Fetched-window coverage tracking ─────────────────────────────────────────
//
// A range that has already been requested for a given resolution, with the
// timestamp it was recorded. Used to avoid re-requesting data we already
// have. See computeUncoveredGaps below for why this needs to be gap-based
// rather than a single "does one prior window fully contain the new one?"
// check: callers like LiquidityTab/MarketScanner pass a [from, to] window
// that SLIDES forward every ~30s (from = now - lookback, to = now). A naive
// containment check is never true for a sliding window (winTo always grows
// past any prior recorded winTo), so every single tick re-triggered a full
// multi-chunk refetch + worker decode + full-grid rebuild of the ENTIRE
// window — a busy-loop-shaped repeating expensive cycle. Gap-based tracking
// only fetches the new sliver each tick.
interface FetchedRange {
  from: number;
  to: number;
  res: SliceResolution;
  fetchedAt: number;
}

/**
 * How long a recorded "covered" range stays trusted before it's eligible to
 * be re-verified against the server. Bounds retry frequency for a window
 * that failed/timed out (so a wedged server can't cause a hot refetch loop
 * every ~30s) while still recovering eventually if data becomes available.
 */
const REFETCH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/** Client-side timeout for a single chunk fetch — prevents a hung/slow
 * server request from staying in-flight indefinitely and stacking up
 * across repeated fetchWindow calls. Must cover downloading a ~8-9MB
 * chunk body (a near-960-row response) — the abort timer stays armed
 * through resp.json(), not just until headers arrive. */
const FETCH_TIMEOUT_MS = 30_000;

/**
 * Returns the sub-ranges of [winFrom, winTo] NOT covered by `covered`
 * (already-trusted ranges for the active resolution). Ranges are clipped to
 * the requested window and merged by a simple left-to-right scan.
 */
function computeUncoveredGaps(
  winFrom: number,
  winTo: number,
  covered: Array<{ from: number; to: number }>,
): Array<{ from: number; to: number }> {
  if (covered.length === 0) return [{ from: winFrom, to: winTo }];

  const clipped = covered
    .map(w => ({ from: Math.max(w.from, winFrom), to: Math.min(w.to, winTo) }))
    .filter(w => w.to > w.from)
    .sort((a, b) => a.from - b.from);

  const gaps: Array<{ from: number; to: number }> = [];
  let cursor = winFrom;
  for (const seg of clipped) {
    if (seg.from > cursor) gaps.push({ from: cursor, to: seg.from });
    if (seg.to > cursor) cursor = seg.to;
  }
  if (cursor < winTo) gaps.push({ from: cursor, to: winTo });
  return gaps;
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

// Phase 2 persistence tuning — duplicated (not imported) from
// useLiveDepthColumns.ts's PERSIST_SAVE_INTERVAL_MS / RESTORE_MAX_AGE_MS,
// same convention that file's header comment documents for
// depthHistoryStore.ts's own PRUNE_MAX_AGE_MS: independent copies rather
// than a shared constant, since each hook owns its own persistence
// lifecycle.
const PERSIST_SAVE_INTERVAL_MS = 30_000;
const RESTORE_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function useDepthSlices(opts: DepthSlicesOptions): DepthSliceState {
  const {
    symbol,
    fromMs,
    toMs,
    barSpacingPx,
    candleIntervalMs,
    getBook,
    floorUsd = 0,
    isLive = false,
  } = opts;

  // Stable per-symbol persistence key — LiquidityTab.tsx keys its crypto
  // body component by symbol (full remount on switch), so this only needs
  // to be recomputed when `symbol` itself changes under a live instance.
  const persistKey = symbol ? `binance|${symbol}` : undefined;

  // All decoded columns (historical + live edge + restored), sorted by t ascending.
  const [state, setState] = useState<DepthSliceState>({
    columns: [],
    binSize: 1,
    resolution: '5s',
    restoredFromMs: null,
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
  // Track which [from, to, res] windows have already been fetched — see
  // FetchedRange / computeUncoveredGaps above for why this is gap-based.
  const fetchedWindowsRef = useRef<FetchedRange[]>([]);

  const resolutionRef = useRef<SliceResolution>('5s');

  // Phase 2 persistence (depthHistoryStore.ts) — columns restored from
  // IndexedDB on mount. Deliberately NOT merged into historicalRef: this
  // hook's own coverage tracking (fetchedWindowsRef) must stay driven only
  // by real server responses, so a restore never fools fetchWindow into
  // skipping a gap the server hasn't actually confirmed. Read by
  // rebuildState via mergeRestoredColumns (server/live wins on any exact-t
  // collision).
  const restoredRef = useRef<DecodedColumn[]>([]);
  const restoredFromMsRef = useRef<number | null>(null);
  // Mirrors the latest columns rebuildState computed — read by the
  // unmount/persistKey-change flush effect, which can't rely on `state`
  // (stale closure risk) or firing an extra render just to save.
  const columnsRef = useRef<DecodedColumn[]>([]);
  const lastSaveMsRef = useRef<number>(0);

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

    // Fold in the phase-2 IndexedDB restore (if any) before gridding.
    // mergeRestoredColumns dedupes by exact column `t`, and authoritative
    // (server backfill + live edge) always wins a collision — see its
    // header comment in depthHistoryStore.ts. Any grid slot the merge still
    // leaves uncovered gets a transparent flags-bit0 gap column from the
    // loop below anyway (same mechanism that already paints gaps between
    // historical chunks), so no separate needsGapColumn/buildGapColumn
    // splice is needed on top for this hook's shape — unlike the NT8 ring
    // (a single ordered array with one splice point), this hook already
    // re-derives the grid from scratch every call.
    const authoritative: DecodedColumn[] = [
      ...historicalRef.current.values(),
      ...liveEdgeRef.current.values(),
    ];
    const merged = restoredRef.current.length > 0
      ? mergeRestoredColumns(restoredRef.current, authoritative)
      : authoritative;

    // Snap every real column onto its resolution grid slot. Live-edge columns
    // are sampled every 5s regardless of resolution, so at 1m they collapse
    // into 60s slots — the most recent observation for a slot wins.
    const bySlot = new Map<number, DecodedColumn>();
    const placeOnGrid = (col: DecodedColumn) => {
      const slot = Math.floor(col.t / stepMs) * stepMs;
      const prev = bySlot.get(slot);
      if (!prev || col.t >= prev.t) bySlot.set(slot, { ...col, t: slot });
    };
    for (const col of merged) placeOnGrid(col);

    if (bySlot.size === 0) {
      columnsRef.current = [];
      setState({ columns: [], binSize: 1, resolution: res, restoredFromMs: restoredFromMsRef.current });
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

    columnsRef.current = columns;
    setState({ columns, binSize: domSize, resolution: res, restoredFromMs: restoredFromMsRef.current });

    // Throttled persistence (phase 2) — save the MERGED (server + live +
    // restored) column set, capped defensively via capColumnsForSave, at
    // most once per PERSIST_SAVE_INTERVAL_MS. rebuildState is the single
    // choke point every columns-changing path (backfill decode, live-edge
    // tick) already funnels through, so gating the save here — rather than
    // duplicating the throttle check at each call site — covers "every
    // columns update" with the smallest change. A final unconditional save
    // also runs on unmount/persistKey change (see the flush effect below).
    if (persistKey) {
      const now = Date.now();
      if (now - lastSaveMsRef.current >= PERSIST_SAVE_INTERVAL_MS) {
        lastSaveMsRef.current = now;
        void saveDepthHistory(persistKey, capColumnsForSave(columns));
      }
    }
  }, [floorUsd, persistKey]);

  // ── Phase 2: restore-on-mount from IndexedDB ──────────────────────────────
  // Runs independently of isLive/backfill so a restored heatmap paints
  // immediately, before the worker/fetch effects below produce anything —
  // matches useLiveDepthColumns.ts's restore-on-mount behavior for NT8.
  useEffect(() => {
    if (!persistKey) return;
    let cancelled = false;

    void pruneDepthHistory();
    void loadDepthHistory(persistKey).then((loaded) => {
      if (cancelled) return;
      if (!loaded || loaded.columns.length === 0) return;

      const newest = loaded.columns[loaded.columns.length - 1];
      if (Date.now() - newest.t >= RESTORE_MAX_AGE_MS) return; // stale — start fresh like a brand-new session

      const oldest = loaded.columns[0];
      restoredRef.current = loaded.columns;
      restoredFromMsRef.current = oldest.t;
      rebuildState(resolutionRef.current); // instant paint before any server response
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot restore per persistKey; the consuming component remounts on symbol change (LiquidityTab.tsx keys it by symbol), so this doesn't need to react to rebuildState identity churn
  }, [persistKey]);

  // Final flush on unmount / persistKey change — mirrors
  // useLiveDepthColumns.ts's cleanup save. Reads columnsRef (not `state`)
  // to avoid a stale-closure risk.
  useEffect(() => {
    return () => {
      if (persistKey && columnsRef.current.length > 0) {
        void saveDepthHistory(persistKey, capColumnsForSave(columnsRef.current));
      }
    };
  }, [persistKey]);

  // ── Fetch historical window ───────────────────────────────────────────────
  const fetchWindow = useCallback(async (
    sym: string,
    winFrom: number,
    winTo: number,
    res: SliceResolution,
  ) => {
    const now = Date.now();

    // Depth tables are UNLOGGED; nothing older ever exists server-side —
    // clamp the requested range so wide scanner windows never fetch data
    // that can't possibly be there.
    const MAX_HISTORY_MS = 48 * 60 * 60 * 1000;
    const effFrom = Math.max(winFrom, now - MAX_HISTORY_MS);

    // Only trust coverage recorded within the cooldown window — see
    // REFETCH_COOLDOWN_MS comment. Stale entries are treated as gaps again
    // so a failed/empty window gets re-verified eventually instead of
    // caching a permanent hole, without hot-looping every ~30s.
    const trusted = fetchedWindowsRef.current.filter(
      w => w.res === res && (now - w.fetchedAt) < REFETCH_COOLDOWN_MS,
    );
    const gaps = effFrom < winTo ? computeUncoveredGaps(effFrom, winTo, trusted) : [];
    if (effFrom < winTo && gaps.length === 0) return;

    if (gaps.length > 0) {
      const span = chunkSpan(res);
      // Newest-first: the visible window hugs 'to', so the most recent chunk paints immediately; older chunks backfill.
      for (const gap of [...gaps].reverse()) {
        let cursor = gap.to;
        while (cursor > gap.from) {
          const chunkFrom = Math.max(cursor - span, gap.from);
          const url = `/api/crypto/depth-slices?symbol=${sym}&from=${chunkFrom}&to=${cursor}&res=${res}`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
          try {
            const resp = await fetch(url, { signal: controller.signal });
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
            // Network errors / timeouts: stop this gap silently — heatmap
            // degrades gracefully. Still recorded as covered below (with a
            // cooldown) so a hung/erroring server can't cause a hot refetch
            // loop every ~30s.
            break;
          } finally {
            clearTimeout(timeoutId);
          }
          cursor = chunkFrom;
        }
      }
    }

    // Replace prior coverage for this resolution with the full requested
    // window (from=winFrom, not effFrom) — every part of it was either
    // already trusted, just attempted above, or out of possible range.
    // Bounded to one entry per resolution so this can never grow
    // unboundedly across ticks.
    fetchedWindowsRef.current = fetchedWindowsRef.current.filter(w => w.res !== res);
    fetchedWindowsRef.current.push({ from: winFrom, to: winTo, res, fetchedAt: now });
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
        const bucket = binFloor(price, binSize);
        bidBins.set(bucket, (bidBins.get(bucket) ?? 0) + usd);
      }

      // Bin asks
      const askBins = new Map<number, number>();
      for (const [price, qty] of asks) {
        if (price <= 0 || qty <= 0) continue;
        const usd = price * qty;
        const bucket = binFloor(price, binSize);
        askBins.set(bucket, (askBins.get(bucket) ?? 0) + usd);
      }

      const nowMs = Date.now();
      // Round down to 5s boundary
      const slotMs = Math.floor(nowMs / 5_000) * 5_000;

      // Dust cutoff + caller floor + top-N safety cap AFTER bin aggregation —
      // matches rebucketColumn's applySignificanceCutoff semantics exactly,
      // so a live-edge column and a rebucketed historical column apply the
      // same significance rule.
      const bidEntries = applySignificanceCutoff(bidBins, floorUsd);
      const bidRecords: BinRecord[] = [];
      for (const [price, usd] of bidEntries) {
        const q = usdToQ(usd);
        if (q > 0) bidRecords.push({ price, q });
      }

      const askEntries = applySignificanceCutoff(askBins, floorUsd);
      const askRecords: BinRecord[] = [];
      for (const [price, usd] of askEntries) {
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
