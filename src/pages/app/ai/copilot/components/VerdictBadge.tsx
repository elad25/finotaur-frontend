// src/pages/app/ai/copilot/components/VerdictBadge.tsx
// Compact pill for a per-holding verdict (BUY_MORE / HOLD / TRIM / EXIT / HEDGE).
// Reuses the same semantic tone tokens as AIRecommendationsCard's DO/AVOID/HOLD
// badges and FundamentalsGradeBadge's tier borders — no new visual language.

import { cn } from '@/lib/utils';
import type { VerdictType } from '@/services/copilotVerdictsApi';

const VERDICT_LABEL: Record<VerdictType, string> = {
  BUY_MORE: 'BUY MORE',
  HOLD: 'HOLD',
  TRIM: 'TRIM',
  EXIT: 'EXIT',
  HEDGE: 'HEDGE',
};

// Tone classes reused from existing conventions in this codebase:
// - BUY_MORE: emerald, matches AIRecommendationsCard's "DO" (#4F9D6B) family.
// - HOLD: gold-primary, matches AIRecommendationsCard's "HOLD" tone.
// - TRIM: amber (#f5a623), matches FundamentalsGradeBadge's mid tier.
// - EXIT: red, matches AIRecommendationsCard's "AVOID" (#C25450) family + num-negative.
// - HEDGE: violet, matches HoldingsTable's BADGE_PALETTE violet entry.
const VERDICT_TONE_CLASS: Record<VerdictType, string> = {
  BUY_MORE: 'border-[#4F9D6B]/40 bg-[#4F9D6B]/15 text-[#4F9D6B]',
  HOLD: 'border-gold-primary/35 bg-gold-primary/10 text-gold-primary',
  TRIM: 'border-[#f5a623]/35 bg-[#f5a623]/10 text-[#f5a623]',
  EXIT: 'border-[#C25450]/40 bg-[#C25450]/15 text-[#E87070]',
  HEDGE: 'border-violet-500/30 bg-violet-500/15 text-violet-400',
};

interface Props {
  verdict: VerdictType;
  confidence?: number | null;
  className?: string;
}

/** Compact pill showing a holding's verdict, with confidence in the title tooltip when present. */
export function VerdictBadge({ verdict, confidence, className }: Props) {
  const label = VERDICT_LABEL[verdict];
  const tone = VERDICT_TONE_CLASS[verdict];
  const title =
    confidence != null ? `${label} · confidence ${Math.round(confidence)}%` : label;

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[9px] uppercase font-semibold tracking-wide whitespace-nowrap',
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
