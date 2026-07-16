// src/features/floor/components/DayPnlCard.tsx
// Branded FINOTAUR "business card" for a single day's aggregate P&L —
// gold-on-black, same visual family as TradeBusinessCard, but summarizes
// the whole trading day (net P&L, trades, win rate) instead of one trade.
//
// forwardRef: the outer div is the export target for html2canvas
// (see useTradeCardImage / ShareDayPnlDialog).

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/** Dollar value with U+2212 for negative — matches TradeBusinessCard's formatPnl. */
function formatPnl(value: number): string {
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `−$${abs}`; // U+2212 mathematical minus
  return `$${abs}`;
}

export interface DayPnlCardData {
  /** Human date label, e.g. "Wed, Jul 16, 2026". */
  dateLabel: string;
  /** null → P&L hidden, render ••• (never 0). */
  netPnl: number | null;
  /** Closed trades that make up the day's P&L. */
  closedTrades: number;
  winners: number;
  losers: number;
  /** 0-100. */
  winRate: number;
}

export interface DayPnlCardProps {
  data: DayPnlCardData;
}

export const DayPnlCard = forwardRef<HTMLDivElement, DayPnlCardProps>(
  function DayPnlCard({ data }, ref) {
    const { dateLabel, netPnl, closedTrades, winners, losers, winRate } = data;
    const pnlHidden = netPnl === null;
    const isNegative = netPnl !== null && netPnl < 0;
    const hasTrades = closedTrades > 0;

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-[12px] p-ds-5',
          'bg-surface-base border border-[rgba(201,166,70,0.35)]',
        )}
      >
        {/* FINOTAUR bull branding — same treatment as TradeBusinessCard. */}
        <img
          src="/finotaur-bull-watermark.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute right-[-21%] bottom-[-63%] z-0 h-[175%] w-auto max-w-none -scale-x-100 opacity-[0.24] mix-blend-screen"
        />

        <div className="relative z-10 flex flex-col gap-ds-3">
          {/* Title + date */}
          <div className="flex flex-col gap-[2px]">
            <span className="font-sans text-[10px] font-semibold tracking-[1.5px] uppercase text-gold-primary">
              Today&apos;s P&amp;L
            </span>
            <span className="font-sans text-[13px] text-ink-tertiary">{dateLabel}</span>
          </div>

          {/* Big net P&L */}
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
                isNegative ? 'text-num-negative' : 'text-status-success',
              )}
            >
              {formatPnl(netPnl as number)}
              <span className="ml-[6px] font-sans text-[13px] font-medium text-ink-muted align-middle">
                USD
              </span>
            </span>
          )}

          {/* Divider */}
          <div className="border-t border-[rgba(201,166,70,0.20)]" />

          {/* Day stats */}
          <div className="grid grid-cols-3 gap-ds-4">
            <div className="flex flex-col gap-[2px]">
              <span className="font-sans text-[11px] text-ink-tertiary">Trades</span>
              <span className="font-mono tabular-nums text-[13px] text-ink-primary">
                {closedTrades}
              </span>
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="font-sans text-[11px] text-ink-tertiary">Win Rate</span>
              <span className="font-mono tabular-nums text-[13px] text-ink-primary">
                {hasTrades ? `${winRate.toFixed(0)}%` : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="font-sans text-[11px] text-ink-tertiary">W / L</span>
              <span className="font-mono tabular-nums text-[13px]">
                <span className="text-status-success">{winners}</span>
                <span className="text-ink-muted"> / </span>
                <span className="text-num-negative">{losers}</span>
              </span>
            </div>
          </div>

          {/* Wordmark */}
          <div className="pt-ds-1">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-primary">
              FINOTAUR
            </span>
          </div>
        </div>
      </div>
    );
  },
);

DayPnlCard.displayName = 'DayPnlCard';
