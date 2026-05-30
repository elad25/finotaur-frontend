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
import type { IChartApi, ISeriesApi } from 'lightweight-charts';

// ═══════════════════════════════════════════════════════════════
// Model + props
// ═══════════════════════════════════════════════════════════════
export interface PositionBoxModel {
  /** Direction. LONG → profit above entry, loss below; SHORT → inverted. */
  side: 'LONG' | 'SHORT';
  /** Entry price (active position) or trigger price (pending order). */
  entryPrice: number;
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
const HANDLE = 8; // px — square handle half is 4

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

  // Horizontal placement of the band, as a fraction of container width [0..1]
  // of the band's left edge. Cosmetic only — survives resize.
  const [bandLeftFrac, setBandLeftFrac] = useState(0.52);

  // Drag state: which handle is active. Re-renders are driven by the commits +
  // redrawKey, so we keep the live drag price in a ref and only setState to
  // reflect the in-flight value for a snappy label.
  const dragRef = useRef<null | 'tp' | 'sl' | 'move'>(null);
  const [livePrice, setLivePrice] = useState<{ kind: 'tp' | 'sl'; price: number } | null>(null);

  const { side, entryPrice, size, currentPrice, isPending } = model;
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

      if (kind === 'move') {
        const x = e.clientX - rect.left;
        const frac = Math.min(0.92, Math.max(0, x / Math.max(rect.width, 1)));
        setBandLeftFrac(frac);
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
    [series, side, entryPrice, tickSize],
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
    (kind: 'tp' | 'sl' | 'move') => (e: React.PointerEvent) => {
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

  // Bail out cleanly if the chart can't place the entry (off-screen / pre-paint).
  if (yEntry == null || yTP == null || ySL == null) {
    return <div ref={rootRef} className="pointer-events-none absolute inset-0" />;
  }

  const widthPx = rootRef.current?.clientWidth ?? 0;
  const bandLeft = Math.round(bandLeftFrac * widthPx);
  const bandWidth = Math.max(180, Math.min(420, Math.round(widthPx * 0.4)));

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

      {/* Drag handles (pointer-events enabled) */}
      {/* Target handle — square on the target line */}
      <div
        onPointerDown={startDrag('tp')}
        className="absolute cursor-ns-resize rounded-sm"
        style={{ left: bandLeft - HANDLE / 2, top: yTPN - HANDLE / 2, width: HANDLE, height: HANDLE, background: '#fff', border: `1px solid ${GREEN}`, pointerEvents: 'auto' }}
      />
      <div
        onPointerDown={startDrag('tp')}
        className="absolute cursor-ns-resize rounded-sm"
        style={{ left: bandLeft + bandWidth - HANDLE / 2, top: yTPN - HANDLE / 2, width: HANDLE, height: HANDLE, background: '#fff', border: `1px solid ${GREEN}`, pointerEvents: 'auto' }}
      />
      {/* Stop handle — square on the stop line */}
      <div
        onPointerDown={startDrag('sl')}
        className="absolute cursor-ns-resize rounded-sm"
        style={{ left: bandLeft - HANDLE / 2, top: ySLN - HANDLE / 2, width: HANDLE, height: HANDLE, background: '#fff', border: `1px solid ${RED}`, pointerEvents: 'auto' }}
      />
      <div
        onPointerDown={startDrag('sl')}
        className="absolute cursor-ns-resize rounded-sm"
        style={{ left: bandLeft + bandWidth - HANDLE / 2, top: ySLN - HANDLE / 2, width: HANDLE, height: HANDLE, background: '#fff', border: `1px solid ${RED}`, pointerEvents: 'auto' }}
      />
      {/* Entry move handle — circle, drag to reposition band horizontally */}
      <div
        onPointerDown={startDrag('move')}
        className="absolute cursor-move rounded-full"
        style={{ left: bandLeft - 5, top: yEntryN - 5, width: 10, height: 10, background: '#fff', border: `2px solid ${ENTRY_LINE}`, pointerEvents: 'auto' }}
      />
    </div>
  );
}

export default PositionBox;
