/**
 * PositionBox — TradingView-style draggable Long/Short risk-reward overlay.
 *
 * Renders, on top of the lightweight-charts canvas, a position visualization
 * band: a green TARGET zone (entry → take-profit), a red STOP zone (entry →
 * stop-loss), and an entry line in the middle that shows Open P&L, Qty and the
 * Risk/Reward ratio. Square handles on the target/stop lines are draggable —
 * dragging commits the new price back to the caller (which updates the real
 * position SL/TP). The whole band can be repositioned horizontally by dragging
 * the entry handle (purely cosmetic — entry price never moves).
 *
 * It owns NO chart state. The caller passes the live chart + candlestick series
 * (for price↔pixel conversion) plus a `redrawKey` that the host bumps on every
 * pan/zoom/resize so the box re-derives its pixel coordinates and stays glued
 * to price. Mirrors the existing markerIcons overlay pattern in FinotaurChart.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp, Logical } from 'lightweight-charts';

// ═══════════════════════════════════════════════════════════════
// Model + props
// ═══════════════════════════════════════════════════════════════
export interface PositionBoxModel {
  /** Direction. LONG → profit above entry, loss below; SHORT → inverted. */
  side: 'LONG' | 'SHORT';
  /** Entry price (active position) or trigger price (pending order). */
  entryPrice: number;
  /** Entry time (UTC seconds) — anchors the box horizontally to the entry bar
   *  so it scrolls with the chart instead of staying fixed on screen. */
  entryTime: number;
  /** Position size / contracts — drives Qty + Amount. */
  size: number;
  /** Real stop-loss price, if set. */
  stopLoss?: number;
  /** Real take-profit price, if set. */
  takeProfit?: number;
  /** Current/last price for Open P&L. Undefined → P&L shown as "—". */
  currentPrice?: number;
  /** Pending (limit/stop) order not yet filled — entry line reads "TRIGGER". */
  isPending?: boolean;
  /** Tick size for the "ticks" readout. Defaults to 0.25 (index futures). */
  tickSize?: number;
}

export interface PositionBoxProps {
  chart: IChartApi;
  series: ISeriesApi<'Candlestick'>;
  model: PositionBoxModel;
  /** Bump from the host on pan/zoom/resize to force a coordinate recompute. */
  redrawKey: number;
  /** Commit a dragged stop-loss price. */
  onStopLossChange: (price: number) => void;
  /** Commit a dragged take-profit price. */
  onTakeProfitChange: (price: number) => void;
}

// Visual constants — Finotaur palette, TradingView semantics.
const GREEN = '#22c55e';
const RED = '#ef4444';
const GREEN_FILL = 'rgba(34, 197, 94, 0.12)';
const RED_FILL = 'rgba(239, 68, 68, 0.12)';
const ENTRY_LINE = '#d4d4d8'; // zinc-300 — neutral entry line
const HANDLE_BLUE = '#2962FF'; // TradingView-style handle accent
const HANDLE = 11; // px — resize-handle box size

// Default zone offsets (fraction of entry) used only until the user sets a
// real SL/TP. Keeps the band visible like TradingView's tool out of the box.
const DEFAULT_TP_FRAC = 0.01; // 1%
const DEFAULT_SL_FRAC = 0.005; // 0.5%

function fmtPrice(v: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtAmount(v: number): string {
  return Math.round(v).toLocaleString('en-US');
}
function fmtSigned(v: number): string {
  const s = v >= 0 ? '+' : '';
  return `${s}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PositionBox({
  chart,
  series,
  model,
  redrawKey,
  onStopLossChange,
  onTakeProfitChange,
}: PositionBoxProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Drag state: which handle is active ('tp'/'sl' = price, 'time' = right-edge
  // width). Re-renders are driven by the commits + redrawKey, so we keep the
  // live drag price in a ref and only setState to reflect the in-flight value.
  const dragRef = useRef<null | 'tp' | 'sl' | 'time'>(null);
  const [livePrice, setLivePrice] = useState<{ kind: 'tp' | 'sl'; price: number } | null>(null);
  // Box width in BARS (logical units) so it scales with zoom and can extend
  // past the last bar. Persists across re-renders; resized via the right handle.
  const [widthBars, setWidthBars] = useState(50);

  const { side, entryPrice, entryTime, size, currentPrice, isPending } = model;
  const tickSize = model.tickSize && model.tickSize > 0 ? model.tickSize : 0.25;
  const dir = side === 'LONG' ? 1 : -1;

  // Effective SL/TP — real value if set, else a default offset so the band is
  // visible. Drag commits a real value on first interaction.
  const effTP =
    model.takeProfit ?? entryPrice * (1 + dir * DEFAULT_TP_FRAC);
  const effSL =
    model.stopLoss ?? entryPrice * (1 - dir * DEFAULT_SL_FRAC);

  // While dragging, override the relevant level with the in-flight price.
  const shownTP = livePrice?.kind === 'tp' ? livePrice.price : effTP;
  const shownSL = livePrice?.kind === 'sl' ? livePrice.price : effSL;

  // ─── Pixel coordinates (recomputed every render; redrawKey forces it) ──
  // redrawKey is referenced so React re-runs this body on pan/zoom/resize.
  void redrawKey;
  const yEntry = series.priceToCoordinate(entryPrice);
  const yTP = series.priceToCoordinate(shownTP);
  const ySL = series.priceToCoordinate(shownSL);

  // ─── Drag handling ──────────────────────────────────────────
  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const root = rootRef.current;
      const kind = dragRef.current;
      if (!root || !kind) return;
      const rect = root.getBoundingClientRect();

      // Right-edge handle → resize the box width in BAR (logical) units, so it
      // represents a time span that scales with zoom and can run past the last bar.
      if (kind === 'time') {
        const x = e.clientX - rect.left;
        const ts = chart.timeScale();
        const ex = ts.timeToCoordinate(entryTime as UTCTimestamp);
        if (ex == null) return;
        const entryLogical = ts.coordinateToLogical(ex);
        const dragLogical = ts.coordinateToLogical(x);
        if (entryLogical == null || dragLogical == null) return;
        setWidthBars(Math.max(3, Math.round((dragLogical as number) - (entryLogical as number))));
        return;
      }

      const localY = e.clientY - rect.top;
      const price = series.coordinateToPrice(localY);
      if (price == null || !Number.isFinite(price)) return;
      let p = Number(price);

      // Clamp so target stays on the profit side and stop on the loss side,
      // never crossing the entry (keep a small gap).
      const gap = tickSize;
      if (kind === 'tp') {
        p = side === 'LONG' ? Math.max(p, entryPrice + gap) : Math.min(p, entryPrice - gap);
        setLivePrice({ kind: 'tp', price: p });
      } else {
        p = side === 'LONG' ? Math.min(p, entryPrice - gap) : Math.max(p, entryPrice + gap);
        setLivePrice({ kind: 'sl', price: p });
      }
    },
    [series, chart, side, entryPrice, entryTime, tickSize],
  );

  const endDrag = useCallback(() => {
    const kind = dragRef.current;
    dragRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
    setLivePrice((cur) => {
      if (cur && kind === 'tp') onTakeProfitChange(cur.price);
      else if (cur && kind === 'sl') onStopLossChange(cur.price);
      return null;
    });
  }, [onPointerMove, onTakeProfitChange, onStopLossChange]);

  const startDrag = useCallback(
    (kind: 'tp' | 'sl' | 'time') => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = kind;
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', endDrag);
    },
    [onPointerMove, endDrag],
  );

  // Cleanup any dangling listeners on unmount.
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
    };
  }, [onPointerMove, endDrag]);

  // Keep the overlay glued to the chart even when ONLY the price scale changes.
  // Dragging the price axis (vertical zoom) fires no visible-time-range event,
  // so the host's redrawKey never bumps and the box would stay at stale Y's —
  // the "distortion" where the rectangle no longer matches the candles. A light
  // rAF loop re-renders only when the entry's pixel coords actually move, so it
  // catches price-scale + time + resize uniformly and stays idle when static.
  const [, forceRerender] = useState(0);
  useEffect(() => {
    let raf = 0;
    let prev = '';
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const y = series.priceToCoordinate(entryPrice);
      const x = chart.timeScale().timeToCoordinate(entryTime as UTCTimestamp);
      const key = `${y}|${x}`;
      if (key !== prev) {
        prev = key;
        forceRerender((n) => n + 1);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [series, chart, entryPrice, entryTime]);

  // Bail out cleanly if the chart can't place the entry (off-screen / pre-paint).
  if (yEntry == null || yTP == null || ySL == null) {
    return <div ref={rootRef} className="pointer-events-none absolute inset-0" />;
  }

  const widthPx = rootRef.current?.clientWidth ?? 0;
  // Anchor the band's left edge to the ENTRY BAR's x-coordinate so the box
  // scrolls with the chart (TradingView behaviour) instead of staying fixed on
  // screen. Recomputed every render via redrawKey (pan/zoom/resize). If the
  // entry scrolled off the left edge, clamp to 0 so the box still shows.
  const ts = chart.timeScale();
  const rawEntryX = ts.timeToCoordinate(entryTime as UTCTimestamp);
  const bandLeft = rawEntryX != null && Number.isFinite(rawEntryX) ? Math.max(0, Math.round(rawEntryX)) : 0;
  // Right edge anchored in LOGICAL (bar) space → the width is a TIME span that
  // scales with zoom and can extend past the last bar. Falls back to a pixel
  // width if logical coords aren't available (entry off-screen / pre-paint).
  let bandRight = bandLeft + Math.max(160, Math.min(520, Math.round(widthPx * 0.4)));
  if (rawEntryX != null && Number.isFinite(rawEntryX)) {
    const entryLogical = ts.coordinateToLogical(rawEntryX);
    if (entryLogical != null) {
      const rx = ts.logicalToCoordinate(((entryLogical as number) + widthBars) as Logical);
      if (rx != null && Number.isFinite(rx)) bandRight = rx as number;
    }
  }
  bandRight = Math.max(bandLeft + 60, Math.round(bandRight));
  const bandWidth = bandRight - bandLeft;

  // ─── Metrics (real data) ────────────────────────────────────
  const tpDelta = Math.abs(shownTP - entryPrice);
  const slDelta = Math.abs(shownSL - entryPrice);
  const tpAmount = tpDelta * size;
  const slAmount = slDelta * size;
  const tpPct = (tpDelta / entryPrice) * 100;
  const slPct = (slDelta / entryPrice) * 100;
  const tpTicks = Math.round(tpDelta / tickSize);
  const slTicks = Math.round(slDelta / tickSize);
  const rr = slAmount > 0 ? tpAmount / slAmount : 0;
  const openPnl =
    currentPrice != null && Number.isFinite(currentPrice)
      ? (currentPrice - entryPrice) * dir * size
      : null;

  const yEntryN = yEntry as number;
  const yTPN = yTP as number;
  const ySLN = ySL as number;

  // Zone rectangles (top y / height) between entry and the respective level.
  const tpTop = Math.min(yEntryN, yTPN);
  const tpHeight = Math.abs(yEntryN - yTPN);
  const slTop = Math.min(yEntryN, ySLN);
  const slHeight = Math.abs(yEntryN - ySLN);

  const labelBase =
    'pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-white shadow';
  const center = bandLeft + bandWidth / 2;

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {/* Target zone (green) */}
      <div
        className="absolute"
        style={{ left: bandLeft, width: bandWidth, top: tpTop, height: tpHeight, background: GREEN_FILL, borderTop: `1px solid ${GREEN}`, borderBottom: `1px solid ${GREEN}` }}
      />
      {/* Stop zone (red) */}
      <div
        className="absolute"
        style={{ left: bandLeft, width: bandWidth, top: slTop, height: slHeight, background: RED_FILL, borderTop: `1px solid ${RED}`, borderBottom: `1px solid ${RED}` }}
      />

      {/* Entry line */}
      <div
        className="absolute"
        style={{ left: bandLeft, width: bandWidth, top: yEntryN, height: 0, borderTop: `1px solid ${ENTRY_LINE}` }}
      />

      {/* Target label */}
      <div className={labelBase} style={{ left: center, top: yTPN - 18, background: GREEN }}>
        Target: {fmtPrice(tpDelta)} ({tpPct.toFixed(3)}%) {tpTicks}, Amount: {fmtAmount(tpAmount)}
      </div>
      {/* Stop label */}
      <div className={labelBase} style={{ left: center, top: ySLN + 6, background: RED }}>
        Stop: {fmtPrice(slDelta)} ({slPct.toFixed(3)}%) {slTicks}, Amount: {fmtAmount(slAmount)}
      </div>
      {/* Entry / Open P&L label */}
      <div
        className={`${labelBase} text-zinc-100`}
        style={{ left: center, top: yEntryN - 26, background: 'rgba(24,24,27,0.92)', border: `1px solid ${ENTRY_LINE}` }}
      >
        {isPending ? 'TRIGGER' : `Open P&L: ${openPnl != null ? fmtSigned(openPnl) : '—'}`}, Qty: {size}
        <br />
        Risk/reward ratio: {rr.toFixed(2)}
      </div>

      {/* Resize handles — TradingView layout: 3 on the LEFT (TP / entry / SL),
          1 on the RIGHT (time width). Blue, matching the reference. */}
      {/* Target — top-left: drag vertically → take-profit */}
      <div
        onPointerDown={startDrag('tp')}
        className="absolute cursor-ns-resize"
        style={{ left: bandLeft - HANDLE / 2, top: yTPN - HANDLE / 2, width: HANDLE, height: HANDLE, background: '#fff', border: `1.5px solid ${HANDLE_BLUE}`, borderRadius: 2, pointerEvents: 'auto' }}
      />
      {/* Entry — middle-left: anchor (entry price is the real fill, not draggable) */}
      <div
        className="absolute"
        style={{ left: bandLeft - HANDLE / 2, top: yEntryN - HANDLE / 2, width: HANDLE, height: HANDLE, background: '#fff', border: `1.5px solid ${HANDLE_BLUE}`, borderRadius: '50%', pointerEvents: 'none' }}
      />
      {/* Stop — bottom-left: drag vertically → stop-loss */}
      <div
        onPointerDown={startDrag('sl')}
        className="absolute cursor-ns-resize"
        style={{ left: bandLeft - HANDLE / 2, top: ySLN - HANDLE / 2, width: HANDLE, height: HANDLE, background: '#fff', border: `1.5px solid ${HANDLE_BLUE}`, borderRadius: 2, pointerEvents: 'auto' }}
      />
      {/* Time — middle-right: drag horizontally → extend / shorten the box in time */}
      <div
        onPointerDown={startDrag('time')}
        className="absolute cursor-ew-resize"
        style={{ left: bandRight - HANDLE / 2, top: yEntryN - HANDLE / 2, width: HANDLE, height: HANDLE, background: '#fff', border: `1.5px solid ${HANDLE_BLUE}`, borderRadius: 2, pointerEvents: 'auto' }}
      />
    </div>
  );
}

export default PositionBox;
