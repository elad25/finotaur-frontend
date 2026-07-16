// src/components/ai-arena/MarketStatusBadge.tsx
// =====================================================
// Fixed-position pill shown across AI Arena routes when the US equity
// market is closed. Tells the user the displayed quotes are from the
// last trading session, not live. Auto-hides when market is open.
//
// Mounted once in App.tsx (gated to `/app/ai/*` via useLocation).
// =====================================================

import { Lock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketStatus, type MarketStatus } from '@/lib/marketStatus';

export interface MarketStatusBadgeProps {
  /** Hide when market is open (default true). */
  hideWhenOpen?: boolean;
  /** Override position. Default: fixed top-right under top nav. */
  className?: string;
}

const STATUS_ICON: Record<MarketStatus, typeof Lock> = {
  'open': Clock,
  'closed-weekend': Lock,
  'closed-holiday': Lock,
  'closed-after-hours': Clock,
  'closed-pre-market': Lock,
};

export function MarketStatusBadge({ hideWhenOpen = true, className }: MarketStatusBadgeProps = {}) {
  const status = useMarketStatus();
  if (status.isOpen && hideWhenOpen) return null;

  const Icon = STATUS_ICON[status.status];
  const headline =
    status.status === 'closed-weekend' ? 'Markets Closed — Weekend' :
    status.status === 'closed-holiday' ? `Markets Closed — ${status.holidayName ?? 'Holiday'}` :
    status.status === 'closed-after-hours' ? 'After Hours' :
    status.status === 'closed-pre-market' ? 'Markets Closed' :
    'Markets Open';

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        // Fixed positioning under top nav (~64px). z-40 keeps it below modals (z-50+).
        'fixed top-[76px] right-4 z-40',
        // Pill shape + glass
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-[rgba(20,20,20,0.85)] backdrop-blur-md',
        'border border-[color:var(--gold-eyebrow-hairline,rgba(201,166,70,0.35))]',
        'shadow-[0_4px_24px_rgba(0,0,0,0.35),0_0_0_1px_rgba(201,166,70,0.15)]',
        // Text
        'text-xs font-medium text-ink-primary',
        // Subtle entrance — pure CSS, no framer dependency
        'animate-[fadeIn_240ms_ease-out]',
        className,
      )}
      title={`${status.reason}. Showing ${status.lastTradingDayLabel}.`}
      data-testid="market-status-badge"
    >
      <Icon className="w-3.5 h-3.5 text-[color:var(--gold-primary,#C9A646)]" aria-hidden="true" />
      <span className="hidden sm:inline text-ink-secondary">{headline}</span>
      <span className="sm:hidden text-ink-secondary">Closed</span>
      <span className="text-[color:var(--gold-primary,#C9A646)]">·</span>
      <span className="font-mono tabular-nums">
        Showing <span className="font-semibold">{status.lastTradingDayLabel}</span>
      </span>
    </div>
  );
}

export default MarketStatusBadge;
