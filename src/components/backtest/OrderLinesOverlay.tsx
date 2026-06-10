/**
 * OrderLinesOverlay — DOM-layer draggable TP leg indicators.
 *
 * Renders absolute-positioned horizontal "line + label + drag handle"
 * elements over the chart canvas. Each TP leg becomes a draggable row.
 *
 * Design decisions:
 *   - We do NOT duplicate lightweight-charts price-line drawing here.
 *     BacktestReplayChart adds native price lines (via series.createPriceLine)
 *     for TP legs in its own useEffect — those are the visible chart lines.
 *     This overlay adds drag handles on top so the user can reposition legs.
 *   - The parent passes `priceToCoordinate` and `coordinateToPrice` obtained
 *     from the series ref inside BacktestReplayChart. Without these the
 *     overlay renders nothing (graceful degradation).
 *   - Clamping: LONG positions require leg.price > entryPrice; SHORT
 *     positions require leg.price < entryPrice. Same rule as BacktestChart's
 *     existing single-TP clamp. Filled legs are rendered dimmed and
 *     non-draggable.
 *   - Single-TP backward compat: if `activePosition.takeProfits` is empty
 *     but `activePosition.takeProfit` is set, we synthesize a display-only
 *     entry (no drag, since there's no leg id to report back).
 *
 * Props:
 *   priceToCoordinate  (price: number) => number | null  — series helper
 *   coordinateToPrice  (y: number) => number | null      — series helper
 *   containerHeight    number                             — chart div height px
 *   activePosition     PaperPosition | undefined
 *   onLegPriceChange   (legId: string, price: number) => void  — drag callback
 *
 * Caller:
 *   BacktestReplayChart renders this as a sibling of its chart container
 *   (absolute inset-0 z-10) and passes the series conversion callbacks via
 *   an imperative handle pattern (see BacktestReplayChart).
 */

import { useCallback, useRef } from 'react';
import type { PaperPosition } from '@/hooks/useBacktestSession';
import type { TakeProfitLeg } from '@/lib/backtest/orderEngine';

// ─── Props ────────────────────────────────────────────────────────

export interface OrderLinesOverlayProps {
  /** Converts a price to a y-coordinate in the chart container. */
  priceToCoordinate: (price: number) => number | null;
  /** Converts a y-coordinate in the chart container to a price. */
  coordinateToPrice: (y: number) => number | null;
  /** Total height of the chart container in pixels. */
  containerHeight: number;
  /** Currently open position (or undefined if flat). */
  activePosition: PaperPosition | undefined;
  /** Called when user finishes dragging a TP leg to a new price. */
  onLegPriceChange: (legId: string, newPrice: number) => void;
}

// ─── Component ───────────────────────────────────────────────────

export function OrderLinesOverlay({
  priceToCoordinate,
  coordinateToPrice,
  containerHeight,
  activePosition,
  onLegPriceChange,
}: OrderLinesOverlayProps) {
  // Track which leg is currently being dragged.
  const draggingRef = useRef<{ legId: string; startY: number } | null>(null);
  // Ref on the overlay root div — used in mouseup to get bounding rect
  // without traversing the DOM via closest().
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ── Build display legs ─────────────────────────────────────────

  // Prefer the normalized `takeProfits` array. Fall back to the legacy
  // single `takeProfit` field for backward compat.
  const displayLegs: Array<TakeProfitLeg & { displayOnly?: boolean }> = (() => {
    if (!activePosition) return [];
    if (activePosition.takeProfits && activePosition.takeProfits.length > 0) {
      return activePosition.takeProfits;
    }
    if (activePosition.takeProfit != null) {
      // Synthesize a display-only entry — no drag since there's no leg id.
      return [{
        id: '__legacy_tp__',
        price: activePosition.takeProfit,
        sizePercent: 100,
        filled: false,
        displayOnly: true,
      }];
    }
    return [];
  })();

  // ── Drag handlers ─────────────────────────────────────────────

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    legId: string,
  ) => {
    e.preventDefault();
    draggingRef.current = { legId, startY: e.clientY };

    // AbortController ensures both listeners are always removed when the drag
    // ends, regardless of which early-return path is taken in mouseup.
    const abort = new AbortController();
    const { signal } = abort;

    const handleMouseUp = (ue: MouseEvent) => {
      // Always clean up listeners first — no early return before this.
      abort.abort();

      if (!draggingRef.current) return;
      const { legId: id } = draggingRef.current;
      draggingRef.current = null;

      // Resolve the mouse position relative to the chart container using
      // the containerRef — no DOM traversal needed.
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const localY = ue.clientY - rect.top;

      const rawPrice = coordinateToPrice(localY);
      if (rawPrice == null || !activePosition) return;

      // Clamp: LONG needs price above entry; SHORT needs price below.
      let clampedPrice = rawPrice;
      if (activePosition.side === 'LONG') {
        clampedPrice = Math.max(rawPrice, activePosition.entryPrice + 0.01);
      } else {
        clampedPrice = Math.min(rawPrice, activePosition.entryPrice - 0.01);
      }

      // Skip if this is a display-only synthetic leg.
      if (id !== '__legacy_tp__') {
        onLegPriceChange(id, clampedPrice);
      }
    };

    // No mousemove listener needed — the final position is read from mouseup
    // clientY directly (no live visual feedback during drag).
    window.addEventListener('mouseup', handleMouseUp, { signal });
  }, [activePosition, coordinateToPrice, onLegPriceChange]);

  // ── Render ────────────────────────────────────────────────────

  if (!activePosition || displayLegs.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="order-lines-overlay-root pointer-events-none absolute inset-0 z-10"
      style={{ height: containerHeight }}
    >
      {displayLegs.map((leg, idx) => {
        const y = priceToCoordinate(leg.price);
        if (y == null || y < 0 || y > containerHeight) return null;

        const isDraggable = !leg.filled && !leg.displayOnly;
        const isFilled = leg.filled;

        return (
          <div
            key={leg.id}
            className="absolute left-0 right-0"
            style={{ top: y }}
          >
            {/* The horizontal line */}
            <div
              className={`h-px w-full ${isFilled ? 'bg-emerald-700/30' : 'bg-emerald-500/50'}`}
              style={{ borderTop: isFilled ? '1px dashed rgba(52,211,153,0.25)' : '1px dashed rgba(52,211,153,0.55)' }}
            />

            {/* Label + drag handle (pointer-events enabled on handle only) */}
            <div
              className={`absolute right-2 flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-semibold ${
                isFilled
                  ? 'border-zinc-800 bg-zinc-900/70 text-zinc-600'
                  : 'border-emerald-800/50 bg-[#08080a]/80 text-emerald-400'
              } ${isDraggable ? 'pointer-events-auto cursor-ns-resize select-none' : 'pointer-events-none'}`}
              style={{ top: -10 }}
              onMouseDown={isDraggable ? (e) => handleMouseDown(e, leg.id) : undefined}
              title={isDraggable ? 'Drag to reposition TP' : undefined}
            >
              {isFilled ? (
                <span className="line-through">
                  TP{idx + 1} {leg.sizePercent}% @ {leg.price.toFixed(2)} ✓
                </span>
              ) : (
                <>
                  TP{idx + 1} {leg.sizePercent}% @ {leg.price.toFixed(2)}
                  {isDraggable && (
                    <span className="text-zinc-600">⠿</span>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default OrderLinesOverlay;
