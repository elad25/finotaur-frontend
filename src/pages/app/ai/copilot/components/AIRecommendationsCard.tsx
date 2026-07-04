// src/pages/app/ai/copilot/components/AIRecommendationsCard.tsx
// =====================================================
// AI RECOMMENDATIONS card — macro-driven portfolio guidance from sector_calls.
// Maps:  OW → "Add {sector} exposure"  → DO   (green)
//        UW → "Reduce {sector} exposure" → AVOID (red)
//        MW → "Hold {sector} neutral"  → HOLD  (amber)
// Sorted: OW/UW first (conviction), then MW; within each group, brief order.
// =====================================================

import { CirclePlus, CircleMinus, Minus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumFrame } from '../brief/PremiumFrame';
import { useSynthesisBrief } from '../hooks/useSynthesisBrief';
import { useHoldingVerdicts } from '../hooks/useHoldingVerdicts';
import { VerdictBadge } from './VerdictBadge';
import type { SectorCall } from '@/services/copilotSynthesisBriefApi';

// ─── Badge ────────────────────────────────────────────────────────────────────

type ActionLabel = 'DO' | 'AVOID' | 'HOLD';

function ActionBadge({ action }: { action: ActionLabel }) {
  if (action === 'DO') {
    return (
      <div className="flex items-center gap-1.5 flex-none">
        <CirclePlus className="h-3.5 w-3.5 text-[#4F9D6B]" />
        <span className="inline-flex items-center rounded-[4px] border border-[#4F9D6B]/40 bg-[#4F9D6B]/15 px-2 py-0.5 text-[9px] uppercase font-semibold text-[#4F9D6B]">
          DO
        </span>
      </div>
    );
  }
  if (action === 'AVOID') {
    return (
      <div className="flex items-center gap-1.5 flex-none">
        <CircleMinus className="h-3.5 w-3.5 text-[#C25450]" />
        <span className="inline-flex items-center rounded-[4px] border border-[#C25450]/40 bg-[#C25450]/15 px-2 py-0.5 text-[9px] uppercase font-semibold text-[#E87070]">
          AVOID
        </span>
      </div>
    );
  }
  // HOLD
  return (
    <div className="flex items-center gap-1.5 flex-none">
      <Minus className="h-3.5 w-3.5 text-gold-primary" />
      <span className="inline-flex items-center rounded-[4px] border border-gold-primary/35 bg-gold-primary/10 px-2 py-0.5 text-[9px] uppercase font-semibold text-gold-primary">
        HOLD
      </span>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stanceToAction(stance: SectorCall['stance']): ActionLabel {
  if (stance === 'OW') return 'DO';
  if (stance === 'UW') return 'AVOID';
  return 'HOLD';
}

function stanceToText(stance: SectorCall['stance'], sector: string): string {
  if (stance === 'OW') return `Add ${sector} exposure`;
  if (stance === 'UW') return `Reduce ${sector} exposure`;
  return `Hold ${sector} neutral`;
}

/** OW and UW before MW (conviction calls first); within each group preserve brief order. */
function sortCalls(calls: SectorCall[]): SectorCall[] {
  return [...calls].sort((a, b) => {
    const rank = (s: SectorCall['stance']) => (s === 'MW' ? 1 : 0);
    return rank(a.stance) - rank(b.stance);
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AIRecommendationsCard({ className }: Props) {
  const { brief, loading } = useSynthesisBrief();
  const { verdicts, loading: verdictsLoading } = useHoldingVerdicts();

  const calls = sortCalls(brief?.sector_calls ?? []).slice(0, 3);
  const topVerdicts = verdicts.slice(0, 5);

  return (
    <PremiumFrame className={`flex flex-col min-h-[280px] ${className ?? ''}`}>
      {/* pb-14 reserves space for footer; overflow-y-auto keeps card height reasonable when both sections render */}
      <div className="flex flex-col flex-1 overflow-y-auto p-5 pb-14">
        {/* Header */}
        <p className="text-[10px] uppercase tracking-[0.12em] text-gold-primary font-semibold">
          AI RECOMMENDATIONS
        </p>

        {/* Rows — macro sector calls */}
        <div className="mt-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-[11px] text-ink-tertiary py-4 text-center">Loading…</p>
          ) : calls.length === 0 ? (
            <p className="text-[11px] text-ink-tertiary py-4 text-center">
              No macro positioning calls available.
            </p>
          ) : (
            calls.map((call) => {
              const action = stanceToAction(call.stance);
              const actionText = stanceToText(call.stance, call.sector);
              return (
                <div
                  key={`${call.sector}-${call.stance}`}
                  className="flex items-start justify-between gap-3 rounded-[6px] px-2 py-2 hover:bg-gold-primary/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white leading-snug">{actionText}</p>
                    <p className="text-[11px] text-ink-tertiary leading-snug truncate mt-0.5">
                      {call.rationale}
                    </p>
                  </div>
                  <ActionBadge action={action} />
                </div>
              );
            })
          )}
        </div>

        {/* Portfolio verdicts — per-holding BUY MORE / HOLD / TRIM / EXIT / HEDGE */}
        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-[0.12em] text-gold-primary font-semibold">
            PORTFOLIO VERDICTS
          </p>
          <div className="mt-3 flex flex-col gap-2.5">
            {verdictsLoading ? (
              <p className="text-[11px] text-ink-tertiary py-2 text-center">Loading…</p>
            ) : topVerdicts.length === 0 ? (
              <p className="text-[11px] text-ink-tertiary py-2 text-center">
                Portfolio verdicts will appear after the next weekly analysis.
              </p>
            ) : (
              topVerdicts.map((v) => (
                <div
                  key={v.symbol}
                  className="flex items-start justify-between gap-3 rounded-[6px] px-2 py-1.5 hover:bg-gold-primary/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white leading-snug">{v.symbol}</p>
                    {v.rationale && (
                      <p className="text-[11px] text-ink-tertiary leading-snug truncate mt-0.5">
                        {v.rationale}
                      </p>
                    )}
                  </div>
                  <VerdictBadge verdict={v.verdict} confidence={v.confidence} className="flex-none mt-0.5" />
                </div>
              ))
            )}
          </div>
          {topVerdicts.length > 0 && (
            <Link
              to="/copilot/holdings"
              className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-gold-primary hover:text-gold-bright transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Footer */}
      <Link
        to="/copilot/macro"
        className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t border-gold-primary/12 bg-gold-primary/[0.055] text-[11px] uppercase text-gold-primary transition-colors hover:bg-gold-primary/15"
      >
        View Full Breakdown <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </PremiumFrame>
  );
}
