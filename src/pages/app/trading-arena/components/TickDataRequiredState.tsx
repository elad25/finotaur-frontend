/**
 * TickDataRequiredState — designed empty state for Trading Arena surfaces
 * that require a tick-level trade feed (footprint) or a live L2 order-book
 * depth feed (liquidity heatmap), for instruments where no such feed exists
 * today (stocks/forex).
 *
 * Replaces FootprintTab's one-line placeholder paragraph and LiquidityTab's
 * bare non-crypto paragraph (PR 3, task I). Visual language follows
 * LockedTab.tsx's established "no live feed" grammar (gold glow ring +
 * gradient title text) in this same tabs/ directory, extended with an
 * asset-class availability breakdown and quick-switch chips to a symbol
 * that DOES have live data. No fake/mock data is ever substituted.
 */

import { Check, Clock, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TickDataRequiredStateProps {
  /** 'footprint' = trade-tick feed copy; 'depth' = order-book depth feed copy. */
  variant: 'footprint' | 'depth';
  /** Wired to the Arena's symbol setter — omit to hide the quick-switch chips entirely. */
  onSelectSymbol?: (symbol: string) => void;
}

const QUICK_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as const;

const COPY: Record<TickDataRequiredStateProps['variant'], { title: string; sentence: string }> = {
  footprint: {
    title: 'Tick Data Feed Required',
    sentence:
      'Footprint charts are built from individual trades with aggressor side, which requires a tick-level data feed.',
  },
  depth: {
    title: 'Depth Data Feed Required',
    sentence:
      'The liquidity heatmap is built from live order-book depth, which requires a level-2 order-book data feed.',
  },
};

type AvailabilityStatus = 'live' | 'soon' | 'locked';

interface AvailabilityRow {
  label: string;
  status: AvailabilityStatus;
}

const AVAILABILITY_ROWS: AvailabilityRow[] = [
  { label: 'Crypto — Live now', status: 'live' },
  { label: 'Futures — Bring your own feed, coming soon', status: 'soon' },
  { label: 'Stocks & Forex — Requires licensed tick data', status: 'locked' },
];

function AvailabilityIcon({ status }: { status: AvailabilityStatus }) {
  if (status === 'live') {
    return (
      <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#C9A646' }} aria-hidden="true" />
    );
  }
  if (status === 'soon') {
    return <Clock className="h-3.5 w-3.5 flex-shrink-0 text-[#707070]" aria-hidden="true" />;
  }
  return <Lock className="h-3.5 w-3.5 flex-shrink-0 text-[#707070]" aria-hidden="true" />;
}

export function TickDataRequiredState({ variant, onSelectSymbol }: TickDataRequiredStateProps) {
  const { title, sentence } = COPY[variant];

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center">
        {/* Glow ring — mirrors LockedTab.tsx's established "no live feed" visual language. */}
        <div className="relative">
          <div
            className="absolute inset-0 blur-2xl opacity-20 rounded-full"
            style={{ background: 'radial-gradient(circle, #C9A646 0%, transparent 70%)' }}
            aria-hidden="true"
          />
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.04) 100%)',
              border: '1.5px solid rgba(201,166,70,0.28)',
            }}
          >
            <Lock
              className="h-7 w-7"
              style={{ color: '#C9A646', filter: 'drop-shadow(0 0 6px rgba(201,166,70,0.45))' }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div>
          <p
            className="text-lg font-semibold mb-1.5"
            style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #F4D87C 50%, #C9A646 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {title}
          </p>
          <p className="text-[13px] text-[#909090] leading-relaxed">{sentence}</p>
        </div>

        <div className="flex flex-col gap-1.5 w-full" role="list" aria-label="Feed availability by asset class">
          {AVAILABILITY_ROWS.map((row) => (
            <div
              key={row.label}
              role="listitem"
              className="flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-[11px]"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <AvailabilityIcon status={row.status} />
              <span className={cn(row.status === 'live' ? 'text-[#C9A646]' : 'text-[#909090]')}>{row.label}</span>
            </div>
          ))}
        </div>

        {onSelectSymbol && (
          <div className="flex items-center gap-1.5" role="group" aria-label="Quick-switch to a symbol with live data">
            {QUICK_SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => onSelectSymbol(sym)}
                className="h-7 rounded px-2.5 text-[11px] font-semibold text-[#707070] border border-transparent transition-all duration-150 hover:text-[#C9A646] hover:bg-[rgba(201,166,70,0.08)] hover:border-[rgba(201,166,70,0.28)]"
              >
                {sym}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
