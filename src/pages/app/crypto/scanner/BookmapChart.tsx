// src/pages/app/crypto/scanner/BookmapChart.tsx
// Canvas-based Bookmap-style rolling liquidity heatmap.
// No charting libraries — pure Canvas2D, devicePixelRatio-aware.
//
// Architecture:
//   - Every 1 second: sample order book → push a "column" into a ring buffer.
//   - On every column push (requestAnimationFrame-gated): render the full canvas.
//   - Trades from aggTrade stream are overlaid as circles.
//   - Book/trade data arrive via refs (no re-render per WS message).
//
// Rendering model (Bookmap-style, reworked):
//   - Normalization: each cell is divided by the ~95th-percentile nonzero
//     notional across the visible window (recomputed once per new column over
//     a sampled subset), then capped at 1.  This keeps the reference honest
//     rather than being dragged up by a single whale wall.
//   - Compression: log1p(intensity * 9) / log1p(9) then gamma^2.5 so weak
//     liquidity collapses to near-black and only real walls glow.
//   - Palette: 128-stop table from near-black (#050505) → dark brown →
//     amber → brand gold #C9A646 → bright near-white gold for top ~5%.
//   - Price trace: continuous bright-white polyline of per-column mid price.
//   - Trade bubbles drawn last (topmost layer) with a thin contrasting stroke.

import { useEffect, useRef, useCallback } from 'react';
import type { OrderBookHandle, Trade } from './useBinanceOrderBook';

// ── Constants ────────────────────────────────────────────────────────────────

const CANVAS_HEIGHT = 520;
const COLUMN_RING_SIZE = 900;      // 900 × 1s = 15 min history
const SAMPLE_INTERVAL_MS = 1_000;  // snapshot book every 1s
const PRICE_RANGE_PCT = 0.020;     // ±2% around mid (widened to reveal walls)
const MAX_TRADE_RADIUS = 12;       // px cap for trade circles

// Gamma applied after log compression — higher = darker weak cells.
const HEAT_GAMMA = 2.5;

// How many nonzero cells to sample for the percentile reference (cheap subset).
const PERCENTILE_SAMPLE_LIMIT = 2_000;

// Heat palette: index 0 = near-black, index N-1 = near-white (through amber → gold)
// We map compressed intensity [0, 1] → palette index.
const HEAT_PALETTE: string[] = buildPalette();

function buildPalette(): string[] {
  // 128 steps.  Stops are heavily weighted toward dark so the low half is
  // barely visible — only the top ~15% of the palette glows visibly.
  const stops: [number, [number, number, number]][] = [
    [0.00, [5,  5,  5]],    // near-black #050505
    [0.20, [14,  8,  2]],   // very dark brown
    [0.40, [35, 18,  4]],   // dark amber-brown
    [0.55, [72, 38,  6]],   // deep amber
    [0.68, [130, 72, 10]],  // amber
    [0.80, [180, 120, 20]], // warm gold
    [0.90, [201, 166, 70]], // brand gold #C9A646
    [0.96, [230, 210, 140]],// light gold
    [1.00, [255, 252, 210]],// near-white gold
  ];

  const N = 128;
  const palette: string[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    // Find surrounding stops
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        lo = stops[s];
        hi = stops[s + 1];
        break;
      }
    }
    const span = hi[0] - lo[0];
    const f = span === 0 ? 0 : (t - lo[0]) / span;
    const r = Math.round(lo[1][0] + f * (hi[1][0] - lo[1][0]));
    const g = Math.round(lo[1][1] + f * (hi[1][1] - lo[1][1]));
    const b = Math.round(lo[1][2] + f * (hi[1][2] - lo[1][2]));
    palette.push(`rgb(${r},${g},${b})`);
  }
  return palette;
}

// ── Intensity compression ────────────────────────────────────────────────────

/**
 * Map a raw [0, 1] intensity to a display [0, 1] value using:
 *   1. log1p compression  (log1p(x*9)/log1p(9)) — spreads low values
 *   2. gamma curve        (^HEAT_GAMMA)          — pushes them back to dark
 * Net effect: the bottom ~60% of raw intensities map to display < 0.05
 * (barely visible), while the top ~10% are near 1 and fully bright.
 */
function compressIntensity(raw: number): number {
  const logScaled = Math.log1p(raw * 9) / Math.log1p(9); // [0,1]
  return Math.pow(logScaled, HEAT_GAMMA);                 // [0,1]
}

// ── Types ────────────────────────────────────────────────────────────────────

interface BookColumn {
  timestamp: number;  // Unix ms
  mid: number;
  /** binPrice (rounded) → total notional (USD) */
  levels: Map<number, number>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Round a price to the nearest nice tick based on a given bin size. */
function binFloor(price: number, binSize: number): number {
  return Math.floor(price / binSize) * binSize;
}

/** Compute a readable bin size ≈ mid * 0.0002, rounded to a clean increment. */
function computeBinSize(mid: number): number {
  const raw = mid * 0.0002;
  // Find the nearest power-of-10 then choose 1x, 2x, or 5x
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const ratio = raw / mag;
  if (ratio < 1.5) return mag;
  if (ratio < 3.5) return 2 * mag;
  if (ratio < 7.5) return 5 * mag;
  return 10 * mag;
}

/** Linear interpolation */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface BookmapChartProps {
  hook: OrderBookHandle;
  /** Symbol label shown in chart (e.g. "BTCUSDT") */
  symbol: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function BookmapChart({ hook, symbol }: BookmapChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Column ring buffer
  const columnsRef = useRef<BookColumn[]>([]);
  const colHeadRef = useRef<number>(0);   // write index (for ring)
  const colCountRef = useRef<number>(0);  // total columns ever pushed

  // Camera mid-price: smoothed toward latest column's mid each render frame.
  // Stored as a ref so it survives re-renders without triggering them.
  const cameraMidRef = useRef<number | null>(null);

  // Accumulated trades (for rendering circles; drained per-render)
  const pendingTradesRef = useRef<Trade[]>([]);

  // Rolling 95th-percentile reference for heat normalisation.
  // Recomputed once per new column (cheap sampled subset).
  const p95Ref = useRef<number>(1);

  // RAF handle
  const rafRef = useRef<number | null>(null);
  const sampleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // Track last symbol to reset on change
  const lastSymbolRef = useRef<string>(symbol);

  // ── Sample book into a column ─────────────────────────────────────────

  const sampleBook = useCallback(() => {
    const { bids, asks } = hook.getBook();
    if (bids.size === 0 && asks.size === 0) return;

    // Compute mid price from best bid/best ask
    let bestBid = 0;
    let bestAsk = Infinity;
    for (const p of bids.keys()) if (p > bestBid) bestBid = p;
    for (const p of asks.keys()) if (p < bestAsk) bestAsk = p;

    // Fallback if one side is empty
    if (bestBid === 0 && bestAsk === Infinity) return;
    const mid =
      bestBid === 0
        ? bestAsk
        : bestAsk === Infinity
        ? bestBid
        : (bestBid + bestAsk) / 2;

    const binSize = computeBinSize(mid);
    const halfRange = mid * PRICE_RANGE_PCT;
    const priceLow = mid - halfRange;
    const priceHigh = mid + halfRange;

    // Aggregate bids + asks into bins within visible range
    const levels = new Map<number, number>();

    function aggregateSide(side: Map<number, number>): void {
      for (const [price, qty] of side) {
        if (price < priceLow || price > priceHigh) continue;
        const bin = binFloor(price, binSize);
        levels.set(bin, (levels.get(bin) ?? 0) + qty * price); // store notional (USD)
      }
    }

    aggregateSide(bids);
    aggregateSide(asks);

    const col: BookColumn = { timestamp: Date.now(), mid, levels };

    // Push into ring buffer
    const ring = columnsRef.current;
    const idx = colHeadRef.current % COLUMN_RING_SIZE;
    if (ring.length < COLUMN_RING_SIZE) {
      ring.push(col);
    } else {
      ring[idx] = col;
    }
    colHeadRef.current += 1;
    colCountRef.current += 1;

    // Drain trades from hook and accumulate
    const fresh = hook.drainTrades();
    if (fresh.length > 0) {
      pendingTradesRef.current.push(...fresh);
    }

    // Recompute ~95th-percentile nonzero notional across visible window.
    // Sample up to PERCENTILE_SAMPLE_LIMIT values so this stays O(1) on big buffers.
    const samples: number[] = [];
    const ringNow = columnsRef.current;
    const step = Math.max(1, Math.floor(
      (ringNow.reduce((acc, c) => acc + c.levels.size, 0)) / PERCENTILE_SAMPLE_LIMIT,
    ));
    let seen = 0;
    outer: for (const c of ringNow) {
      for (const v of c.levels.values()) {
        if (v > 0) {
          seen++;
          if (seen % step === 0) samples.push(v);
          if (samples.length >= PERCENTILE_SAMPLE_LIMIT) break outer;
        }
      }
    }
    if (samples.length > 0) {
      samples.sort((a, b) => a - b);
      const idx = Math.min(samples.length - 1, Math.floor(samples.length * 0.95));
      p95Ref.current = Math.max(1, samples[idx]);
    }

    // Schedule render
    scheduleRender();
  }, [hook]);

  // ── Render ────────────────────────────────────────────────────────────

  const scheduleRender = useCallback(() => {
    if (rafRef.current !== null) return; // already scheduled
    rafRef.current = requestAnimationFrame(() => {
      try {
        render();
      } finally {
        // Always clear the handle so the next scheduleRender() can proceed,
        // even if render() threw — prevents the RAF loop from wedging.
        rafRef.current = null;
      }
    });
  }, []); // render is stable (defined below with useCallback)

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = container.clientWidth;
    const cssH = CANVAS_HEIGHT;

    // Resize canvas if needed
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use setTransform instead of save/scale so the DPR transform never
    // accumulates across frames (safe even if a previous render threw without
    // reaching ctx.restore()). We still save/restore around the render body
    // for clipping/shadow state, but the transform is always set absolutely.
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    try {

    // Layout constants
    const PRICE_AXIS_W = 68;  // px for price labels on the right
    const TIME_AXIS_H = 22;   // px for time labels at the bottom
    const plotW = cssW - PRICE_AXIS_W;
    const plotH = cssH - TIME_AXIS_H;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cssW, cssH);

    const ring = columnsRef.current;
    const totalCols = ring.length;

    if (totalCols === 0) {
      // Empty state hint
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Building liquidity map…', cssW / 2, cssH / 2);
      return;
    }

    // ── Camera mid-price (Fix #3) ─────────────────────────────────────
    // Drive cameraMid from the latest column's actual mid price.
    // Smooth with lerp(α=0.15) so the camera glides rather than snapping.
    // Additionally clamp so the latest price always stays in the middle 60%
    // of the visible range — if it escapes, snap cameraMid toward it.
    const latestCol = ring[ring.length === COLUMN_RING_SIZE
      ? (colHeadRef.current - 1 + COLUMN_RING_SIZE) % COLUMN_RING_SIZE
      : ring.length - 1];
    const latestMid = latestCol?.mid ?? null;

    if (latestMid === null) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Building liquidity map…', cssW / 2, cssH / 2);
      return;
    }

    if (cameraMidRef.current === null) {
      cameraMidRef.current = latestMid;
    } else {
      // Lerp toward latest mid
      cameraMidRef.current = lerp(cameraMidRef.current, latestMid, 0.15);
      // Clamp: ensure latestMid stays in middle 60% of the ±2% visible range.
      // Middle 60% = cameraMid ± 0.6 * halfRange.  If latestMid escapes,
      // snap cameraMid to place it exactly at the boundary.
      const clampHalf = cameraMidRef.current * PRICE_RANGE_PCT * 0.6;
      if (latestMid < cameraMidRef.current - clampHalf) {
        cameraMidRef.current = latestMid + clampHalf;
      } else if (latestMid > cameraMidRef.current + clampHalf) {
        cameraMidRef.current = latestMid - clampHalf;
      }
    }

    const mid = cameraMidRef.current;
    const halfRange = mid * PRICE_RANGE_PCT;
    const priceLow = mid - halfRange;
    const priceHigh = mid + halfRange;
    const priceSpan = priceHigh - priceLow;

    // Price → Y (higher price = lower Y)
    const priceToY = (p: number): number =>
      plotH - ((p - priceLow) / priceSpan) * plotH;

    // Ordered ring access (oldest → newest left → right)
    const orderedCols: BookColumn[] = [];
    if (ring.length < COLUMN_RING_SIZE) {
      orderedCols.push(...ring);
    } else {
      const oldest = colHeadRef.current % COLUMN_RING_SIZE;
      orderedCols.push(...ring.slice(oldest), ...ring.slice(0, oldest));
    }

    // Column X width
    const colW = Math.max(1, plotW / orderedCols.length);

    // Normalisation reference: 95th-percentile nonzero notional.
    // Computed incrementally in sampleBook; falls back to 1 until first sample.
    const p95 = p95Ref.current;

    // Compute bin size for visible levels
    const binSize = computeBinSize(mid);
    const binH = Math.max(1, (binSize / priceSpan) * plotH);

    // ── Draw heatmap columns ────────────────────────────────────────────
    for (let ci = 0; ci < orderedCols.length; ci++) {
      const col = orderedCols[ci];
      const x = ci * colW;

      for (const [binPrice, qty] of col.levels) {
        const binMid = binPrice + binSize / 2;
        if (binMid < priceLow || binMid > priceHigh) continue;

        // Normalize by p95 (cap at 1 — anything above p95 is a strong wall).
        const rawIntensity = Math.min(1, qty / p95);
        // Apply log+gamma compression: collapses weak cells to near-zero,
        // walls at/above p95 stay near 1.
        const displayIntensity = compressIntensity(rawIntensity);

        const palIdx = Math.min(
          HEAT_PALETTE.length - 1,
          Math.floor(displayIntensity * HEAT_PALETTE.length),
        );
        ctx.fillStyle = HEAT_PALETTE[palIdx];

        const y = priceToY(binPrice + binSize);
        ctx.fillRect(x, y, colW + 0.5, binH + 0.5);
      }
    }

    // ── Subtle grid lines ───────────────────────────────────────────────
    // Use an extremely low-opacity dark gray so the heatmap stays dominant.
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;

    // Horizontal price grid (every ~0.3% band)
    const gridSteps = 8;
    for (let i = 0; i <= gridSteps; i++) {
      const price = priceLow + (i / gridSteps) * priceSpan;
      const y = priceToY(price);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
      ctx.stroke();
    }

    // Vertical time grid (every ~3 min worth of columns, or fraction thereof)
    const targetGridCols = Math.max(4, Math.floor(orderedCols.length / 30));
    const gridColStep = Math.max(1, Math.floor(orderedCols.length / targetGridCols));
    for (let ci = 0; ci < orderedCols.length; ci += gridColStep) {
      const x = ci * colW;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, plotH);
      ctx.stroke();
    }

    // ── Continuous mid-price polyline ───────────────────────────────────
    // Drawn before trade bubbles so bubbles sit on top.
    // Draw a glow pass (wider, transparent) then a solid pass.
    if (orderedCols.length > 1) {
      // Glow
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.4)';
      ctx.shadowBlur = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let ci = 0; ci < orderedCols.length; ci++) {
        const x = ci * colW + colW / 2;
        const y = priceToY(orderedCols[ci].mid);
        if (ci === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Solid white line
      ctx.strokeStyle = 'rgba(255,255,255,0.88)';
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let ci = 0; ci < orderedCols.length; ci++) {
        const x = ci * colW + colW / 2;
        const y = priceToY(orderedCols[ci].mid);
        if (ci === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // ── Trade markers (drawn above heat + price line) ───────────────────
    const trades = pendingTradesRef.current;
    pendingTradesRef.current = [];

    if (orderedCols.length > 0) {
      const newestTime = orderedCols[orderedCols.length - 1].timestamp;
      const oldestTime = orderedCols[0].timestamp;
      const timeSpan = Math.max(1, newestTime - oldestTime);

      for (const trade of trades) {
        if (trade.price < priceLow || trade.price > priceHigh) continue;

        const tNorm = Math.max(0, Math.min(1, (trade.time - oldestTime) / timeSpan));
        const x = tNorm * plotW;
        const y = priceToY(trade.price);

        // Radius proportional to sqrt(USD notional), capped
        const notional = trade.price * trade.qty;
        const r = Math.min(MAX_TRADE_RADIUS, Math.max(2, Math.sqrt(notional / 500)));

        // buy = teal, sell = red; thin dark stroke so they read against gold heat
        const fillColor = trade.isBuyerMaker
          ? 'rgba(248, 113, 113, 0.80)' // sell (seller was maker)
          : 'rgba(52, 211, 153, 0.80)'; // buy (buyer was aggressor)
        const strokeColor = trade.isBuyerMaker
          ? 'rgba(100, 30, 30, 0.70)'
          : 'rgba(10,  80, 50, 0.70)';

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // ── Current-price pill + dashed reference line ──────────────────────
    // The historical mid polyline above shows the full trajectory.
    // Here we add a subtle dashed line at the live last-price + right-edge pill.
    const lp = hook.lastPrice;
    if (lp !== null && lp >= priceLow && lp <= priceHigh) {
      const y = priceToY(lp);

      // Very subtle dashed horizontal guide at current price
      ctx.strokeStyle = 'rgba(255,255,255,0.30)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price pill on the right edge
      const label = lp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const pillW = 64;
      const pillH = 16;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.roundRect(plotW + 2, y - pillH / 2, pillW - 4, pillH, 3);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, plotW + 2 + (pillW - 4) / 2, y);
    }

    // ── Price axis labels ───────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const priceLabelCount = 6;
    for (let i = 0; i <= priceLabelCount; i++) {
      const price = priceLow + (i / priceLabelCount) * priceSpan;
      const y = priceToY(price);
      if (y < 10 || y > plotH - 10) continue;
      const label = price >= 1000
        ? price.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : price.toFixed(4);
      ctx.fillText(label, plotW + 4, y);
    }

    // ── Time axis labels ────────────────────────────────────────────────
    // Fix #1: timeLabelCount = floor(len/30).  When len < 30 this is 0,
    // making i/timeLabelCount = i/0 = NaN → orderedCols[NaN] = undefined →
    // `.timestamp` throws. Guard: only enter the loop when count >= 1.
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (orderedCols.length > 1) {
      const timeLabelCount = Math.floor(orderedCols.length / 30);
      if (timeLabelCount >= 1) {
        for (let i = 0; i <= timeLabelCount; i++) {
          const ci = Math.floor((i / timeLabelCount) * (orderedCols.length - 1));
          const col = orderedCols[ci];
          if (!col) continue; // defensive: should not happen, but guard anyway
          const x = ci * colW;
          const d = new Date(col.timestamp);
          const label = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          ctx.fillText(label, x, plotH + 4);
        }
      }
    }

    // ── "Building" overlay when few columns exist ───────────────────────
    if (orderedCols.length < 10) {
      ctx.fillStyle = 'rgba(201,166,70,0.55)';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Building liquidity map…', plotW / 2, plotH / 2);
    }

    } finally {
      // Fix #2: always restore so the transform stack never accumulates,
      // even when an earlier statement in the render body threw.
      ctx.restore();
    }
  }, [hook]);

  // ── Effects ───────────────────────────────────────────────────────────

  // Reset ring buffer when symbol changes
  useEffect(() => {
    if (lastSymbolRef.current !== symbol) {
      lastSymbolRef.current = symbol;
      columnsRef.current = [];
      colHeadRef.current = 0;
      colCountRef.current = 0;
      cameraMidRef.current = null;
      pendingTradesRef.current = [];
      p95Ref.current = 1;
    }
  }, [symbol]);

  // Start/stop 1-second sampler
  useEffect(() => {
    sampleIntervalRef.current = setInterval(sampleBook, SAMPLE_INTERVAL_MS);
    return () => {
      if (sampleIntervalRef.current !== null) {
        clearInterval(sampleIntervalRef.current);
        sampleIntervalRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [sampleBook]);

  // ResizeObserver — re-render when container width changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    roRef.current = new ResizeObserver(() => {
      scheduleRender();
    });
    roRef.current.observe(container);

    return () => {
      roRef.current?.disconnect();
      roRef.current = null;
    };
  }, [scheduleRender]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl bg-black"
      style={{ height: CANVAS_HEIGHT }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
