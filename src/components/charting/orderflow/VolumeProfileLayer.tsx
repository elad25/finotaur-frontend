// src/components/charting/orderflow/VolumeProfileLayer.tsx
//
// Canvas overlay that renders an ATAS-style Volume Profile histogram,
// left-anchored inside the chart pane, fed by a FlowBinStore (see
// flowBinStore.ts / volumeProfile.ts for the pure aggregation).
//
// Two modes, selected by whether the `sessionStartSec` prop is provided:
//   - SESSION mode (sessionStartSec set — the default since FootprintTab
//     passes the current trading day's start): the profile is computed over
//     [sessionStartSec, +Inf) from the store and does NOT change while
//     panning/zooming — only when the store's data changes or
//     `sessionStartSec` itself changes (e.g. the calendar day rolls over).
//   - VISIBLE-RANGE mode (sessionStartSec undefined — the fallback): the
//     profile is recomputed from whatever candles are currently on screen,
//     same as this overlay's original v1 behavior.
//
// Structure mirrors FootprintLayer.tsx / DepthMatrixLayer.tsx:
//   - Absolutely-positioned, DPR-aware, pointer-events:none canvas.
//   - rAF loop with a dirty flag (store.onChange + config change) PLUS a
//     per-frame coordinate fingerprint (price-axis rescale has no lw-charts
//     v4 event).
//   - The EXPENSIVE step (recomputing the profile from the store) is
//     debounced 150ms after the visible range stops changing (visible-range
//     mode) or after the store's data changes (session mode) — never run on
//     every pan/zoom frame. The already-computed profile is cached and only
//     RE-PROJECTED (row width → px, price → y) on pan/zoom frames.
//   - try/finally with ctx.setTransform(1,0,0,1,0,0) restoration.
//   - Clipped at timeScale().width() so nothing paints over the price axis.

import { useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { FlowBinStore } from './flowBinStore';
import { computeVolumeProfile, type VolumeProfile } from './volumeProfile';
import {
  FOOTPRINT_POC_COLOR,
  VOLUME_PROFILE_BUY_FILL,
  VOLUME_PROFILE_SELL_FILL,
  VOLUME_PROFILE_VA_BG,
  VOLUME_PROFILE_VA_BOUNDARY_COLOR,
  VOLUME_PROFILE_VA_BOUNDARY_DASH,
  VOLUME_PROFILE_POC_DASH,
  VOLUME_PROFILE_POC_LINE_WIDTH,
  VOLUME_PROFILE_MAX_WIDTH_FRAC,
  VOLUME_PROFILE_RECOMPUTE_DEBOUNCE_MS,
} from './footprintTheme';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface VolumeProfileLayerProps {
  chart: IChartApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: ISeriesApi<any>;
  store: FlowBinStore;
  visible: boolean;
  /**
   * When provided (Unix seconds), the profile is computed over
   * [sessionStartSec, +Inf) from the store (SESSION mode) instead of the
   * visible chart range, and does NOT recompute on pan/zoom — only when the
   * store's data changes or this value itself changes. Undefined (the
   * default) keeps the original VISIBLE-RANGE mode.
   */
  sessionStartSec?: number;
  /** Container CSS width in px. */
  width: number;
  /** Container CSS height in px. */
  height: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VolumeProfileLayer({ chart, series, store, visible, sessionStartSec, width, height }: VolumeProfileLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const dirtyRef = useRef<boolean>(true);
  const lastFingerprintRef = useRef<string>('');

  // Latest props kept in refs so the rAF loop always reads current values.
  const visibleRef = useRef<boolean>(visible);
  const widthRef = useRef<number>(width);
  const heightRef = useRef<number>(height);
  const storeRef = useRef<FlowBinStore>(store);
  const sessionStartSecRef = useRef<number | undefined>(sessionStartSec);
  visibleRef.current = visible;
  widthRef.current = width;
  heightRef.current = height;
  storeRef.current = store;
  sessionStartSecRef.current = sessionStartSec;

  // Debounced, cached profile — recomputed 150ms after the visible range
  // settles (visible-range mode) or the store changes (either mode), NEVER
  // per pan/zoom frame.
  const profileRef = useRef<VolumeProfile>({ rows: [], poc: null, vah: null, val: null, maxRowVol: 0 });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last [fromSec, toSec] the profile was computed for — recompute gate.
  const lastRangeKeyRef = useRef<string>('');

  const scheduleRecompute = () => {
    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      const anchorSec = sessionStartSecRef.current;
      let fromSec: number;
      let toSec: number;
      if (anchorSec !== undefined) {
        // SESSION mode — the whole session-to-date, regardless of what's
        // currently panned/zoomed into view.
        fromSec = anchorSec;
        toSec = Number.MAX_SAFE_INTEGER;
      } else {
        // VISIBLE-RANGE mode (fallback) — original v1 behavior.
        const visRange = chart.timeScale().getVisibleRange();
        if (!visRange) return;
        fromSec = Math.floor(visRange.from as unknown as number);
        toSec = Math.ceil(visRange.to as unknown as number);
      }
      const rangeKey = `${fromSec}|${toSec}`;
      lastRangeKeyRef.current = rangeKey;
      const candles = storeRef.current.getRange(fromSec, toSec);
      profileRef.current = computeVolumeProfile(candles);
      dirtyRef.current = true;
    }, VOLUME_PROFILE_RECOMPUTE_DEBOUNCE_MS);
  };

  // ── Recompute on store change ────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = store.onChange(() => {
      scheduleRecompute();
    });
    scheduleRecompute(); // store identity changed (symbol swap) — force recompute
    return () => {
      unsubscribe();
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  // ── Recompute on visible-range change (debounced) — VISIBLE-RANGE mode
  //    only. In SESSION mode the profile is anchored to sessionStartSec and
  //    must NOT recompute just because the user panned/zoomed. ────────────
  useEffect(() => {
    const timeScale = chart.timeScale();
    const onRangeChange = () => {
      if (sessionStartSecRef.current !== undefined) return; // session mode — no-op
      scheduleRecompute();
    };
    timeScale.subscribeVisibleTimeRangeChange(onRangeChange);
    return () => {
      try { timeScale.unsubscribeVisibleTimeRangeChange(onRangeChange); } catch { /* chart gone */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);

  // ── Recompute when the session boundary itself changes (e.g. the
  //    calendar day rolls over, or the caller switches session anchors) ───
  useEffect(() => {
    if (sessionStartSec === undefined) return;
    scheduleRecompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStartSec]);

  // ── Mark dirty on size/visibility change ─────────────────────────────────
  useEffect(() => {
    dirtyRef.current = true;
  }, [width, height, visible]);

  // ── rAF draw loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const chartInstance = chart;
    const seriesInstance = series;
    let running = true;

    function drawFrame() {
      if (!running) return;
      rafRef.current = requestAnimationFrame(drawFrame);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const cssW = widthRef.current;
      const cssH = heightRef.current;
      if (cssW <= 0 || cssH <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      const pixW = Math.round(cssW * dpr);
      const pixH = Math.round(cssH * dpr);
      if (canvas.width !== pixW || canvas.height !== pixH) {
        canvas.width = pixW;
        canvas.height = pixH;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!visibleRef.current) {
        try {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, cssW, cssH);
        } finally {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        return;
      }

      const rawPaneW = chartInstance.timeScale().width();
      const paneW = (typeof rawPaneW === 'number' && rawPaneW > 0) ? rawPaneW : cssW;
      const logRange = chartInstance.timeScale().getVisibleLogicalRange();
      const fpFrom = logRange ? logRange.from : NaN;
      const fpTo = logRange ? logRange.to : NaN;
      const fpY0 = seriesInstance.priceToCoordinate(0) ?? NaN;
      const fpY1 = seriesInstance.priceToCoordinate(1) ?? NaN;
      const fingerprint = `${paneW}|${cssW}|${cssH}|${fpFrom}|${fpTo}|${fpY0}|${fpY1}`;
      const fingerprintChanged = fingerprint !== lastFingerprintRef.current;

      if (!dirtyRef.current && !fingerprintChanged) return;
      dirtyRef.current = false;

      try {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const profile = profileRef.current;
        if (profile.rows.length === 0 || profile.maxRowVol <= 0) return;

        const storeConfig = storeRef.current.getConfig();
        const rowSize = storeConfig.rowSize > 0 ? storeConfig.rowSize : inferRowSize(profile);
        if (rowSize <= 0) return;

        const maxBarWidthPx = paneW * VOLUME_PROFILE_MAX_WIDTH_FRAC;
        const leftEdgeX = 0;

        // ── Row height (px) — derived from priceToCoordinate over one rowSize.
        const yAt0 = seriesInstance.priceToCoordinate(0);
        const yAt1 = seriesInstance.priceToCoordinate(rowSize);
        const rowHeightPx = yAt0 !== null && yAt1 !== null ? Math.abs((yAt0 as number) - (yAt1 as number)) : 0;
        if (rowHeightPx <= 0) return;

        // ── Draw each row: split-colored buy/sell histogram bar ────────────
        for (const row of profile.rows) {
          const yTop = seriesInstance.priceToCoordinate(row.binPrice + rowSize);
          const yBottom = seriesInstance.priceToCoordinate(row.binPrice);
          if (yTop === null || yBottom === null) continue;

          const top = Math.min(yTop as number, yBottom as number);
          const rowH = Math.max(1, Math.abs((yBottom as number) - (yTop as number)));
          const drawH = Math.max(1, rowH * 0.62);
          const drawTop = top + (rowH - drawH) / 2;

          const volFrac = row.totalVol / profile.maxRowVol;
          const barWidth = Math.max(1, volFrac * maxBarWidthPx);

          const buyFrac = row.totalVol > 0 ? row.buyVol / row.totalVol : 0;
          const buyWidth = barWidth * buyFrac;
          const sellWidth = barWidth - buyWidth;

          // Draw a neutral gold profile. Buy/sell are still accumulated for
          // width parity with the existing data shape, but no red/green split
          // is exposed visually.
          const buyLeft = leftEdgeX;
          ctx.fillStyle = VOLUME_PROFILE_BUY_FILL;
          ctx.fillRect(buyLeft, drawTop, buyWidth, drawH);

          const sellLeft = buyLeft + buyWidth;
          ctx.fillStyle = VOLUME_PROFILE_SELL_FILL;
          ctx.fillRect(sellLeft, drawTop, sellWidth, drawH);
        }

        // ── Value Area shading (behind the histogram bars, so draw first
        // conceptually — but we draw it here as a background band spanning
        // the full profile width so it doesn't get obscured by the fills
        // above; use a low alpha so histogram bars remain legible on top). ──
        if (profile.vah !== null && profile.val !== null) {
          const yVahTop = seriesInstance.priceToCoordinate(profile.vah + rowSize);
          const yValBottom = seriesInstance.priceToCoordinate(profile.val);
          if (yVahTop !== null && yValBottom !== null) {
            const top = Math.min(yVahTop as number, yValBottom as number);
            const bandH = Math.abs((yValBottom as number) - (yVahTop as number));
            ctx.fillStyle = VOLUME_PROFILE_VA_BG;
            ctx.fillRect(leftEdgeX, top, maxBarWidthPx, bandH);
          }

          // VAH / VAL boundary lines — thin dashed gold across the profile width.
          drawDashedHLine(ctx, profile.vah + rowSize, leftEdgeX, leftEdgeX + maxBarWidthPx, seriesInstance, VOLUME_PROFILE_VA_BOUNDARY_COLOR, 1, VOLUME_PROFILE_VA_BOUNDARY_DASH);
          drawDashedHLine(ctx, profile.val, leftEdgeX, leftEdgeX + maxBarWidthPx, seriesInstance, VOLUME_PROFILE_VA_BOUNDARY_COLOR, 1, VOLUME_PROFILE_VA_BOUNDARY_DASH);
        }

        // ── POC line — full pane width, dashed gold ─────────────────────────
        if (profile.poc !== null) {
          const pocMid = profile.poc + rowSize / 2;
          drawDashedHLine(ctx, pocMid, 0, paneW, seriesInstance, FOOTPRINT_POC_COLOR, VOLUME_PROFILE_POC_LINE_WIDTH, VOLUME_PROFILE_POC_DASH);
        }
      } finally {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        lastFingerprintRef.current = fingerprint;
      }
    }

    rafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, series]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        // Above candles, same register as the footprint overlay — the profile
        // is an ATAS-style reading aid, not a background heatmap.
        zIndex: 14,
      }}
      aria-hidden="true"
    />
  );
}

// ─── Local helpers ───────────────────────────────────────────────────────────

/** Draw a horizontal dashed line at `price`, from x=fromX to x=toX. */
function drawDashedHLine(
  ctx: CanvasRenderingContext2D,
  price: number,
  fromX: number,
  toX: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: ISeriesApi<any>,
  color: string,
  lineWidth: number,
  dash: [number, number],
): void {
  const y = series.priceToCoordinate(price);
  if (y === null) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(fromX, y as number);
  ctx.lineTo(toX, y as number);
  ctx.stroke();
  ctx.restore();
}

/** Fallback rowSize inference from adjacent profile rows (mirrors FootprintLayer's inferRowSize). */
function inferRowSize(profile: VolumeProfile): number {
  for (let i = 1; i < profile.rows.length; i++) {
    const gap = profile.rows[i].binPrice - profile.rows[i - 1].binPrice;
    if (gap > 0) return gap;
  }
  return 0;
}

export default VolumeProfileLayer;
