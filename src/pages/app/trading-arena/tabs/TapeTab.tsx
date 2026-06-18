/**
 * Trading Arena — Time & Sales ("Tape") tab
 *
 * Subscribes to the same useBinanceOrderBook hook as OrderFlowTab,
 * drains aggTrades every 250ms, and renders a capped scrolling list of
 * individual prints with buy/sell colouring, notional-based big-print
 * highlighting, and a minimum-notional filter control.
 *
 * Side logic (exact mirror of BookmapChart.tsx lines 493-498):
 *   trade.isBuyerMaker === true  → seller was aggressor → SELL (red)
 *   trade.isBuyerMaker === false → buyer  was aggressor → BUY  (green)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useBinanceOrderBook,
  type Trade,
} from '@/pages/app/crypto/scanner/useBinanceOrderBook';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum rows kept in the local display list (newest-on-top). */
const MAX_ROWS = 400;

/** How often (ms) we drain trades from the hook ring buffer. */
const DRAIN_INTERVAL_MS = 250;

/** Default big-print threshold preset options (USD notional). */
const PRESET_THRESHOLDS = [
  { label: 'Off',   value: 0 },
  { label: '$1K',   value: 1_000 },
  { label: '$10K',  value: 10_000 },
  { label: '$100K', value: 100_000 },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Unix-ms timestamp as HH:MM:SS in local time. */
function formatTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Format a price with context-sensitive precision.
 * >= 1000 → 2 decimals; >= 1 → 4 decimals; else 6 decimals.
 */
function formatPrice(price: number): string {
  if (price >= 1_000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1)     return price.toFixed(4);
  return price.toFixed(6);
}

/**
 * Format a quantity: if it's a whole number show as-is; otherwise up to 6
 * decimal places, trimming trailing zeros.
 */
function formatQty(qty: number): string {
  if (Number.isInteger(qty)) return qty.toLocaleString('en-US');
  return qty.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

// ---------------------------------------------------------------------------
// Row type (extends Trade with a stable display key)
// ---------------------------------------------------------------------------

interface TapeRow extends Trade {
  /** Unique key for React reconciliation (time + price avoids collisions for same-ms trades). */
  key: string;
  /** Precomputed USD notional. */
  notional: number;
}

// ---------------------------------------------------------------------------
// TapeTab
// ---------------------------------------------------------------------------

interface TapeTabProps {
  symbol: string;
}

export function TapeTab({ symbol }: TapeTabProps) {
  const book = useBinanceOrderBook(symbol);

  /** Displayed rows, newest first. */
  const [rows, setRows] = useState<TapeRow[]>([]);

  /**
   * Big-print threshold in USD notional.
   * 0 = disabled (no highlighting, show everything).
   */
  const [threshold, setThreshold] = useState<number>(0);

  /**
   * When true, hide rows BELOW the threshold (show only big prints).
   * Only relevant when threshold > 0.
   */
  const [onlyBig, setOnlyBig] = useState<boolean>(false);

  /**
   * Custom threshold text input value (controlled).
   * Kept as string so the user can type freely; parsed on blur/enter.
   */
  const [customInput, setCustomInput] = useState<string>('');

  // Stable counter to generate unique keys within a drain batch.
  const seqRef = useRef<number>(0);

  // ---------------------------------------------------------------------------
  // Drain loop
  // ---------------------------------------------------------------------------

  const drain = useCallback(() => {
    const fresh: Trade[] = book.drainTrades();
    if (fresh.length === 0) return;

    setRows((prev) => {
      // Build new rows prepended (newest first).
      const added: TapeRow[] = fresh.map((t) => ({
        ...t,
        notional: t.price * t.qty,
        // Combine time + price + a monotonically incrementing sequence to avoid
        // duplicate keys for trades that arrive at the same millisecond and price.
        key: `${t.time}-${t.price}-${seqRef.current++}`,
      }));

      // Prepend new trades, then cap.
      const next = [...added.reverse(), ...prev]; // newest first after reverse
      return next.length > MAX_ROWS ? next.slice(0, MAX_ROWS) : next;
    });
  }, [book]);

  useEffect(() => {
    const id = setInterval(drain, DRAIN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [drain]);

  // Reset rows when symbol changes.
  const prevSymbolRef = useRef<string>(symbol);
  useEffect(() => {
    if (prevSymbolRef.current !== symbol) {
      prevSymbolRef.current = symbol;
      setRows([]);
      seqRef.current = 0;
    }
  }, [symbol]);

  // ---------------------------------------------------------------------------
  // Derived display list
  // ---------------------------------------------------------------------------

  const displayRows = onlyBig && threshold > 0
    ? rows.filter((r) => r.notional >= threshold)
    : rows;

  // ---------------------------------------------------------------------------
  // Status dot
  // ---------------------------------------------------------------------------

  const statusColor =
    book.status === 'live'       ? '#22c55e' :  // green-500
    book.status === 'connecting' ? '#f59e0b' :  // amber-500
                                   '#ef4444';   // red-500

  const statusLabel =
    book.status === 'live'       ? 'Live' :
    book.status === 'connecting' ? 'Connecting…' :
                                   'Error';

  // ---------------------------------------------------------------------------
  // Custom threshold input handler
  // ---------------------------------------------------------------------------

  function applyCustomInput(): void {
    const parsed = parseFloat(customInput.replace(/[^0-9.]/g, ''));
    if (!Number.isNaN(parsed) && parsed > 0) {
      setThreshold(parsed);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#08080a]">

      {/* ── Controls bar ──────────────────────────────────────────── */}
      <div
        className="flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 border-b"
        style={{ borderColor: 'rgba(201,166,70,0.10)' }}
      >
        {/* Title + icon */}
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C9A646]">
          <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Time &amp; Sales</span>
          <span className="text-[#505050] font-normal ml-1">{symbol}</span>
        </div>

        {/* Divider */}
        <span className="hidden sm:block w-px h-4 bg-[rgba(255,255,255,0.08)]" aria-hidden="true" />

        {/* Big-print threshold presets */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#606060] mr-1 whitespace-nowrap">Big prints:</span>
          {PRESET_THRESHOLDS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setThreshold(preset.value)}
              className={cn(
                'h-6 min-w-[36px] rounded px-2 text-[10px] font-semibold transition-all duration-150',
                threshold === preset.value
                  ? 'bg-[rgba(201,166,70,0.20)] text-[#C9A646] border border-[rgba(201,166,70,0.50)]'
                  : 'text-[#666666] hover:text-[#B0B0B0] hover:bg-[rgba(255,255,255,0.05)] border border-transparent',
              )}
            >
              {preset.label}
            </button>
          ))}

          {/* Custom threshold input */}
          <input
            type="text"
            inputMode="numeric"
            placeholder="Custom $"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onBlur={applyCustomInput}
            onKeyDown={(e) => { if (e.key === 'Enter') applyCustomInput(); }}
            className={cn(
              'h-6 w-[72px] rounded border px-2 text-[10px] bg-[#0D0D0D] text-[#C0C0C0] placeholder-[#444]',
              'focus:outline-none focus:border-[rgba(201,166,70,0.50)]',
              'transition-colors duration-150',
              threshold > 0 && !PRESET_THRESHOLDS.some((p) => p.value === threshold)
                ? 'border-[rgba(201,166,70,0.50)]'
                : 'border-[rgba(255,255,255,0.10)]',
            )}
            aria-label="Custom big-print threshold in USD"
          />
        </div>

        {/* Only big prints toggle — only visible when threshold > 0 */}
        {threshold > 0 && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyBig}
              onChange={(e) => setOnlyBig(e.target.checked)}
              className="h-3 w-3 accent-[#C9A646]"
            />
            <span className="text-[11px] text-[#888888]">Only big prints</span>
          </label>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Connection status */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: statusColor }}
            aria-hidden="true"
          />
          <span className="text-[11px]" style={{ color: statusColor }}>
            {statusLabel}
          </span>
          {book.lastPrice !== null && (
            <span className="text-[11px] text-[#505050] ml-1">
              Last: <span className="text-[#B0B0B0]">{formatPrice(book.lastPrice)}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Column headers ────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 grid text-[10px] font-semibold uppercase tracking-wide text-[#505050] px-4 py-1.5 border-b"
        style={{
          gridTemplateColumns: '80px 1fr 1fr 56px',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <span>Time</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Side</span>
      </div>

      {/* ── Trade list ────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto" role="log" aria-label="Time and sales tape">
        {displayRows.length === 0 && book.status !== 'error' && (
          <div className="flex items-center justify-center h-20 text-[12px] text-[#404040]">
            {book.status === 'connecting' ? 'Connecting to trade stream…' : 'Waiting for trades…'}
          </div>
        )}
        {book.status === 'error' && displayRows.length === 0 && (
          <div className="flex items-center justify-center h-20 text-[12px] text-[#ef4444]">
            Connection error — reload to retry
          </div>
        )}

        {displayRows.map((row) => {
          const isBuy = !row.isBuyerMaker; // buyer was aggressor → BUY
          const isBigPrint = threshold > 0 && row.notional >= threshold;

          return (
            <div
              key={row.key}
              className={cn(
                'grid text-[11px] font-mono px-4 py-[3px] transition-colors',
                // Big-print row: subtle gold tint background + bold text
                isBigPrint
                  ? 'bg-[rgba(201,166,70,0.08)] font-semibold'
                  : 'hover:bg-[rgba(255,255,255,0.025)]',
              )}
              style={{ gridTemplateColumns: '80px 1fr 1fr 56px' }}
            >
              {/* Time */}
              <span className="text-[#505050]">{formatTime(row.time)}</span>

              {/* Price — colored by side */}
              <span
                className="text-right"
                style={{ color: isBuy ? '#34d399' : '#f87171' }}
              >
                {isBigPrint && (
                  <span
                    className="mr-1 text-[9px]"
                    style={{ color: '#C9A646' }}
                    title={`$${row.notional.toLocaleString('en-US', { maximumFractionDigits: 0 })} notional`}
                  >
                    ★
                  </span>
                )}
                {formatPrice(row.price)}
              </span>

              {/* Size */}
              <span className="text-right text-[#A0A0A0]">
                {formatQty(row.qty)}
              </span>

              {/* Side badge */}
              <span
                className="text-right font-semibold text-[10px]"
                style={{ color: isBuy ? '#34d399' : '#f87171' }}
              >
                {isBuy ? 'BUY' : 'SELL'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
