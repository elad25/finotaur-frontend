// src/components/charting/__tests__/depthRasterCore.test.ts
//
// Unit tests for computeFullRaster — the pure full-window rebuild that used
// to live inline in DepthMatrixLayer.tsx (see depthRasterCore.ts's header
// comment). Exercised here with small synthetic RasterJobs so the tests run
// fast and stay readable; no DOM/canvas/worker involved (the module itself
// has none).

import { describe, it, expect } from 'vitest';
import { computeFullRaster, MAX_GRID_ROWS, type RasterJob } from '../depthRasterCore';
import type { DecodedColumn } from '@/pages/app/crypto/scanner/depthTypes';

// ── Synthetic data builders ──────────────────────────────────────────────

/** Inverse of depthSignificance.ts's qToUsd — USD -> the wire's log-space q encoding. */
function usdToQ(usd: number): number {
  return Math.round(Math.log1p(usd) * 1000);
}

function makeColumn(
  t: number,
  anchor: number,
  binSize: number,
  bids: Array<[number, number]>, // [price, usd]
  asks: Array<[number, number]>,
  flags = 0,
): DecodedColumn {
  return {
    t,
    anchor,
    binSize,
    flags,
    bids: bids.map(([price, usd]) => ({ price, q: usdToQ(usd) })),
    asks: asks.map(([price, usd]) => ({ price, q: usdToQ(usd) })),
  };
}

/** One "basic" column: a handful of bid/ask bins around a 65,000 anchor, notionals $5K-$500K. */
function makeBasicColumn(i: number): DecodedColumn {
  const t = 1_000_000 + i * 5000;
  const anchor = 65_000;
  const binSize = 10;
  const bids: Array<[number, number]> = [
    [64_970, 5_000],
    [64_980, 150_000],
    [64_990, 350_000],
  ];
  const asks: Array<[number, number]> = [
    [65_010, 8_000],
    [65_020, 200_000],
    [65_030, 500_000],
  ];
  return makeColumn(t, anchor, binSize, bids, asks);
}

/** 10 columns, 5s apart, on the standard basic-column shape. */
function makeBasicWindowCols(n = 10): DecodedColumn[] {
  return Array.from({ length: n }, (_, i) => makeBasicColumn(i));
}

/** Default job: 10 basic columns, vLo=100K/vHi=400K, smoothing on, no LOD. */
function makeBasicJob(overrides: Partial<RasterJob> = {}): RasterJob {
  return {
    jobId: 1,
    warmupRawCols: [],
    windowRawCols: makeBasicWindowCols(),
    curBinSize: 10,
    vLo: 100_000,
    vHi: 400_000,
    sizePct: 0,
    paletteId: 'finotaur',
    smoothingEnabled: true,
    rawIntervalMs: 5000,
    bucketFactor: 1,
    paneHeightPxEstimate: 800,
    ...overrides,
  };
}

/** True if any element of the pixel buffer is a nonzero (painted) ABGR uint32. */
function hasNonzeroPixel(pixels: ArrayBuffer): boolean {
  const view = new Uint32Array(pixels);
  for (let i = 0; i < view.length; i++) {
    if (view[i] !== 0) return true;
  }
  return false;
}

describe('computeFullRaster', () => {
  it('paints a basic 10-column job: non-empty, correct buffer size, at least one lit pixel, echoes job params', () => {
    const job = makeBasicJob();
    const result = computeFullRaster(job);

    expect(result.empty).toBe(false);
    expect(result.pixels).not.toBeNull();
    expect(result.numCols).toBe(10);
    expect(result.pixels!.byteLength).toBe(result.numCols * result.paintedNumRows * 4);
    expect(hasNonzeroPixel(result.pixels!)).toBe(true);

    // Job params echoed back for the main-thread commit.
    expect(result.curBinSize).toBe(job.curBinSize);
    expect(result.rawIntervalMs).toBe(job.rawIntervalMs);
    expect(result.bucketFactor).toBe(job.bucketFactor);

    // lastPaintedRawT === the last window column's own t.
    const lastCol = job.windowRawCols[job.windowRawCols.length - 1];
    expect(result.lastPaintedRawT).toBe(lastCol.t);
  });

  it('returns an empty result (no pixels) for a job with no window columns', () => {
    const job = makeBasicJob({ windowRawCols: [] });
    const result = computeFullRaster(job);

    expect(result.empty).toBe(true);
    expect(result.pixels).toBeNull();
  });

  it('is deterministic: the same job (fresh deep-copied inputs) paints identical pixel buffers', () => {
    const jobA = makeBasicJob();
    const jobB = structuredClone(jobA); // fresh, structurally-identical, non-shared inputs

    const resultA = computeFullRaster(jobA);
    const resultB = computeFullRaster(jobB);

    expect(resultA.empty).toBe(false);
    expect(resultB.empty).toBe(false);
    const pixelsA = new Uint32Array(resultA.pixels!);
    const pixelsB = new Uint32Array(resultB.pixels!);
    expect(pixelsA.length).toBe(pixelsB.length);
    expect(Array.from(pixelsA)).toEqual(Array.from(pixelsB));
  });

  describe('bloomEnabled gating', () => {
    it('is true for a small job (well under BLOOM_MAX_CELLS) with smoothing enabled', () => {
      const job = makeBasicJob({ smoothingEnabled: true });
      const result = computeFullRaster(job);
      expect(result.empty).toBe(false);
      expect(result.bloomEnabled).toBe(true);
    });

    it('is false when smoothingEnabled is off, even for the same small job', () => {
      const job = makeBasicJob({ smoothingEnabled: false });
      const result = computeFullRaster(job);
      expect(result.empty).toBe(false);
      expect(result.bloomEnabled).toBe(false);
    });
  });

  it('buckets columns (bucketFactor=2): halves numCols, aligns bucket starts to the epoch grid', () => {
    // Raw column times start at t=1,000,000 (a multiple of the 10,000ms
    // bucket span at rawIntervalMs=5000 * bucketFactor=2), so buckets land
    // on clean epoch boundaries.
    const job = makeBasicJob({ bucketFactor: 2 });
    const result = computeFullRaster(job);

    expect(result.empty).toBe(false);
    expect(result.numCols).toBe(5); // 10 raw cols / bucketFactor 2
    for (const col of result.cols) {
      expect(col.t % 10_000).toBe(0); // bucket starts are epoch-aligned
    }
    expect(result.persistBaseMap).toBeInstanceOf(Map);
    expect(result.lastBucketRawCols.length).toBeGreaterThan(0);
  });

  it('unions a far, significant wall into the extent instead of tail-clipping it out (far-wall fix)', () => {
    // Dense small (sub-vLo) bins clustered near the anchor, plus one huge
    // ($5M > vLo) bid resting 30% below the anchor. binSize=50 keeps the
    // resulting raw row span (~400 rows) comfortably away from MAX_GRID_ROWS.
    const anchor = 65_000;
    const binSize = 50;
    const wallPrice = anchor * 0.7; // 45,500 — 30% below anchor
    const denseBids: Array<[number, number]> = Array.from({ length: 10 }, (_, i) => [
      64_500 + i * binSize,
      20_000, // below vLo — insignificant on its own
    ]);
    const bids: Array<[number, number]> = [...denseBids, [wallPrice, 5_000_000]];
    const col = makeColumn(1_000_000, anchor, binSize, bids, []);

    const job = makeBasicJob({ windowRawCols: [col], curBinSize: binSize, warmupRawCols: [] });
    const result = computeFullRaster(job);

    expect(result.empty).toBe(false);
    expect(result.priceMin).toBeLessThanOrEqual(wallPrice);
  });

  it('merges rows instead of clipping when the raw row span exceeds MAX_GRID_ROWS', () => {
    // binSize=1 with two significant (>= vLo) bins ~9,000 price units apart
    // forces rawNumRows ~9,001 — over MAX_GRID_ROWS (4000) but well under the
    // absolute backstop (MAX_GRID_ROWS * LOD_MAX_ROW_MERGE_FACTOR), so the
    // merge-first path (not the old clip-to-median path) must engage.
    const anchor = 65_000;
    const binSize = 1;
    const bids: Array<[number, number]> = [[60_000, 200_000]];
    const asks: Array<[number, number]> = [[69_000, 200_000]];
    const col = makeColumn(1_000_000, anchor, binSize, bids, asks);

    const job = makeBasicJob({ windowRawCols: [col], curBinSize: binSize, warmupRawCols: [] });
    const result = computeFullRaster(job);

    expect(result.empty).toBe(false);
    expect(result.rawNumRows).toBeGreaterThan(MAX_GRID_ROWS);
    expect(result.paintedNumRows).toBeLessThanOrEqual(MAX_GRID_ROWS);
    expect(result.rowMergeFactor).toBeGreaterThanOrEqual(2);
  });
});
