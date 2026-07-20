// src/components/charting/depthRaster.worker.ts
//
// Web Worker wrapper around depthRasterCore.computeFullRaster — moves the
// full-window depth-heatmap rebuild (bucketing + extent + paint +
// smoothing/bloom over up to MAX_GRID_CELLS cells) off the main thread so
// pan/zoom rebuilds never jank the UI. The pixel buffer is returned via the
// postMessage transfer list (zero-copy). Stale-result handling (jobId
// monotonicity) lives on the main-thread side (DepthMatrixLayer.tsx) — this
// worker just computes whatever it's handed, in message order.

import { computeFullRaster, type RasterJob, type RasterResult } from './depthRasterCore';

self.onmessage = (evt: MessageEvent) => {
  const job = evt.data as RasterJob;
  let result: RasterResult;
  try {
    result = computeFullRaster(job);
  } catch {
    // A malformed/pathological job must not kill the worker (an uncaught
    // throw here fires the main thread's `onerror`, which permanently
    // degrades every future rebuild to the sync path). Reply with an
    // empty result instead — the main thread keeps its previous bitmap
    // and, critically, releases the single-in-flight dispatch slot.
    result = {
      jobId: job?.jobId ?? -1,
      empty: true,
      pixels: null,
      priceMin: 0,
      priceMax: 0,
      numCols: 0,
      paintedNumRows: 0,
      rawNumRows: 0,
      rowMergeFactor: 1,
      bloomEnabled: false,
      curBinSize: job?.curBinSize ?? 0,
      rawIntervalMs: job?.rawIntervalMs ?? 0,
      bucketFactor: job?.bucketFactor ?? 1,
      cols: [],
      lastPaintedRawT: 0,
      lastBucketStartT: 0,
      lastBucketRawCols: [],
      persistMap: new Map(),
      persistBaseMap: new Map(),
    };
  }
  // `pixels` is an ArrayBuffer (or null when the job degenerated to
  // nothing paintable) — transfer it instead of cloning ~megabytes.
  (self as unknown as Worker).postMessage(result, result.pixels ? [result.pixels] : []);
};
