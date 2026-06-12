// src/pages/app/ai/copilot/components/AIRecommendationsCard.tsx
// =====================================================
// AI RECOMMENDATIONS card — top 3 trade ideas from useSynthesisBrief.
// Action badge: BUY (green), HOLD (amber), SELL (red).
// Derives action from conviction + source: high/war_zone = BUY, medium = HOLD, low = SELL.
// =====================================================

import { CirclePlus, CircleMinus, Minus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumFrame } from '../brief/PremiumFrame';
import { TickerLogo } from './TickerLogo';
import { useSynthesisBrief } from '../hooks/useSynthesisBrief';
import { TICKER_TO_NAME } from '../utils/opportunityMapper';
import type { TradeIdea } from '@/services/copilotSynthesisBriefApi';

// ─── Action derivation ────────────────────────────────────────────────────────

type ActionLabel = 'BUY' | 'HOLD' | 'SELL';

function deriveAction(idea: TradeIdea): ActionLabel {
  const c = idea.conviction?.toLowerCase();
  if (c === 'high') return 'BUY';
  if (c === 'low')  return 'SELL';
  return 'HOLD'; // medium
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: ActionLabel }) {
  if (action === 'BUY') {
    return (
      <div className="flex items-center gap-1.5">
        <CirclePlus className="h-3.5 w-3.5 text-[#4F9D6B]" />
        <span className="inline-flex items-center rounded-[4px] border border-[#4F9D6B]/40 bg-[#4F9D6B]/15 px-2 py-0.5 text-[9px] uppercase font-semibold text-[#4F9D6B]">
          BUY
        </span>
      </div>
    );
  }
  if (action === 'SELL') {
    return (
      <div className="flex items-center gap-1.5">
        <CircleMinus className="h-3.5 w-3.5 text-[#C25450]" />
        <span className="inline-flex items-center rounded-[4px] border border-[#C25450]/40 bg-[#C25450]/15 px-2 py-0.5 text-[9px] uppercase font-semibold text-[#E87070]">
          SELL
        </span>
      </div>
    );
  }
  // HOLD
  return (
    <div className="flex items-center gap-1.5">
      <Minus className="h-3.5 w-3.5 text-gold-primary" />
      <span className="inline-flex items-center rounded-[4px] border border-gold-primary/35 bg-gold-primary/10 px-2 py-0.5 text-[9px] uppercase font-semibold text-gold-primary">
        HOLD
      </span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  className?: string;
}

export function AIRecommendationsCard({ className }: Props) {
  const { brief, loading } = useSynthesisBrief();

  const ideas = brief?.trade_ideas?.slice(0, 3) ?? [];

  return (
    <PremiumFrame className={`flex flex-col min-h-[280px] ${className ?? ''}`}>
      {/* pb-14 reserves space for footer */}
      <div className="flex flex-col flex-1 p-5 pb-14">
        {/* Header */}
        <p className="text-[10px] uppercase tracking-[0.12em] text-gold-primary font-semibold">
          AI RECOMMENDATIONS
        </p>

        {/* Rows */}
        <div className="mt-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-[11px] text-ink-tertiary py-4 text-center">Loading…</p>
          ) : ideas.length === 0 ? (
            <p className="text-[11px] text-ink-tertiary py-4 text-center">
              No recommendations right now.
            </p>
          ) : (
            ideas.map((idea) => {
              const action = deriveAction(idea);
              const name = TICKER_TO_NAME[idea.symbol] ?? idea.symbol;
              return (
                <div
                  key={idea.symbol}
                  className="flex items-center justify-between gap-3 rounded-[6px] px-2 py-2 hover:bg-gold-primary/[0.04]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TickerLogo ticker={idea.symbol} size={28} className="h-7 w-7 flex-none rounded-[3px]" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white leading-snug">{idea.symbol}</p>
                      <p className="text-[11px] text-ink-tertiary leading-snug truncate">{name}</p>
                    </div>
                  </div>
                  <div className="flex-none">
                    <ActionBadge action={action} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <Link
        to="/copilot/ai-analyst"
        className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t border-gold-primary/12 bg-gold-primary/[0.055] text-[11px] uppercase text-gold-primary transition-colors hover:bg-gold-primary/15"
      >
        View All Recommendations <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </PremiumFrame>
  );
}
