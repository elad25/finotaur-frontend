// src/components/charting/orderflow/SessionVolumeProfileLayer.tsx
//
// Canvas overlay that renders an ATAS-style SESSION Volume Profile — one
// horizontal volume-at-price histogram block PER SESSION, anchored at each
// session's start, drawn BEHIND candles. Each session also gets a vPOC row
// that extends right as a thin gold ray until price violates it or the chart
// ends, optional VAH/VAL boundary lines, and a dashed session-separator line.
//
// Distinct from VolumeProfileLayer.tsx (visible-range only, FlowBinStore-fed,
// buy/sell split, right-anchored) — this layer is fed directly by the OHLCV
// `Bar[]` FinotaurChart already has loaded (see sessionVolumeProfile.ts for
// the pure aggregation + the approximation it documents), multi-session, and
// left-anchored per session. Kept as a SIBLING layer rather than a mode flag
// on VolumeProfileLayer because the data source (bars vs FlowBinStore), the
// anchor model (per-session vs single right-anchored block), and the color
// scheme (no buy/sell split — OHLCV carries no aggressor-side data) are all
// different enough that a shared implementation would need more branching
// than it would save — see valueArea.ts's computeValueArea, which IS reused
// here (the one piece of math both layers actually share).
//
// Structure mirrors VolumeProfileLayer.tsx / DepthMatrixLayer.tsx:
//   - Absolutely-positioned, DPR-aware, pointer-events:none canvas.
//   - zIndex 5 — same value DepthMatrixLayer uses to paint BEHIND the
//     lightweight-charts candle canvas (see FinotaurChart.tsx's JSX comment
//     on DepthMatrixLayer for why zIndex 5 wins that stacking comparison).
//   - rAF loop with a dirty flag PLUS a per-frame coordinate fingerprint
//     (price-axis rescale fires no lw-charts v4 event).
//   - The EXPENSIVE step (computeSessionProfiles) runs ONLY when `bars`
//     (array identity — FinotaurChart only reassigns barsRef.current on a
//     fresh fetch, never per-frame) or the computation-relevant settings
//     (period/timezone/customSessionStart/customSessionEnd) change — never
//     on every pan/zoom/crosshair frame. Purely cosmetic settings
//     (showVpoc/showVahVal/profileWidthPct/opacity) only bump the dirty flag
//     for a redraw from the already-computed sessions.
//   - try/finally with ctx.setTransform(1,0,0,1,0,0) restoration.
//   - Clipped at timeScale().width() so nothing paints over the price axis.

import { useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { Bar } from '../types';
import { computeSessionProfiles, type ComputedSessionProfile, type SessionPeriod } from './sessionVolumeProfile';
import type { ChartTimezone } from '@/pages/app/trading-arena/components/chartStyleSettings';
import {
  SESSION_VP_ROW_FILL,
  SESSION_VP_ROW_FILL_VA,
  SESSION_VP_VPOC_COLOR,
  SESSION_VP_VPOC_LINE_WIDTH,
  SESSION_VP_LABEL_FONT,
  SESSION_VP_VAHVAL_COLOR,
  SESSION_VP_VAHVAL_DASH,
  SESSION_VP_SEPARATOR_COLOR,
  SESSION_VP_SEPARATOR_DASH,
  SESSION_VP_TARGET_ROW_COUNT,
} from './footprintTheme';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SessionVolumeProfileRenderSettings {
  period: SessionPeriod;
  timezone: ChartTimezone;
  customSessionStart: string;
  customSessionEnd: string;
  showVpoc: boolean;
  showVahVal: boolean;
  /** Max % of a session's horizontal span the histogram may occupy. */
  profileWidthPct: number;
  opacity: number;
}

export interface SessionVolumeProfileLayerProps {
  chart: IChartApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: ISeriesApi<any>;
  bars: Bar[];
  settings: SessionVolumeProfileRenderSettings;
  visible: boolean;
  /** Container CSS width in px. */
  width: number;
  /** Container CSS height in px. */
  height: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SessionVolumeProfileLayer({ chart, series, bars, settings, visible, width, height }: SessionVolumeProfileLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const dirtyRef = useRef<boolean>(true);
  const lastFingerprintRef = useRef<string>('');

  const visibleRef = useRef<boolean>(visible);
  const widthRef = useRef<number>(width);
  const heightRef = useRef<number>(height);
  const settingsRef = useRef<SessionVolumeProfileRenderSettings>(settings);
  visibleRef.current = visible;
  widthRef.current = width;
  heightRef.current = height;
  settingsRef.current = settings;

  // Precomputed sessions — recomputed only in the effect below, read every frame.
  const sessionsRef = useRef<ComputedSessionProfile[]>([]);

  // ── Recompute sessions when bars or computation-relevant settings change ──
  useEffect(() => {
    sessionsRef.current = computeSessionProfiles(
      bars,
      settings.period,
      settings.timezone,
      settings.customSessionStart,
      settings.customSessionEnd,
      SESSION_VP_TARGET_ROW_COUNT,
    );
    dirtyRef.current = true;
  }, [bars, settings.period, settings.timezone, settings.customSessionStart, settings.customSessionEnd]);

  // ── Mark dirty on purely cosmetic changes (no recompute needed) ─────────
  useEffect(() => {
    dirtyRef.current = true;
  }, [width, height, visible, settings.showVpoc, settings.showVahVal, settings.profileWidthPct, settings.opacity]);

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

        const sessions = sessionsRef.current;
        if (sessions.length === 0) return;

        const s = settingsRef.current;
        const profileWidthPct = Math.min(60, Math.max(5, s.profileWidthPct));
        const opacity = Math.min(1, Math.max(0, s.opacity));

        ctx.save();
        ctx.globalAlpha = opacity;

        for (const session of sessions) {
          drawSession(ctx, chartInstance, seriesInstance, session, s, profileWidthPct, paneW, cssH, bars);
        }

        ctx.restore();
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
  }, [chart, series, bars]);

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
        // Behind candles — see FinotaurChart.tsx's DepthMatrixLayer comment
        // for why zIndex 5 wins the stacking comparison against the
        // lightweight-charts candle canvas nested inside containerRef.
        zIndex: 5,
      }}
      aria-hidden="true"
    />
  );
}

// ─── Per-session draw ────────────────────────────────────────────────────────

function drawSession(
  ctx: CanvasRenderingContext2D,
  chart: IChartApi,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: ISeriesApi<any>,
  session: ComputedSessionProfile,
  settings: SessionVolumeProfileRenderSettings,
  profileWidthPct: number,
  paneW: number,
  cssH: number,
  bars: Bar[],
): void {
  if (session.rows.length === 0 || session.maxRowVol <= 0 || session.rowSize <= 0) return;

  // sessionStartSec/sessionEndSec are always exact bar timestamps (see
  // sessionVolumeProfile.ts), so timeToCoordinate resolves without the
  // bar-snapped extrapolation FootprintLayer needs for arbitrary times.
  const xStartRaw = chart.timeScale().timeToCoordinate(session.sessionStartSec as UTCTimestamp);
  if (xStartRaw === null) return;
  const xStart = xStartRaw as number;
  if (xStart > paneW) return; // session starts off-screen to the right — nothing to draw

  const xEndBoundaryRaw = chart.timeScale().timeToCoordinate(session.sessionEndSec as UTCTimestamp);
  const xEndBoundary = xEndBoundaryRaw === null ? paneW : Math.min(paneW, xEndBoundaryRaw as number);
  const sessionSpanPx = Math.max(0, xEndBoundary - xStart);

  // ── Session separator — dashed vertical line at session start ───────────
  if (xStart >= 0 && xStart <= paneW) {
    ctx.save();
    ctx.strokeStyle = SESSION_VP_SEPARATOR_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash(SESSION_VP_SEPARATOR_DASH);
    ctx.beginPath();
    ctx.moveTo(xStart, 0);
    ctx.lineTo(xStart, cssH);
    ctx.stroke();
    ctx.restore();
  }

  if (sessionSpanPx <= 0) return; // degenerate (single-bar final session) — separator only

  const profileWidthPx = Math.max(2, sessionSpanPx * (profileWidthPct / 100));
  const rowSize = session.rowSize;

  // ── Histogram rows (behind candles, left-anchored at session start) ─────
  const vaLow = settings.showVahVal && session.val !== null ? session.val : null;
  const vaHigh = settings.showVahVal && session.vah !== null ? session.vah + rowSize : null;

  for (const row of session.rows) {
    const yTop = series.priceToCoordinate(row.binPrice + rowSize);
    const yBottom = series.priceToCoordinate(row.binPrice);
    if (yTop === null || yBottom === null) continue;

    const top = Math.min(yTop as number, yBottom as number);
    const rowH = Math.max(1, Math.abs((yBottom as number) - (yTop as number)));

    const volFrac = row.vol / session.maxRowVol;
    const barWidth = Math.max(1, volFrac * profileWidthPx);

    const inValueArea = vaLow !== null && vaHigh !== null && row.binPrice >= vaLow && row.binPrice < vaHigh;
    ctx.fillStyle = inValueArea ? SESSION_VP_ROW_FILL_VA : SESSION_VP_ROW_FILL;
    ctx.fillRect(xStart, top, barWidth, rowH);
  }

  // ── VAH/VAL boundary lines — thin dashed gold across the histogram width ─
  if (settings.showVahVal && session.vah !== null && session.val !== null) {
    drawDashedHLine(ctx, session.vah + rowSize, xStart, xStart + profileWidthPx, series, SESSION_VP_VAHVAL_COLOR, 1, SESSION_VP_VAHVAL_DASH);
    drawDashedHLine(ctx, session.val, xStart, xStart + profileWidthPx, series, SESSION_VP_VAHVAL_COLOR, 1, SESSION_VP_VAHVAL_DASH);
  }

  // ── vPOC row + extending ray + label ─────────────────────────────────────
  if (settings.showVpoc && session.poc !== null) {
    const pocMid = session.poc + rowSize / 2;
    const yPoc = series.priceToCoordinate(pocMid);
    if (yPoc !== null) {
      // Ray end: the violating bar's x (price traded back through the POC
      // bin), or the last loaded bar's x (chart end) when never violated.
      let rayEndX = paneW;
      if (session.pocViolationSec !== null) {
        const violationX = chart.timeScale().timeToCoordinate(session.pocViolationSec as UTCTimestamp);
        if (violationX !== null) rayEndX = Math.min(paneW, violationX as number);
      } else if (bars.length > 0) {
        const lastBarX = chart.timeScale().timeToCoordinate(bars[bars.length - 1].time);
        if (lastBarX !== null) rayEndX = Math.min(paneW, Math.max(xStart, lastBarX as number));
      }

      if (rayEndX > xStart) {
        ctx.save();
        ctx.strokeStyle = SESSION_VP_VPOC_COLOR;
        ctx.lineWidth = SESSION_VP_VPOC_LINE_WIDTH;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(xStart, yPoc as number);
        ctx.lineTo(rayEndX, yPoc as number);
        ctx.stroke();
        ctx.restore();

        // Label at the ray's right end, clipped so it never renders over the price axis.
        const labelX = Math.min(rayEndX + 3, paneW - 30);
        if (labelX > xStart) {
          ctx.save();
          ctx.fillStyle = SESSION_VP_VPOC_COLOR;
          ctx.font = SESSION_VP_LABEL_FONT;
          ctx.textBaseline = 'middle';
          ctx.fillText('vPOC', labelX, (yPoc as number) - 6);
          ctx.restore();
        }
      }
    }
  }
}

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

export default SessionVolumeProfileLayer;
