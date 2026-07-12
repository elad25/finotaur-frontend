/**
 * DomLadder — Trading Arena DOM tab's price ladder (Depth-Of-Market view).
 *
 * Renders as HTML rows (not canvas) so bid/ask cells stay clickable for
 * one-click paper limit orders — matches the click-to-trade UX pattern
 * PaperTradeRail.tsx's "Buy Bid" / "Sell Ask" buttons establish, just
 * row-addressable instead of top-of-book only.
 *
 * Columns left → right: Volume (session histogram) | Bids | Price |
 * Trades (rolling 5s buy/sell) | Asks.
 *
 * Update model: ONE setInterval at preferences.updateMs reads getBook() +
 * drainTrades() and computes the full row model in a single setState — no
 * rAF loop, no busy loop. getBook()/drainTrades() are the SAME stable
 * accessors DomTab's chosen order-book hook (useBinanceOrderBook /
 * useNt8OrderBook) exposes; this component must be the ONLY consumer
 * draining trades for the book's lifetime — drainTrades() empties a
 * ring buffer (see those hooks' own header comments).
 *
 * Tick size is inferred once from the book's own price granularity (the
 * minimum positive gap between adjacent sampled top-of-book price levels)
 * and then held stable in a ref — later samples may only SHRINK it (a
 * thinner sample never widens an already-inferred finer tick), so the
 * ladder's row grid never jitters between ticks.
 *
 * Rows are NOT one-tick-each — each row spans `rowSize` (preferences.rowSize:
 * 'auto' or a tick multiple; see domLadderMath.ts computeAutoRowSize / the
 * useDomPreferences.ts field doc). Book levels, session volume, and rolling
 * trades are all bucketed into rowSize-wide buckets by integer index
 * (priceToRowIndex/rowIndexToPrice), which is also what keeps row prices
 * float-drift-free (no more `64178.15996638`-style garbage).
 *
 * The number of RENDERED rows is decoupled from `preferences.depthCount`:
 * a ResizeObserver measures the ladder body and fills it (clamped to a sane
 * max), while `depthCount` only bounds the price WINDOW of raw book levels
 * that get aggregated per side — rows outside that window simply render
 * empty, same as a real DOM when resting liquidity doesn't reach that deep.
 *
 * Auto-center is paused while the pointer is over the ladder (and for a
 * short grace period after it leaves) so a click never lands on a
 * just-recentered row — see `isHoveredRef`/`hoverPauseUntilRef` below.
 *
 * All other preferences (depthCount, autoCenter, etc.) are read through refs
 * mirrored on every render rather than as interval deps, so tweaking a
 * setting takes effect on the NEXT tick without tearing down the
 * session-volume / recent-trades accumulators — only preferences.updateMs
 * (the throttle itself) restarts the interval.
 */

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import type { WheelEvent as ReactWheelEvent } from 'react';
import type { Trade, BookStatus } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import type { PendingOrder } from '@/hooks/useBacktestSession';
import type { DomPreferences } from '../hooks/useDomPreferences';
import {
  inferTickSize,
  decimalsForStep,
  priceToRowIndex,
  rowIndexToPrice,
  resolveRowSizeDollars,
  formatLadderPrice,
} from './domLadderMath';

export interface DomLadderProps {
  getBook: () => { bids: Map<number, number>; asks: Map<number, number> };
  drainTrades: () => Trade[];
  lastPrice: number | null;
  status: BookStatus;
  preferences: DomPreferences;
  /** Working paper orders — badges render on whichever row their triggerPrice falls on. */
  pendingOrders: PendingOrder[];
  onPlaceLimit: (side: 'LONG' | 'SHORT', price: number) => void;
  onCancelOrder: (orderId: string) => void;
  pricePrecision?: number;
}

// ── Palette — reuses the exact bid/ask + buy/sell colors already
// established by DepthProfileGutter.tsx (resting book) and PaperTradeRail.tsx
// (executed trades), so the ladder reads consistently against its sibling
// Liquidity tab and the paper-trading rail. ────────────────────────────────
const BID_COLOR = 'rgba(34, 197, 94, 0.75)';   // emerald-500 — resting bids
const ASK_COLOR = 'rgba(220, 38, 38, 0.75)';   // red-600 — resting asks
const BUY_COLOR = '#3ddc9a';                    // executed buy aggression
const SELL_COLOR = '#ff6b93';                   // executed sell aggression
const GOLD = '#C9A646';

const RECENT_TRADE_WINDOW_MS = 5_000;
const MANUAL_SCROLL_PAUSE_MS = 5_000;
/** Grace period after the pointer leaves the ladder before auto-center may resume (fix: click-to-order race). */
const HOVER_RECENTER_PAUSE_MS = 3_000;
const ROW_GRID_COLUMNS_WITH_VOL = '56px 1fr 76px 64px 1fr';
const ROW_GRID_COLUMNS_NO_VOL = '0px 1fr 76px 64px 1fr';
/** Must match DomRowView's fixed row height below. */
const ROW_HEIGHT_PX = 19;
const MIN_RENDERED_ROWS = 11;
const MAX_RENDERED_ROWS = 120;

interface DomRowModel {
  idx: number;
  price: number;
  isCenter: boolean;
  bidQty: number;
  askQty: number;
  sessionQty: number;
  buyQty5s: number;
  sellQty5s: number;
  bidOrders: PendingOrder[];
  askOrders: PendingOrder[];
}

const EMPTY_ORDERS: PendingOrder[] = [];

// ─── Pure helpers ────────────────────────────────────────────────────────
// Tick inference / row-size math lives in domLadderMath.ts (independently
// unit-tested) — imported above. Only display-only formatting stays local.

/** K/M-minimized size formatting, 1 decimal — blank for zero/empty rows. */
function formatQty(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return n.toFixed(1);
  return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

// ─── Row view — memoized, primitive props only, so an unchanged row (same
// values, new array reference from the tick's fresh row model) skips a
// re-render under React.memo's default shallow-equality check. Iterated
// with key={price} (each idx/price is unique within a window). ────────────

interface DomRowViewProps {
  price: number;
  pricePrecision: number;
  isCenter: boolean;
  showCenterLine: boolean;
  bidQty: number;
  askQty: number;
  maxSideQty: number;
  sessionQty: number;
  maxSessionQty: number;
  showVolumeHistogram: boolean;
  buyQty5s: number;
  sellQty5s: number;
  bidOrders: PendingOrder[];
  askOrders: PendingOrder[];
  onPlaceBid: (price: number) => void;
  onPlaceAsk: (price: number) => void;
  onCancelOrder: (orderId: string) => void;
}

const DomRowView = memo(function DomRowView({
  price,
  pricePrecision,
  isCenter,
  showCenterLine,
  bidQty,
  askQty,
  maxSideQty,
  sessionQty,
  maxSessionQty,
  showVolumeHistogram,
  buyQty5s,
  sellQty5s,
  bidOrders,
  askOrders,
  onPlaceBid,
  onPlaceAsk,
  onCancelOrder,
}: DomRowViewProps) {
  const bidPct = maxSideQty > 0 ? Math.min(100, (bidQty / maxSideQty) * 100) : 0;
  const askPct = maxSideQty > 0 ? Math.min(100, (askQty / maxSideQty) * 100) : 0;
  const volPct = maxSessionQty > 0 ? Math.min(100, (sessionQty / maxSessionQty) * 100) : 0;
  const priceLabel = formatLadderPrice(price, pricePrecision);

  // Multiple working orders can land on the same row (rare — usually one).
  // Aggregate into ONE badge (sum of sizes); clicking cancels the oldest one
  // — a deliberate v1 simplification to keep the row compact.
  const bidBadgeQty = bidOrders.reduce((acc, o) => acc + o.size, 0);
  const askBadgeQty = askOrders.reduce((acc, o) => acc + o.size, 0);

  return (
    <div
      className="grid items-center text-[10.5px] leading-none"
      style={{
        gridTemplateColumns: showVolumeHistogram ? ROW_GRID_COLUMNS_WITH_VOL : ROW_GRID_COLUMNS_NO_VOL,
        height: '19px',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        ...(isCenter && showCenterLine
          ? { borderTop: `1px solid ${GOLD}`, borderBottomColor: GOLD, background: 'rgba(201,166,70,0.06)' }
          : {}),
      }}
    >
      {/* Volume histogram */}
      {showVolumeHistogram && (
        <div
          className="relative h-full overflow-hidden px-1"
          title={sessionQty > 0 ? `Session vol ${formatQty(sessionQty)}` : undefined}
        >
          <div
            className="absolute right-0 top-0 h-full"
            style={{ width: `${volPct}%`, background: 'rgba(201,166,70,0.22)' }}
            aria-hidden="true"
          />
          <span className="relative text-[9px] text-[#707070]">{formatQty(sessionQty)}</span>
        </div>
      )}

      {/* Bid cell — click places a LONG limit at this row's price */}
      <button
        type="button"
        onClick={() => onPlaceBid(price)}
        className="group relative flex h-full items-center justify-end overflow-hidden px-1.5 text-right"
        title={`Buy limit @ ${priceLabel}`}
      >
        <div
          className="absolute right-0 top-0 h-full"
          style={{ width: `${bidPct}%`, background: BID_COLOR, opacity: 0.28 }}
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute left-1.5 text-[10px] font-semibold opacity-0 transition-opacity duration-100 group-hover:opacity-70"
          style={{ color: BID_COLOR }}
          aria-hidden="true"
        >
          +
        </span>
        <span className="relative font-semibold tabular-nums" style={{ color: bidQty > 0 ? '#7fe3ab' : '#454545' }}>
          {formatQty(bidQty)}
        </span>
        {bidOrders.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onCancelOrder(bidOrders[0].id);
            }}
            title="Click to cancel"
            className="relative ml-1.5 rounded border px-1 py-0.5 text-[9px] font-bold"
            style={{ borderColor: 'rgba(201,166,70,0.45)', background: 'rgba(201,166,70,0.16)', color: GOLD }}
          >
            {`B ${formatQty(bidBadgeQty)}`}
          </span>
        )}
      </button>

      {/* Price */}
      <div
        className="flex h-full items-center justify-center font-bold tabular-nums"
        style={{ color: isCenter ? GOLD : '#C0C0C0' }}
      >
        {priceLabel}
      </div>

      {/* Trades — rolling 5s buy × sell split */}
      <div className="flex h-full items-center justify-center gap-0.5 tabular-nums">
        <span className="text-[9.5px] font-semibold" style={{ color: buyQty5s > 0 ? BUY_COLOR : '#3a3a3a' }}>
          {formatQty(buyQty5s) || '·'}
        </span>
        <span className="text-[9px] text-[#454545]">×</span>
        <span className="text-[9.5px] font-semibold" style={{ color: sellQty5s > 0 ? SELL_COLOR : '#3a3a3a' }}>
          {formatQty(sellQty5s) || '·'}
        </span>
      </div>

      {/* Ask cell — click places a SHORT limit at this row's price */}
      <button
        type="button"
        onClick={() => onPlaceAsk(price)}
        className="group relative flex h-full items-center justify-start overflow-hidden px-1.5 text-left"
        title={`Sell limit @ ${priceLabel}`}
      >
        <div
          className="absolute left-0 top-0 h-full"
          style={{ width: `${askPct}%`, background: ASK_COLOR, opacity: 0.28 }}
          aria-hidden="true"
        />
        <span className="relative font-semibold tabular-nums" style={{ color: askQty > 0 ? '#ff96ab' : '#454545' }}>
          {formatQty(askQty)}
        </span>
        {askOrders.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onCancelOrder(askOrders[0].id);
            }}
            title="Click to cancel"
            className="relative ml-1.5 rounded border px-1 py-0.5 text-[9px] font-bold"
            style={{ borderColor: 'rgba(201,166,70,0.45)', background: 'rgba(201,166,70,0.16)', color: GOLD }}
          >
            {`S ${formatQty(askBadgeQty)}`}
          </span>
        )}
        <span
          className="pointer-events-none absolute right-1.5 text-[10px] font-semibold opacity-0 transition-opacity duration-100 group-hover:opacity-70"
          style={{ color: ASK_COLOR }}
          aria-hidden="true"
        >
          +
        </span>
      </button>
    </div>
  );
});

// ─── Ladder ─────────────────────────────────────────────────────────────

export function DomLadder({
  getBook,
  drainTrades,
  lastPrice,
  status,
  preferences,
  pendingOrders,
  onPlaceLimit,
  onCancelOrder,
  pricePrecision,
}: DomLadderProps) {
  const tickSizeRef = useRef<number | null>(null);
  // rowSize (price units) — mirrors the state that drives the interval, kept
  // in a ref so the wheel handler / Recenter button (both outside the
  // interval) can read the LATEST value synchronously.
  const rowSizeRef = useRef<number>(0.01);
  // The previous tick's resolved 'auto' rowSize — feeds computeAutoRowSize's
  // hysteresis so auto doesn't flap between adjacent nice values every tick.
  const autoRowSizeRef = useRef<number | null>(null);
  // Session volume is keyed by ROW index (not tick index) so it survives
  // recenters at the current rowSize — see the rowSize-change migration in
  // the interval below for what happens when rowSize itself changes.
  const sessionVolRef = useRef<Map<number, number>>(new Map());
  // Recent trades keep the RAW price (not a precomputed idx) so a rowSize
  // change never leaves stale buckets in this 5s rolling window — idx is
  // derived fresh every tick from the current rowSize instead.
  const recentTradesRef = useRef<{ price: number; time: number; qty: number; isBuyerMaker: boolean }[]>([]);
  const lastAutoCenterAtRef = useRef<number>(0);
  const lastManualScrollAtRef = useRef<number>(0);
  // Pointer-over-ladder state — pauses auto-center so a click never lands on
  // a row that just moved out from under the cursor (fix: click-to-order
  // race). `hoverPauseUntilRef` extends the pause for a grace period after
  // the pointer actually leaves.
  const isHoveredRef = useRef<boolean>(false);
  const hoverPauseUntilRef = useRef<number>(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Latest-value refs — read inside the interval closure so only
  // preferences.updateMs needs to restart the timer (see file header).
  const lastPriceRef = useRef(lastPrice);
  lastPriceRef.current = lastPrice;
  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;
  const pendingOrdersRef = useRef(pendingOrders);
  pendingOrdersRef.current = pendingOrders;

  const [centerIdx, setCenterIdx] = useState<number | null>(null);
  const centerIdxRef = useRef<number | null>(null);
  centerIdxRef.current = centerIdx;

  const [rows, setRows] = useState<DomRowModel[]>([]);
  const [rowDecimals, setRowDecimals] = useState<number | null>(null);
  const [recenterAvailable, setRecenterAvailable] = useState(false);

  // Fill-height (fix: only ~21 fixed rows leaving the panel half-empty) —
  // measure the ladder body and render enough rows to cover it, clamped to
  // a sane max. `depthCount` no longer controls this; see file header.
  const [renderRowCount, setRenderRowCount] = useState<number>(MIN_RENDERED_ROWS);
  const renderRowCountRef = useRef(renderRowCount);
  renderRowCountRef.current = renderRowCount;

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const applyHeight = (heightPx: number) => {
      const rowsFit = Math.floor(heightPx / ROW_HEIGHT_PX);
      setRenderRowCount(Math.min(MAX_RENDERED_ROWS, Math.max(MIN_RENDERED_ROWS, rowsFit)));
    };
    applyHeight(el.clientHeight);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) applyHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const { bids, asks } = getBook();
      const drained = drainTrades();

      const inferred = inferTickSize(bids, asks, lastPriceRef.current);
      if (tickSizeRef.current === null || (inferred > 0 && inferred < tickSizeRef.current)) {
        tickSizeRef.current = inferred;
      }
      const currentTick = tickSizeRef.current ?? inferred;
      if (!currentTick || currentTick <= 0) return;

      const now = Date.now();
      const prefs = prefsRef.current;

      // Resolve this tick's row size (price units) — 'auto' recomputes with
      // hysteresis (domLadderMath.ts computeAutoRowSize); a numeric
      // preference is a tick multiple (see useDomPreferences.ts doc).
      const rowSize = resolveRowSizeDollars(prefs.rowSize, currentTick, lastPriceRef.current, autoRowSizeRef.current);
      if (prefs.rowSize === 'auto') autoRowSizeRef.current = rowSize;
      const rowDecimalsNow = decimalsForStep(rowSize);

      // If rowSize changed since the last tick, migrate the session-volume
      // accumulator's buckets to the new grid instead of losing/misplacing
      // history (rowSize rarely changes — hysteresis — so this is cheap).
      const prevRowSize = rowSizeRef.current;
      if (prevRowSize > 0 && Math.abs(rowSize - prevRowSize) > 1e-12 && sessionVolRef.current.size > 0) {
        const migrated = new Map<number, number>();
        for (const [oldIdx, qty] of sessionVolRef.current) {
          const price = oldIdx * prevRowSize;
          const newIdx = priceToRowIndex(price, rowSize);
          migrated.set(newIdx, (migrated.get(newIdx) ?? 0) + qty);
        }
        sessionVolRef.current = migrated;
      }
      rowSizeRef.current = rowSize;

      // Session volume histogram — accumulates EVERY drained trade since
      // mount, keyed by row index (survives recenters; see migration above
      // for what happens when rowSize itself changes).
      for (const t of drained) {
        const idx = priceToRowIndex(t.price, rowSize);
        sessionVolRef.current.set(idx, (sessionVolRef.current.get(idx) ?? 0) + t.qty);
        recentTradesRef.current.push({ price: t.price, time: t.time, qty: t.qty, isBuyerMaker: t.isBuyerMaker });
      }
      // Prune the rolling 5s trades window.
      const cutoff = now - RECENT_TRADE_WINDOW_MS;
      if (recentTradesRef.current.length > 0) {
        recentTradesRef.current = recentTradesRef.current.filter((t) => t.time >= cutoff);
      }

      let effectiveCenterIdx = centerIdxRef.current;

      // Auto-center is paused while the pointer is over the ladder (and for
      // a grace period after it leaves) — a click must never land on a row
      // that just moved out from under the cursor.
      const pausedByHover = isHoveredRef.current || now < hoverPauseUntilRef.current;

      if (effectiveCenterIdx === null) {
        // First-available-price init.
        if (lastPriceRef.current != null && lastPriceRef.current > 0) {
          effectiveCenterIdx = priceToRowIndex(lastPriceRef.current, rowSize);
          lastAutoCenterAtRef.current = now;
        }
      } else if (prefs.autoCenter && lastPriceRef.current != null) {
        const pausedByManualScroll = now - lastManualScrollAtRef.current < MANUAL_SCROLL_PAUSE_MS;
        if (!pausedByManualScroll && !pausedByHover) {
          const centerPriceNow = effectiveCenterIdx * rowSize;
          const drift = Math.abs(lastPriceRef.current - centerPriceNow);
          const dueToInterval = now - lastAutoCenterAtRef.current >= prefs.autoCenterSec * 1000;
          const dueToDrift = drift >= prefs.recenterTicks * currentTick;
          if (dueToInterval || dueToDrift) {
            effectiveCenterIdx = priceToRowIndex(lastPriceRef.current, rowSize);
            lastAutoCenterAtRef.current = now;
          }
        }
      }

      setRowDecimals(rowDecimalsNow);

      if (effectiveCenterIdx === null) return; // still waiting on a first price

      const depthCount = prefs.depthCount;
      const centerTradeIdx = lastPriceRef.current != null
        ? priceToRowIndex(lastPriceRef.current, rowSize)
        : effectiveCenterIdx;

      // Recenter button — only surfaces while auto-center is paused by hover
      // AND the last-traded price has drifted entirely outside the
      // currently rendered window, so the user is never silently lost.
      const renderHalf = Math.floor(renderRowCountRef.current / 2);
      setRecenterAvailable(pausedByHover && Math.abs(centerTradeIdx - effectiveCenterIdx) > renderHalf);

      const buyMap = new Map<number, number>();
      const sellMap = new Map<number, number>();
      for (const t of recentTradesRef.current) {
        // isBuyerMaker=true → the SELLER was the aggressor.
        const idx = priceToRowIndex(t.price, rowSize);
        const map = t.isBuyerMaker ? sellMap : buyMap;
        map.set(idx, (map.get(idx) ?? 0) + t.qty);
      }

      // depthCount bounds the raw-book price WINDOW aggregated per side
      // (± depthCount rows' worth of rowSize around center) — independent
      // of how many rows are actually rendered (see file header). Rows
      // further out than this window naturally render empty.
      const depthWindow = depthCount * rowSize;
      const windowMin = effectiveCenterIdx * rowSize - depthWindow;
      const windowMax = effectiveCenterIdx * rowSize + depthWindow;

      const bidByIdx = new Map<number, number>();
      for (const [price, qty] of bids) {
        if (price < windowMin || price > windowMax) continue;
        const idx = priceToRowIndex(price, rowSize);
        bidByIdx.set(idx, (bidByIdx.get(idx) ?? 0) + qty);
      }
      const askByIdx = new Map<number, number>();
      for (const [price, qty] of asks) {
        if (price < windowMin || price > windowMax) continue;
        const idx = priceToRowIndex(price, rowSize);
        askByIdx.set(idx, (askByIdx.get(idx) ?? 0) + qty);
      }

      const bidOrdersByIdx = new Map<number, PendingOrder[]>();
      const askOrdersByIdx = new Map<number, PendingOrder[]>();
      for (const order of pendingOrdersRef.current) {
        const idx = priceToRowIndex(order.triggerPrice, rowSize);
        const bucket = order.side === 'LONG' ? bidOrdersByIdx : askOrdersByIdx;
        const arr = bucket.get(idx);
        if (arr) arr.push(order);
        else bucket.set(idx, [order]);
      }

      const nextRows: DomRowModel[] = [];
      for (let i = renderHalf; i >= -renderHalf; i--) {
        const idx = effectiveCenterIdx + i;
        nextRows.push({
          idx,
          price: rowIndexToPrice(idx, rowSize, rowDecimalsNow),
          isCenter: idx === centerTradeIdx,
          bidQty: bidByIdx.get(idx) ?? 0,
          askQty: askByIdx.get(idx) ?? 0,
          sessionQty: sessionVolRef.current.get(idx) ?? 0,
          buyQty5s: buyMap.get(idx) ?? 0,
          sellQty5s: sellMap.get(idx) ?? 0,
          bidOrders: bidOrdersByIdx.get(idx) ?? EMPTY_ORDERS,
          askOrders: askOrdersByIdx.get(idx) ?? EMPTY_ORDERS,
        });
      }

      setCenterIdx(effectiveCenterIdx);
      setRows(nextRows);
    }, preferences.updateMs);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences.updateMs]);

  const handleWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    if (tickSizeRef.current == null) return;
    e.preventDefault();
    lastManualScrollAtRef.current = Date.now();
    const direction = e.deltaY > 0 ? -1 : 1;
    setCenterIdx((prev) => (prev === null ? prev : prev + direction));
  }, []);

  const handlePointerEnter = useCallback(() => {
    isHoveredRef.current = true;
  }, []);
  const handlePointerLeave = useCallback(() => {
    isHoveredRef.current = false;
    hoverPauseUntilRef.current = Date.now() + HOVER_RECENTER_PAUSE_MS;
  }, []);

  // Manual recenter (the floating "Recenter" button) — jumps straight to
  // the current price's row, bypassing the hover pause the way the wheel
  // handler already bypasses auto-center's own gating.
  const handleRecenterClick = useCallback(() => {
    hoverPauseUntilRef.current = 0;
    const price = lastPriceRef.current;
    const rowSize = rowSizeRef.current;
    if (price == null || price <= 0 || !rowSize || rowSize <= 0) return;
    lastAutoCenterAtRef.current = Date.now();
    setCenterIdx(priceToRowIndex(price, rowSize));
    setRecenterAvailable(false);
  }, []);

  const handlePlaceBid = useCallback((price: number) => onPlaceLimit('LONG', price), [onPlaceLimit]);
  const handlePlaceAsk = useCallback((price: number) => onPlaceLimit('SHORT', price), [onPlaceLimit]);

  const precision = pricePrecision ?? rowDecimals ?? 2;

  const maxSideQty = useMemo(
    () => Math.max(1e-9, ...rows.map((r) => Math.max(r.bidQty, r.askQty))),
    [rows],
  );
  const maxSessionQty = useMemo(
    () => Math.max(1e-9, ...rows.map((r) => r.sessionQty)),
    [rows],
  );

  const isLive = status === 'live';
  const gridColumns = preferences.showVolumeHistogram ? ROW_GRID_COLUMNS_WITH_VOL : ROW_GRID_COLUMNS_NO_VOL;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Column header */}
      <div
        className="grid flex-shrink-0 items-center text-[9px] font-semibold uppercase tracking-wide text-[#707070]"
        style={{ gridTemplateColumns: gridColumns, height: '22px', borderBottom: '1px solid rgba(201,166,70,0.12)' }}
      >
        {preferences.showVolumeHistogram && <div className="px-1">Vol</div>}
        <div className="px-1.5 text-right">Bids</div>
        <div className="text-center">Price</div>
        <div className="text-center">Trades</div>
        <div className="px-1.5 text-left">Asks</div>
      </div>

      {/* Ladder body */}
      <div
        ref={bodyRef}
        className="relative flex-1 min-h-0 overflow-y-auto"
        onWheel={handleWheel}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
      >
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-[#707070]">
            {status === 'error' ? 'Feed error' : 'Connecting…'}
          </div>
        ) : (
          rows.map((row) => (
            <DomRowView
              key={row.price}
              price={row.price}
              pricePrecision={precision}
              isCenter={row.isCenter}
              showCenterLine={preferences.showCenterLine}
              bidQty={row.bidQty}
              askQty={row.askQty}
              maxSideQty={maxSideQty}
              sessionQty={row.sessionQty}
              maxSessionQty={maxSessionQty}
              showVolumeHistogram={preferences.showVolumeHistogram}
              buyQty5s={row.buyQty5s}
              sellQty5s={row.sellQty5s}
              bidOrders={row.bidOrders}
              askOrders={row.askOrders}
              onPlaceBid={handlePlaceBid}
              onPlaceAsk={handlePlaceAsk}
              onCancelOrder={onCancelOrder}
            />
          ))
        )}

        {!isLive && rows.length > 0 && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(8,8,10,0.55)' }}
          >
            <span className="text-[11px] font-semibold text-[#909090]">
              {status === 'error' ? 'Feed error' : 'Connecting…'}
            </span>
          </div>
        )}

        {/* Recenter — surfaces only while auto-center is paused by hover AND
            price has drifted entirely outside the visible window, so the
            user is never lost after parking the pointer on the ladder. */}
        {isLive && recenterAvailable && (
          <button
            type="button"
            onClick={handleRecenterClick}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border px-3 py-1 text-[11px] font-semibold shadow-lg backdrop-blur-sm transition-opacity duration-150"
            style={{
              borderColor: 'rgba(201,166,70,0.6)',
              background: 'rgba(13,13,15,0.9)',
              color: GOLD,
            }}
          >
            Recenter
          </button>
        )}
      </div>
    </div>
  );
}
