/**
 * ScoreRing — circular 0-100 gauge using the FINOTAUR gold conic-gradient standard.
 *
 * Uses the gold conic pattern from FinotaurCopilotDashboard InsightsPanel
 * (not the green variant from CopilotSectionPages — green does not exist in the DS).
 *
 * Sizes:
 *  sm  — 40px  (compact badge contexts)
 *  md  — 58px  (default, glance-row usage)
 *  lg  — 80px  (featured/hero contexts)
 */

import { cn } from '@/lib/utils';

type ScoreRingSize = 'sm' | 'md' | 'lg';

interface ScoreRingProps {
  value: number;        // 0-100
  size?: ScoreRingSize;
  label?: string;       // optional text override; defaults to the numeric value
  className?: string;
}

const SIZE_MAP: Record<ScoreRingSize, { outer: string; inner: string; text: string; pad: string }> = {
  sm: {
    outer: 'h-10 w-10',
    inner: 'rounded-full bg-[#090704]',
    text:  'font-mono text-sm font-bold',
    pad:   'p-[4px]',
  },
  md: {
    outer: 'h-[58px] w-[58px]',
    inner: 'rounded-full bg-[#090704]',
    text:  'font-mono text-lg font-bold',
    pad:   'p-[5px]',
  },
  lg: {
    outer: 'h-20 w-20',
    inner: 'rounded-full bg-[#090704]',
    text:  'font-mono text-2xl font-bold',
    pad:   'p-[6px]',
  },
};

export function ScoreRing({ value, size = 'md', label, className }: ScoreRingProps) {
  // Clamp to [0, 100]
  const clamped = Math.max(0, Math.min(100, value));
  const deg = clamped * 3.6; // 100 → 360deg

  const { outer, inner, text, pad } = SIZE_MAP[size];

  return (
    <div
      className={cn('relative flex items-center justify-center', outer, className)}
      aria-label={`Score: ${clamped} out of 100`}
      role="img"
    >
      {/* Conic gold ring — filled arc from gold-bright → gold-primary → gold-deep */}
      <div
        className={cn('absolute inset-0 rounded-full shadow-[0_0_16px_rgba(201,166,70,0.22)]', pad)}
        style={{
          background: `conic-gradient(
            from 0deg,
            var(--gold-bright) 0deg,
            var(--gold-primary) ${deg * 0.5}deg,
            var(--gold-deep) ${deg}deg,
            rgba(255,255,255,0.08) ${deg}deg 360deg
          )`,
        }}
      >
        <div className={cn('h-full w-full', inner)} />
      </div>

      {/* Score label — gold gradient text */}
      <span
        className={cn(
          'relative tabular-nums',
          'bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text text-transparent',
          text,
        )}
      >
        {label ?? clamped}
      </span>
    </div>
  );
}

export default ScoreRing;
