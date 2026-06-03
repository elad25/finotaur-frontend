/**
 * OrderLinesOverlay — draggable order/SL/TP lines over the replay chart.
 *
 * Renders an absolutely-positioned HTML overlay (matching the DrawingLayer
 * canvas stacking pattern) that shows:
 *   - Active position SL  (red,   draggable — clamps to valid side of entry)
 *   - Active position TP  (green, draggable — clamps to valid side of entry)
 *   - Active position Entry (gold, display-only — filled entry is historical)
 *   - Each pending order trigger (amber, draggable)
 *
 * Pointer-event handling:
 *   The outer container is pointer-events:none so chart pan/zoom passes through.
 *   Each line's hit zone div is pointer-events:auto only while it's rendered.
 *   On pointer-down over a hit zone, setPointerCapture() keeps events flowing
 *   to that element even if the cursor leaves it during the drag. Esc or
 *   pointer-up without movement cancels gracefully.
 *
 * Coordinate system:
 *   series.priceToCoordinate(price) → canvas-local Y in the chart.
 *   series.coordinateToPrice(y)     → price from canvas-local Y.
 *   The overlay div is absolute-inset-0 inside the same parent as the chart
 *   container, so getBoundingClientRect().top gives us the offset to subtract
 *   from clientY to get canvas-local Y.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ISeriesApi } from 'lightweight-charts';
import type { PaperPosition, PendingOrder } from '@/hooks/useBacktestSession';

// ─── Types ────────────────────────────────────────────────────────

interface DragState {
  kind: 'sl' | 'tp' | 'pending';
  /** Pending order id when kind === 'pending'. */
  pendingId?: string;
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
  /** Pending orders — one draggable line each. */
  pendingOrders: PendingOrder[];
  /** Bumped on every chart pan/zoom so the overlay repaints. */
  viewVersion: number;
  /** Called when the user drops SL to a new price. */
  onUpdateSL: (price: number) => void;
  /** Called when the user drops TP to a new price. */
  onUpdateTP: (price: number) => void;
  /** Called when the user drops a pending order line to a new trigger price. */
  onUpdatePendingPrice: (orderId: string, price: number) => void;
}

// ─── Visual constants ─────────────────────────────────────────────

const COLOR = {
  entry: '#C9A646',   // brand gold — entry line (non-draggable)
  sl: '#ef4444',      // red
  tp: '#22c55e',      // green
  pending: '#f59e0b', // amber
  previewStroke: 'rgba(255,255,255,0.25)',
} as const;

/** Vertical half-height of the clickable hit zone per line. */
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
          backgroundColor: isPreview ? COLOR.previewStroke : color,
          opacity: isPreview ? 0.6 : 1,
          borderTop: isPreview ? `1px dashed ${color}` : 'none',
          pointerEvents: 'none',
        }}
      />
      {/* Label */}
      <div
        style={{
          position: 'absolute',
          top: HIT_ZONE_PX - 9,
          right: 64,
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
          opacity: isPreview ? 0.7 : 1,
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
  onUpdateSL,
  onUpdateTP,
  onUpdatePendingPrice,
}: OrderLinesOverlayProps) {
  // Recompute pixel positions whenever prices change or view pans/zooms.
  // We track a tick counter so we can force a re-render even when the series
  // ref is stable but the coordinate mapping has changed (pan/zoom).
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
  const clampPrice = useCallback((price: number, kind: 'sl' | 'tp'): number => {
    if (!activePosition) return price;
    const entry = activePosition.entryPrice;
    if (activePosition.side === 'LONG') {
      return kind === 'sl' ? Math.min(price, entry) : Math.max(price, entry);
    } else {
      // SHORT: SL must be above entry, TP must be below entry.
      return kind === 'sl' ? Math.max(price, entry) : Math.min(price, entry);
    }
  }, [activePosition]);

  // ─── Drag handlers ─────────────────────────────────────────────

  const startDrag = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
    kind: DragState['kind'],
    initialPrice: number,
    pendingId?: string,
  ) => {
    e.preventDefault();
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
      drag.kind === 'sl' || drag.kind === 'tp'
        ? clampPrice(rawPrice, drag.kind)
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
    }
    setDrag(null);
  }, [drag, onUpdateSL, onUpdateTP, onUpdatePendingPrice]);

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
    // Entry — always static (historical, not draggable)
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
            draggable
            isPreview={drag?.kind === 'sl'}
            onPointerDown={(e) => startDrag(e, 'sl', activePosition.stopLoss!)}
          />,
        );
      }
    }

    // TP line
    if (activePosition.takeProfit != null) {
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
            draggable
            isPreview={drag?.kind === 'tp'}
            onPointerDown={(e) => startDrag(e, 'tp', activePosition.takeProfit!)}
          />,
        );
      }
    }
  }

  // Pending order lines
  for (const order of pendingOrders) {
    const isDraggingThis = drag?.kind === 'pending' && drag.pendingId === order.id;
    const pendingY = isDraggingThis
      ? drag.previewY
      : priceToY(series, order.triggerPrice);
    const pendingPrice = isDraggingThis ? drag.previewPrice : order.triggerPrice;
    if (pendingY == null || pendingY <= 0) continue;
    const sideLabel = order.side === 'LONG' ? 'BUY' : 'SELL';
    lines.push(
      <OrderLine
        key={`pending-${order.id}`}
        y={pendingY}
        label={`${sideLabel} ${order.type} ${pendingPrice.toFixed(2)}`}
        color={COLOR.pending}
        draggable
        isPreview={isDraggingThis}
        onPointerDown={(e) => startDrag(e, 'pending', order.triggerPrice, order.id)}
      />,
    );
  }

  // If nothing to show, skip mounting
  if (lines.length === 0 && !drag) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: drag ? 'auto' : 'none',
        zIndex: 15, // above DrawingLayer canvas (z-10-ish), below context menu (z-110)
      }}
      onPointerMove={drag ? handlePointerMove : undefined}
      onPointerUp={drag ? handlePointerUp : undefined}
      onKeyDown={handleKeyDown}
      // tabIndex allows keyboard events (Esc to cancel)
      tabIndex={drag ? 0 : -1}
    >
      {lines}
    </div>
  );
}

export default OrderLinesOverlay;
