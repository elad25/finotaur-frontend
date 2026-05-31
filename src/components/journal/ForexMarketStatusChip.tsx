// src/components/journal/ForexMarketStatusChip.tsx
// =====================================================
// Inline pill showing whether the spot FX market is currently open.
// Unlike the equity MarketStatusBadge (fixed, screen-level), this is an
// inline chip mounted INSIDE forex trade views only (TradeDetail forex
// card, MyTrades forex dialog) — the journal is multi-asset, so a global
// badge would wrongly tell equity-only users "forex closed".
// =====================================================

import { Lock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForexMarketStatus } from '@/lib/forexMarketStatus';

export interface ForexMarketStatusChipProps {
  className?: string;
}

export function ForexMarketStatusChip({ className }: ForexMarketStatusChipProps = {}) {
  const status = useForexMarketStatus();
  const open = status.isOpen;
  const Icon = open ? Clock : Lock;

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-[11px] font-medium border',
        open
          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          : 'bg-zinc-500/10 text-zinc-400 border-zinc-600/40',
        className,
      )}
      title={open ? status.reason : `${status.reason}. Opens ${status.nextOpen ? 'Sun 5 PM ET' : 'soon'}.`}
      data-testid="forex-market-status-chip"
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {open ? 'FX Open' : 'FX Closed'}
    </span>
  );
}

export default ForexMarketStatusChip;
