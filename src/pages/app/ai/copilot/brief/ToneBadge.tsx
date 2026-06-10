/**
 * ToneBadge — small pill badge mapping semantic tone to DS tokens.
 *
 * Tone rules (FINOTAUR DS — green does not exist):
 *  positive → text-ink-primary on faint gold bg (white = positive, never green)
 *  negative → text-num-negative
 *  watch    → text-gold-primary (alert/caution, not danger)
 *  neutral  → text-ink-secondary on subtle surface
 *
 * Typography: uppercase, tight tracking, 9px — matches existing inline chips
 * in CopilotSectionPages and FinotaurCopilotDashboard.
 */

import { cn } from '@/lib/utils';

export type Tone = 'positive' | 'negative' | 'neutral' | 'watch';

interface ToneBadgeProps {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<Tone, string> = {
  positive: [
    'text-ink-primary',
    'bg-gold-primary/[0.08]',
    'border-gold-primary/20',
  ].join(' '),
  negative: [
    'text-num-negative',
    'bg-num-negative/[0.07]',
    'border-num-negative/25',
  ].join(' '),
  watch: [
    'text-gold-primary',
    'bg-gold-primary/[0.055]',
    'border-gold-primary/18',
  ].join(' '),
  neutral: [
    'text-ink-secondary',
    'bg-white/[0.04]',
    'border-white/[0.08]',
  ].join(' '),
};

export function ToneBadge({ tone, children, className }: ToneBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center',
        'rounded-sm border',
        'px-1.5 py-0.5',
        'text-[9px] font-semibold uppercase tracking-[0.07em]',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export default ToneBadge;
