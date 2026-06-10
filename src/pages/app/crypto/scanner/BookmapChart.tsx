// src/pages/app/crypto/scanner/BookmapChart.tsx
// Canvas-based Bookmap-style rolling liquidity heatmap.
// No charting libraries — pure Canvas2D, devicePixelRatio-aware.
//
// Architecture:
//   - Every 1 second: sample order book → push a "column" into a ring buffer.
//   - On every column push (requestAnimationFrame-gated): render the full canvas.
//   - Trades from aggTrade stream are overlaid as circles.
//   - Book/trade data arrive via refs (no re-render per WS message).

import { useEffect, useRef, useCallback } from 'react';
import type { OrderBookHandle, Trade } from './useBinanceOrderBook';

// ── Constants ────────────────────────────────────────────────────────────────

const CANVAS_HEIGHT = 520;
const COLUMN_RING_SIZE = 900;      // 900 × 1s = 15 min history
const SAMPLE_INTERVAL_MS = 1_000;  // snapshot book every 1s
const PRICE_RANGE_PCT = 0.012;     // ±1.2% around mid
const PRICE_SMOOTHING = 0.05;      // lerp factor for mid-price tracking
const MAX_TRADE_RADIUS = 12;       // px cap for trade circles

// Heat palette: index 0 = near-black, index N = near-white (through amber → gold)
// We map log-normalized intensity [0, 1] → palette index.
const HEAT_PALETTE: string[] = buildPalette();

function buildPalette(): string[] {
  // 64 steps: black → deep amber → gold #C9A646 → near-white
  const stops: [number, [number, number, number]][] = [
    [0.00, [8, 6, 4]],
    [0.30, [40, 24, 6]],
    [0.55, [110, 60, 8]],
    [0.75, [180, 130, 30]],
    [0.88, [201, 166, 70]],  // gold #C9A646
    [0.95, [230, 210, 140]],
    [1.00, [255, 248, 220]],
  ];

  const N = 64;
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

// ── Types ────────────────────────────────────────────────────────────────────

interface BookColumn {
  timestamp: number;  // Unix ms
  mid: number;
  /** binPrice (rounded) → total qty */
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

  // Smoothed mid-price for the camera
  const smoothMidRef = useRef<number | null>(null);

  // Accumulated trades (for rendering circles; drained per-render)
  const pendingTradesRef = useRef<Trade[]>([]);

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

    // Smooth camera
    if (smoothMidRef.current === null) {
      smoothMidRef.current = mid;
    } else {
      smoothMidRef.current = lerp(smoothMidRef.current, mid, PRICE_SMOOTHING);
    }

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

    // Schedule render
    scheduleRender();
  }, [hook]);

  // ── Render ────────────────────────────────────────────────────────────

  const scheduleRender = useCallback(() => {
    if (rafRef.current !== null) return; // already scheduled
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      render();
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

    ctx.save();
    ctx.scale(dpr, dpr);

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

    if (totalCols === 0 || smoothMidRef.current === null) {
      // Empty state hint
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Building liquidity map…', cssW / 2, cssH / 2);
      ctx.restore();
      return;
    }

    const mid = smoothMidRef.current;
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

    // Compute rolling max notional (for heat normalisation)
    let maxQty = 1;
    for (const col of orderedCols) {
      for (const qty of col.levels.values()) {
        if (qty > maxQty) maxQty = qty;
      }
    }
    const logMax = Math.log1p(maxQty);

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

        const intensity = Math.log1p(qty) / logMax; // [0, 1]
        const palIdx = Math.min(
          HEAT_PALETTE.length - 1,
          Math.floor(intensity * HEAT_PALETTE.length),
        );
        ctx.fillStyle = HEAT_PALETTE[palIdx];

        const y = priceToY(binPrice + binSize);
        ctx.fillRect(x, y, colW + 0.5, binH + 0.5);
      }
    }

    // ── Subtle grid lines ───────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
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

    // ── Trade markers ───────────────────────────────────────────────────
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

        // buy = teal, sell = red
        const color = trade.isBuyerMaker
          ? 'rgba(248, 113, 113, 0.65)' // sell (seller was maker)
          : 'rgba(52, 211, 153, 0.65)'; // buy (buyer was aggressor)

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    }

    // ── Last-price line ─────────────────────────────────────────────────
    const lp = hook.lastPrice;
    if (lp !== null && lp >= priceLow && lp <= priceHigh) {
      const y = priceToY(lp);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price pill on the right edge
      const label = lp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        ? price.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : price.toFixed(4);
      ctx.fillText(label, plotW + 4, y);
    }

    // ── Time axis labels ────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (orderedCols.length > 1) {
      const timeLabelCount = Math.min(6, Math.floor(orderedCols.length / 30));
      for (let i = 0; i <= timeLabelCount; i++) {
        const ci = Math.floor((i / timeLabelCount) * (orderedCols.length - 1));
        const col = orderedCols[ci];
        const x = ci * colW;
        const d = new Date(col.timestamp);
        const label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        ctx.fillText(label, x, plotH + 4);
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

    ctx.restore();
  }, [hook]);

  // ── Effects ───────────────────────────────────────────────────────────

  // Reset ring buffer when symbol changes
  useEffect(() => {
    if (lastSymbolRef.current !== symbol) {
      lastSymbolRef.current = symbol;
      columnsRef.current = [];
      colHeadRef.current = 0;
      colCountRef.current = 0;
      smoothMidRef.current = null;
      pendingTradesRef.current = [];
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
