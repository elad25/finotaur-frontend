/**
 * OrderLinesOverlay — draggable SL/TP/pending-order lines over the replay chart.
 *
 * Renders an absolutely-positioned HTML overlay (matching the DrawingLayer
 * canvas stacking pattern) that shows:
 *   - Active position Entry  (gold,  display-only — historical fill)
 *   - Active position SL     (red,   draggable — clamps to valid side of entry)
 *   - Active position TP     (green, draggable — clamps to valid side of entry)
 *   - Each pending order trigger (amber, draggable)
 *   - Multi-leg TP lines      (green, draggable; dimmed once filled)
 *
 * Pointer-event handling:
 *   The outer container is pointer-events:none so chart pan/zoom and drawing
 *   tools pass through. Each line's hit zone is pointer-events:auto only while
 *   rendered. On pointer-down, setPointerCapture() keeps events flowing to
 *   that element even if the cursor drifts during a fast drag. Esc cancels.
 *
 * Drawing-tool gate:
 *   The parent passes `draggingEnabled` (true only in cursor mode) to suppress
 *   hit zones entirely when a draw tool is active, preventing order-drag from
 *   hijacking draw-create pointer events.
 *
 * Coordinate system:
 *   series.priceToCoordinate(price) → canvas-local Y.
 *   series.coordinateToPrice(y)     → price from canvas-local Y.
 *   The overlay div is absolute-inset-0 inside the same parent as the chart
 *   container, so getBoundingClientRect().top gives the offset to subtract
 *   from clientY to get canvas-local Y.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ISeriesApi } from 'lightweight-charts';
import type { PaperPosition, PendingOrder } from '@/hooks/useBacktestSession';

// ─── Types ────────────────────────────────────────────────────────

interface DragState {
  kind: 'sl' | 'tp' | 'pending' | 'tp_leg';
  /** Pending order id when kind === 'pending'. */
  pendingId?: string;
  /** TP leg id when kind === 'tp_leg'. */
  legId?: string;
  /** Live preview Y coordinate (canvas-local). */
  previewY: number;
  /** Price shown in the preview label. */
  previewPrice: number;
}

export interface OrderLinesOverlayProps {
  /** Candlestick series — used for priceToCoordinate / coordinateToPrice. */
  series: ISeriesApi<'Candlestick'> | null;
  /** Container div of the chart (overlay is positioned inside the same parent). */
  container: HTMLDivElement | null;
  /** Currently open paper position — SL/TP lines come from here. */
  activePosition?: PaperPosition;
  /** Pending orders — one draggable trigger line each. */
  pendingOrders: PendingOrder[];
  /** Bumped on every chart pan/zoom/resize so the overlay repaints pixel coords. */
  viewVersion: number;
  /**
   * When false (draw tool is active), all hit zones have pointer-events:none so
   * drawing creation is not intercepted. Set to true only in cursor mode.
   */
  draggingEnabled: boolean;
  /** Called when the user drops SL to a new price. */
  onUpdateSL: (price: number) => void;
  /** Called when the user drops TP to a new price. */
  onUpdateTP: (price: number) => void;
  /** Called when the user drops a pending order trigger line to a new price. */
  onUpdatePendingPrice: (orderId: string, price: number) => void;
  /**
   * Phase 7: Called when the user drags a multi-leg TP line to a new price.
   * legId — the TakeProfitLeg.id; price — the new target price.
   */
  onUpdateTpLeg?: (legId: string, price: number) => void;
}

// ─── Visual constants ─────────────────────────────────────────────

const COLOR = {
  entry: '#C9A646',   // brand gold — entry line (non-draggable)
  sl: '#ef4444',      // red
  tp: '#22c55e',      // green
  pending: '#f59e0b', // amber
  previewLine: 'rgba(255,255,255,0.30)',
} as const;

/** Half-height of the pointer hit zone per line (px). */
const HIT_ZONE_PX = 7;

// ─── Helper ───────────────────────────────────────────────────────

function priceToY(series: ISeriesApi<'Candlestick'>, price: number): number | null {
  const y = series.priceToCoordinate(price);
  return y == null ? null : y;
}

// ─── Sub-component: a single rendered line ────────────────────────

interface OrderLineProps {
  y: number;
  label: string;
  color: string;
  draggable: boolean;
  isPreview?: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
}

function OrderLine({ y, label, color, draggable, isPreview = false, onPointerDown }: OrderLineProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: y - HIT_ZONE_PX,
        left: 0,
        right: 0,
        height: HIT_ZONE_PX * 2,
        pointerEvents: draggable ? 'auto' : 'none',
        cursor: draggable ? 'ns-resize' : 'default',
        userSelect: 'none',
        zIndex: isPreview ? 20 : 10,
      }}
      onPointerDown={draggable ? onPointerDown : undefined}
    >
      {/* Visible line */}
      <div
        style={{
          position: 'absolute',
          top: HIT_ZONE_PX - 1,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: isPreview ? COLOR.previewLine : color,
          opacity: isPreview ? 0.6 : 1,
          borderTop: isPreview ? `1px dashed ${color}` : 'none',
          pointerEvents: 'none',
        }}
      />
      {/* Price label */}
      <div
        style={{
          position: 'absolute',
          top: HIT_ZONE_PX - 9,
          right: 68,
          background: color,
          color: '#000',
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: '16px',
          padding: '0 5px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: isPreview ? 0.75 : 1,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export function OrderLinesOverlay({
  series,
  container,
  activePosition,
  pendingOrders,
  viewVersion,
  draggingEnabled,
  onUpdateSL,
  onUpdateTP,
  onUpdatePendingPrice,
  onUpdateTpLeg,
}: OrderLinesOverlayProps) {
  // Force a repaint whenever positions, orders, or the chart view changes.
  const [, forceRepaint] = useState(0);
  useEffect(() => {
    forceRepaint((n) => n + 1);
  }, [viewVersion, activePosition, pendingOrders]);

  const [drag, setDrag] = useState<DragState | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Convert clientY → canvas-local Y using the overlay's bounding rect.
  const clientToLocalY = useCallback((clientY: number): number => {
    if (!overlayRef.current) return 0;
    return clientY - overlayRef.current.getBoundingClientRect().top;
  }, []);

  // Clamp a price to the valid side of the active entry.
  // LONG → SL < entry < TP; SHORT → SL > entry > TP.
  const clampPrice = useCallback((price: number, kind: 'sl' | 'tp' | 'tp_leg'): number => {
    if (!activePosition) return price;
    const entry = activePosition.entryPrice;
    if (activePosition.side === 'LONG') {
      return kind === 'sl' ? Math.min(price, entry) : Math.max(price, entry);
    }
    // SHORT: SL above entry, TP below entry.
    return kind === 'sl' ? Math.max(price, entry) : Math.min(price, entry);
  }, [activePosition]);

  // ─── Drag handlers ─────────────────────────────────────────────

  const startDrag = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
    kind: DragState['kind'],
    initialPrice: number,
    pendingId?: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const y = clientToLocalY(e.clientY);
    setDrag({ kind, pendingId, previewY: y, previewPrice: initialPrice });
  }, [clientToLocalY]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || !series) return;
    const y = clientToLocalY(e.clientY);
    const rawPrice = series.coordinateToPrice(y);
    if (rawPrice == null || !Number.isFinite(rawPrice)) return;
    const price =
      drag.kind === 'sl' || drag.kind === 'tp' || drag.kind === 'tp_leg'
        ? clampPrice(rawPrice, drag.kind === 'tp_leg' ? 'tp_leg' : drag.kind)
        : rawPrice;
    setDrag((d) => d ? { ...d, previewY: y, previewPrice: price } : null);
  }, [drag, series, clientToLocalY, clampPrice]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    const finalPrice = drag.previewPrice;
    if (drag.kind === 'sl') {
      onUpdateSL(finalPrice);
    } else if (drag.kind === 'tp') {
      onUpdateTP(finalPrice);
    } else if (drag.kind === 'pending' && drag.pendingId) {
      onUpdatePendingPrice(drag.pendingId, finalPrice);
    } else if (drag.kind === 'tp_leg' && drag.legId && onUpdateTpLeg) {
      onUpdateTpLeg(drag.legId, finalPrice);
    }
    setDrag(null);
  }, [drag, onUpdateSL, onUpdateTP, onUpdatePendingPrice, onUpdateTpLeg]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && drag) {
      setDrag(null);
    }
  }, [drag]);

  // ─── Render ────────────────────────────────────────────────────

  if (!series || !container) return null;

  const lines: React.ReactNode[] = [];

  // Active position lines
  if (activePosition) {
    // Entry — always display-only (historical fill is immutable)
    const entryY = priceToY(series, activePosition.entryPrice);
    if (entryY != null && entryY > 0) {
      lines.push(
        <OrderLine
          key="entry"
          y={entryY}
          label={`Entry ${activePosition.entryPrice.toFixed(2)}`}
          color={COLOR.entry}
          draggable={false}
        />,
      );
    }

    // SL line
    if (activePosition.stopLoss != null) {
      const slY = drag?.kind === 'sl'
        ? drag.previewY
        : priceToY(series, activePosition.stopLoss);
      const slPrice = drag?.kind === 'sl' ? drag.previewPrice : activePosition.stopLoss;
      if (slY != null && slY > 0) {
        lines.push(
          <OrderLine
            key="sl"
            y={slY}
            label={`SL ${slPrice.toFixed(2)}`}
            color={COLOR.sl}
            draggable={draggingEnabled}
            isPreview={drag?.kind === 'sl'}
            onPointerDown={(e) => startDrag(e, 'sl', activePosition.stopLoss!)}
          />,
        );
      }
    }

    // Single TP line — rendered only when no multi-leg TP schedule is set.
    const hasMultiLeg = (activePosition.takeProfits ?? []).length > 0;
    if (!hasMultiLeg && activePosition.takeProfit != null) {
      const tpY = drag?.kind === 'tp'
        ? drag.previewY
        : priceToY(series, activePosition.takeProfit);
      const tpPrice = drag?.kind === 'tp' ? drag.previewPrice : activePosition.takeProfit;
      if (tpY != null && tpY > 0) {
        lines.push(
          <OrderLine
            key="tp"
            y={tpY}
            label={`TP ${tpPrice.toFixed(2)}`}
            color={COLOR.tp}
            draggable={draggingEnabled}
            isPreview={drag?.kind === 'tp'}
            onPointerDown={(e) => startDrag(e, 'tp', activePosition.takeProfit!)}
          />,
        );
      }
    }

    // Multi-leg TP lines — rendered when takeProfits[] is set.
    // Filled legs are dimmed and non-draggable (already executed).
    if (hasMultiLeg) {
      (activePosition.takeProfits ?? []).forEach((leg, idx) => {
        const isDraggingLeg = drag?.kind === 'tp_leg' && drag.legId === leg.id;
        const legY = isDraggingLeg
          ? drag.previewY
          : priceToY(series, leg.price);
        const legPrice = isDraggingLeg ? drag.previewPrice : leg.price;
        if (legY == null || legY <= 0) return;
        const legLabel = `TP${idx + 1} ${leg.sizePercent.toFixed(0)}% @ ${legPrice.toFixed(2)}`;
        // Filled legs are dimmed (opacity via isPreview flag reuse is not ideal,
        // so we inline the style override via a key suffix and the opacity on OrderLine).
        // We pass draggable=false for filled legs so they cannot be re-dragged.
        const isDraggable = draggingEnabled && !leg.filled && !!onUpdateTpLeg;
        lines.push(
          <OrderLine
            key={`tp_leg_${leg.id}`}
            y={legY}
            label={legLabel}
            color={leg.filled ? 'rgba(34,197,94,0.4)' : COLOR.tp}
            draggable={isDraggable}
            isPreview={isDraggingLeg}
            onPointerDown={isDraggable ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
              const y = clientToLocalY(e.clientY);
              setDrag({ kind: 'tp_leg', legId: leg.id, previewY: y, previewPrice: leg.price });
            } : undefined}
          />,
        );
      });
    }
  }

  // Pending order trigger lines are now rendered exclusively as NinjaTrader-style
  // price lines + pill tags inside BacktestReplayChart. The loop below is removed
  // to avoid duplication. The prop + drag machinery for 'pending' kind are kept
  // intact (harmless) to avoid interface churn.
  void pendingOrders;

  if (lines.length === 0 && !drag) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        inset: 0,
        // While dragging: capture pointer-move globally so we don't lose the drag
        // on a fast mouse sweep. Otherwise: pointer-events:none so chart pan/zoom
        // and drawing tools pass through untouched.
        pointerEvents: drag ? 'auto' : 'none',
        zIndex: 15, // above DrawingLayer canvas (z-10), below context menu (z-110)
      }}
      onPointerMove={drag ? handlePointerMove : undefined}
      onPointerUp={drag ? handlePointerUp : undefined}
      onKeyDown={handleKeyDown}
      // tabIndex enables keyboard events (Esc to cancel drag)
      tabIndex={drag ? 0 : -1}
    >
      {lines}
    </div>
  );
}

export default OrderLinesOverlay;
