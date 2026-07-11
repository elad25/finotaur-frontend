// src/features/floor/components/TradeBusinessCard.tsx
// Branded FINOTAUR "business card" — renders a trade's DATA ONLY (no chart),
// gold-on-black, for posts shared with show_chart = false.
//
// Reuses the SAME redaction rules as AttachedTradeCard in SharedTradeCard.tsx:
//   hide_pnl || trade_pnl === null           → P&L shown as "•••"
//   show_setup_only || trade_entry === null  → entry shown as "•••"
//   show_setup_only || trade_exit === null   → exit shown as "•••"
//   !reveal_size || trade_size === null      → size hidden entirely
//
// Does NOT render the author header, reactions, or comments — those stay in
// the surrounding SharedTradeCard.

import { cn } from '@/lib/utils';
import type { GlobalFeedItem } from '@/features/floor/types/community';

/** Dollar value with U+2212 for negative — matches SharedTradeCard's formatPnl. */
function formatPnl(value: number): string {
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `−$${abs}`; // U+2212 mathematical minus
  return `$${abs}`;
}

/** Short date: "Jul 10". */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export interface TradeBusinessCardProps {
  item: GlobalFeedItem;
}

export function TradeBusinessCard({ item }: TradeBusinessCardProps) {
  const {
    trade_symbol,
    trade_side,
    trade_pnl,
    trade_entry,
    trade_exit,
    trade_size,
    trade_close_at,
    hide_pnl,
    show_setup_only,
    reveal_size,
    trade_strategy_category,
    trade_r,
  } = item;

  if (!trade_symbol) return null;

  const pnlHidden = hide_pnl || trade_pnl === null;
  const isNegative = trade_pnl !== null && trade_pnl < 0;
  const rHidden = hide_pnl || trade_r === null;
  const rIsNegative = trade_r !== null && trade_r < 0;
  const entryHidden = show_setup_only || trade_entry === null;
  const exitHidden = show_setup_only || trade_exit === null;
  const isLong = trade_side === 'LONG';
  const isShort = trade_side === 'SHORT';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[12px] p-ds-5',
        'bg-surface-base border border-[rgba(201,166,70,0.35)]',
      )}
    >
      {/* FINOTAUR bull branding — big, faces inward, fills the right third; screen-blended so the black drops out. Content sits above (z-10). */}
      <img
        src="/finotaur-bull-watermark.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute right-[-21%] bottom-[-63%] z-0 h-[175%] w-auto max-w-none -scale-x-100 opacity-[0.24] mix-blend-screen"
      />

      <div className="relative z-10 flex flex-col gap-ds-3">
        {/* Symbol + date */}
        <div className="flex items-baseline gap-ds-2">
          <span className="font-sans text-[22px] font-bold text-ink-primary">
            {trade_symbol}
          </span>
          {trade_close_at && (
            <span className="font-sans text-[12px] text-ink-tertiary">
              {shortDate(trade_close_at)}
            </span>
          )}
        </div>

        {/* Side pill */}
        {trade_side && (
          <div>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-[10px] py-[3px]',
                'font-sans text-[11px] font-semibold uppercase tracking-[0.5px]',
                isLong && 'bg-[rgba(16,185,129,0.12)] text-status-success',
                isShort && 'bg-[rgba(226,75,74,0.12)] text-num-negative',
                !isLong && !isShort && 'bg-surface-2 text-ink-secondary',
              )}
            >
              {trade_side}
              {reveal_size && trade_size !== null && ` · ${trade_size} contract${trade_size === 1 ? '' : 's'}`}
            </span>
          </div>
        )}

        {/* Big P&L */}
        <div className="flex flex-col gap-[2px]">
          {pnlHidden ? (
            <span
              className="font-sans text-[34px] font-bold leading-none text-ink-muted select-none"
              aria-label="P&L hidden"
            >
              •••
            </span>
          ) : (
            <span
              className={cn(
                'font-sans text-[34px] font-bold leading-none',
                isNegative ? 'text-num-negative' : 'text-num-neutral',
              )}
            >
              {formatPnl(trade_pnl as number)}
              <span className="ml-[6px] font-sans text-[13px] font-medium text-ink-muted align-middle">
                USD
              </span>
            </span>
          )}

          {rHidden ? null : (
            <span className="font-mono tabular-nums text-[15px] font-semibold text-gold-primary">
              {rIsNegative ? '−' : '+'}
              {Math.abs(trade_r as number).toFixed(1)}R
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[rgba(201,166,70,0.20)]" />

        {/* Entry / Exit */}
        <div className="grid grid-cols-2 gap-ds-4">
          <div className="flex flex-col gap-[2px]">
            <span className="font-sans text-[11px] text-ink-tertiary">Entry Price</span>
            {entryHidden ? (
              <span className="font-mono text-[13px] text-ink-muted select-none" aria-label="Entry hidden">
                •••
              </span>
            ) : (
              <span className="font-mono tabular-nums text-[13px] text-ink-primary">
                {formatPnl(trade_entry as number)}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-[2px]">
            <span className="font-sans text-[11px] text-ink-tertiary">Exit Price</span>
            {exitHidden ? (
              <span className="font-mono text-[13px] text-ink-muted select-none" aria-label="Exit hidden">
                •••
              </span>
            ) : (
              <span className="font-mono tabular-nums text-[13px] text-ink-primary">
                {formatPnl(trade_exit as number)}
              </span>
            )}
          </div>
        </div>

        {/* Strategy channel pill */}
        {trade_strategy_category && (
          <div>
            <span className="font-sans text-[11px] font-medium text-gold-primary bg-[rgba(201,166,70,0.10)] border-[0.5px] border-gold-border rounded-[4px] px-ds-2 py-[2px]">
              {trade_strategy_category}
            </span>
          </div>
        )}

        {/* Wordmark */}
        <div className="pt-ds-1">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-primary">
            FINOTAUR
          </span>
        </div>
      </div>
    </div>
  );
}
