// src/pages/app/ai/copilot/components/TopHoldingsCard.tsx
// =====================================================
// TOP HOLDINGS card — up to 5 holdings sorted by weight, plus CASH row.
// =====================================================

import { DollarSign, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumFrame } from '../brief/PremiumFrame';
import { TickerLogo } from './TickerLogo';
import { useValuePrivacy } from '../hooks/useValuePrivacy';
import type { PortfolioSnapshot, Holding } from '../hooks/usePortfolioData';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  snapshot: PortfolioSnapshot;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TopHoldingsCard({ snapshot, className }: Props) {
  const [hideValues] = useValuePrivacy();

  const total = snapshot.totalValue || 1;

  // Separate cash from equity holdings.
  const cashHoldings = snapshot.holdings.filter(
    (h) => (h.assetClass ?? '').toUpperCase() === 'CASH',
  );
  const equityHoldings = snapshot.holdings.filter(
    (h) => (h.assetClass ?? '').toUpperCase() !== 'CASH',
  );

  const cashValue = cashHoldings.reduce((s, h) => s + h.marketValue, 0);

  // Top 5 equity holdings by market value descending.
  const top5: Holding[] = [...equityHoldings]
    .sort((a, b) => Math.abs(b.marketValue) - Math.abs(a.marketValue))
    .slice(0, 5);

  const isEmpty = snapshot.holdings.length === 0;

  return (
    <PremiumFrame className={`flex flex-col min-h-[280px] ${className ?? ''}`}>
      {/* pb-14 reserves space for footer */}
      <div className="flex flex-col flex-1 p-5 pb-14">
        {/* Header */}
        <p className="text-[10px] uppercase tracking-[0.12em] text-gold-primary font-semibold">
          TOP HOLDINGS
        </p>

        {/* Rows */}
        <div className="mt-4 flex flex-col gap-2">
          {isEmpty ? (
            <p className="text-[11px] text-ink-tertiary py-4 text-center">
              No holdings to display.
            </p>
          ) : (
            <>
              {top5.map((h) => {
                const weight = (Math.abs(h.marketValue) / total) * 100;
                return (
                  <div
                    key={h.symbol}
                    className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-gold-primary/[0.04]"
                  >
                    <TickerLogo ticker={h.symbol} size={26} className="h-[26px] w-[26px] flex-none rounded-[3px]" />
                    <span className="flex-1 text-sm font-semibold text-white truncate min-w-0">
                      {h.symbol}
                    </span>
                    <span className="text-[12px] text-ink-tertiary tabular-nums">
                      {hideValues ? '**' : fmtPct(weight)}
                    </span>
                  </div>
                );
              })}

              {/* CASH row — shown when cash > 0 */}
              {cashValue > 0 && (
                <div className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-gold-primary/[0.04]">
                  <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[3px] bg-[#4F9D6B]/20">
                    <DollarSign className="h-3.5 w-3.5 text-[#4F9D6B]" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-white truncate min-w-0">
                    CASH
                  </span>
                  <span className="text-[12px] text-ink-tertiary tabular-nums">
                    {hideValues ? '**' : fmtPct((cashValue / total) * 100)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <Link
        to="/copilot/holdings"
        className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t border-gold-primary/12 bg-gold-primary/[0.055] text-[11px] uppercase text-gold-primary transition-colors hover:bg-gold-primary/15"
      >
        View All Holdings <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </PremiumFrame>
  );
}
