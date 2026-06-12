// src/pages/app/ai/copilot/components/TopOpportunitiesCompactCard.tsx
// =====================================================
// TOP OPPORTUNITIES — compact list card for the dashboard Row 2.
// 3 rows: ticker + company | conviction badge (HIGH/MEDIUM) + score.
// Reads from useSynthesisBrief trade_ideas via ideaToOpportunity.
// =====================================================

import { Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumFrame } from '../brief/PremiumFrame';
import { TickerLogo } from './TickerLogo';
import { useSynthesisBrief } from '../hooks/useSynthesisBrief';
import { ideaToOpportunity, TICKER_TO_NAME } from '../utils/opportunityMapper';

// ─── Conviction badge ─────────────────────────────────────────────────────────

function ConvictionBadge({ conviction }: { conviction: string }) {
  const isHigh = conviction === 'High' || conviction === 'Medium-High';
  if (isHigh) {
    return (
      <span className="inline-flex items-center rounded-[4px] border border-gold-primary/40 bg-gold-primary/15 px-2 py-0.5 text-[9px] uppercase font-semibold text-gold-bright">
        HIGH
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-[4px] border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[9px] uppercase font-semibold text-ink-tertiary">
      MEDIUM
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  className?: string;
}

export function TopOpportunitiesCompactCard({ className }: Props) {
  const { brief, loading } = useSynthesisBrief();

  const items = brief?.trade_ideas?.length
    ? brief.trade_ideas.slice(0, 3).map((idea, i) => {
        const opp = ideaToOpportunity(idea, i);
        return {
          ticker: opp.ticker,
          company: TICKER_TO_NAME[opp.ticker] ?? opp.ticker,
          conviction: opp.confidence,
          score: opp.score,
        };
      })
    : [];

  return (
    <PremiumFrame className={`flex flex-col min-h-[280px] ${className ?? ''}`}>
      {/* pb-14 reserves space for footer */}
      <div className="flex flex-col flex-1 p-5 pb-14">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-gold-primary flex-none" />
          <p className="text-[10px] uppercase tracking-[0.12em] text-gold-primary font-semibold">
            TOP OPPORTUNITIES
          </p>
        </div>

        {/* Rows */}
        <div className="mt-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-[11px] text-ink-tertiary py-4 text-center">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-[11px] text-ink-tertiary py-4 text-center leading-relaxed">
              No live trade ideas right now.
            </p>
          ) : (
            items.map(({ ticker, company, conviction, score }) => (
              <div
                key={ticker}
                className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-3 rounded-[6px] px-2 py-2 hover:bg-gold-primary/[0.045]"
              >
                <TickerLogo ticker={ticker} size={32} className="h-8 w-8 rounded-[3px]" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{ticker}</p>
                  <p className="text-[11px] text-ink-tertiary truncate">{company}</p>
                </div>
                <ConvictionBadge conviction={conviction} />
                <div className="h-9 w-9 rounded-full border border-gold-primary/55 flex items-center justify-center font-mono text-xs text-gold-primary">
                  {score}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <Link
        to="/copilot/top-opportunities"
        className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t border-gold-primary/12 bg-gold-primary/[0.055] text-[11px] uppercase text-gold-primary transition-colors hover:bg-gold-primary/15"
      >
        View All Opportunities <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </PremiumFrame>
  );
}
