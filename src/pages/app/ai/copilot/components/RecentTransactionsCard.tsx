// src/pages/app/ai/copilot/components/RecentTransactionsCard.tsx
// =====================================================
// RECENT TRANSACTIONS card — last 5 trades from the user's journal.
// Header carries a "View All" pill linking to the full journal.
// Row anatomy: ticker logo | symbol + side chip | quantity | amount + time-ago.
// =====================================================

import { Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumFrame } from '../brief/PremiumFrame';
import { TickerLogo } from './TickerLogo';
import { relativeTime } from '../utils/relativeTime';
import { useTrades } from '@/hooks/useTradesData';
import { normalizeAssetClass } from '@/utils/assetClass';
import type { Trade } from '@/hooks/useTradesData';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatAmount(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "Shares" for stock/ETF-like trades; otherwise the bare quantity (contracts/units/lots). */
function quantityLabel(trade: Trade): string {
  const assetClass = normalizeAssetClass(trade.asset_class);
  const qty = trade.quantity;
  if (assetClass === null || assetClass === 'stock' || assetClass === 'etf') {
    return `${qty} Shares`;
  }
  return `${qty}`;
}

// ─── Side chip ────────────────────────────────────────────────────────────────

function SideChip({ side }: { side: Trade['side'] }) {
  if (side === 'LONG') {
    return (
      <span className="inline-flex items-center rounded-[4px] border border-gold-primary/35 bg-gold-primary/10 px-1.5 py-0.5 text-[9px] uppercase font-semibold text-gold-primary">
        Buy
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-[4px] border border-num-negative/40 bg-num-negative/15 px-1.5 py-0.5 text-[9px] uppercase font-semibold text-num-negative">
      Sell
    </span>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────────

function TransactionRow({ trade }: { trade: Trade }) {
  const amount = trade.entry_price * trade.quantity;
  const timestamp = trade.close_at ?? trade.open_at;

  return (
    <div className="flex items-center gap-3 rounded-[6px] px-2 py-2 hover:bg-white/[0.03]">
      <TickerLogo ticker={trade.symbol} size={28} className="flex-none" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">{trade.symbol}</p>
          <SideChip side={trade.side} />
        </div>
        <p className="text-[11px] text-ink-secondary leading-snug mt-0.5">{quantityLabel(trade)}</p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-none">
        <span className="font-mono tabular-nums text-sm text-white">{formatAmount(amount)}</span>
        <span className="text-[10px] text-ink-tertiary">{relativeTime(timestamp)}</span>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  className?: string;
}

export function RecentTransactionsCard({ className }: Props) {
  const { data: trades, isLoading, isError } = useTrades();

  const recent = [...(trades ?? [])]
    .sort((a, b) => new Date(b.open_at).getTime() - new Date(a.open_at).getTime())
    .slice(0, 5);

  const showEmpty = !isLoading && (isError || recent.length === 0);

  return (
    <PremiumFrame className={`flex flex-col min-h-[280px] ${className ?? ''}`}>
      <div className="flex flex-col flex-1 p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5 text-gold-primary flex-none" />
            <p className="text-[10px] uppercase tracking-[0.12em] text-gold-primary font-semibold">
              RECENT TRANSACTIONS
            </p>
          </div>
          <Link
            to="/app/journal"
            className="inline-flex items-center rounded-full border border-gold-primary/35 px-2.5 py-1 text-[9px] uppercase font-semibold tracking-wide text-gold-primary transition-colors hover:bg-gold-primary/10"
          >
            View All
          </Link>
        </div>

        {/* Rows */}
        <div className="mt-4 flex flex-col gap-1">
          {isLoading ? (
            <div className="flex flex-col gap-2" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2">
                  <div className="h-7 w-7 flex-none rounded-md bg-white/[0.06] animate-pulse" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3 w-20 rounded bg-white/[0.06] animate-pulse" />
                    <div className="h-2.5 w-14 rounded bg-white/[0.05] animate-pulse" />
                  </div>
                  <div className="flex-none space-y-1.5">
                    <div className="h-3 w-16 rounded bg-white/[0.06] animate-pulse" />
                    <div className="h-2.5 w-10 rounded bg-white/[0.05] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : showEmpty ? (
            <p className="text-[11px] text-ink-tertiary py-4 text-center">No transactions yet.</p>
          ) : (
            recent.map((trade) => <TransactionRow key={trade.id} trade={trade} />)
          )}
        </div>
      </div>
    </PremiumFrame>
  );
}
