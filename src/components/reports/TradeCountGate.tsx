/**
 * TradeCountGate — full-page "unlocks at N logged trades" gate.
 *
 * Used today by the Portfolio Report (locked below 60 trades). Built
 * tier-aware-ready: pass `requiredTier` to also render a small pill next
 * to the title (e.g. "INVESTOR") for when this surface later gains a
 * platform-tier gate on top of the trade-count gate.
 */
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ds/Button';
import { cn } from '@/lib/utils';

export interface TradeCountGateProps {
  required: number;
  current: number;
  /** Optional tier pill, e.g. "INVESTOR" — rendered next to the title. */
  requiredTier?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaTo?: string;
  onClose?: () => void;
  className?: string;
}

export function TradeCountGate({
  required,
  current,
  requiredTier,
  title = 'Portfolio Report',
  subtitle,
  ctaLabel = 'Go to Journal',
  ctaTo = '/app/journal',
  onClose,
  className,
}: TradeCountGateProps) {
  const navigate = useNavigate();
  const pct = required > 0 ? Math.max(0, Math.min(100, (current / required) * 100)) : 0;
  const resolvedSubtitle = subtitle ?? `Unlocks at ${required} logged trades`;

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center bg-surface-base', className)}>
      <button
        type="button"
        onClick={() => (onClose ? onClose() : navigate('/app/home'))}
        aria-label="Back to home"
        className="absolute right-ds-5 top-ds-4 flex h-9 w-9 items-center justify-center rounded-full border-[0.5px] border-border-ds-subtle text-ink-secondary transition-colors duration-base ease-out hover:border-border-ds-default hover:text-ink-primary"
      >
        <span aria-hidden="true">×</span>
      </button>

      <div className="mx-ds-5 flex w-full max-w-sm flex-col items-center gap-ds-4 rounded-xl border-[0.5px] border-gold-border bg-surface-1 p-ds-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-border bg-surface-base text-gold-primary">
          <Lock className="h-6 w-6" aria-hidden="true" />
        </span>

        <div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-semibold text-ink-primary">{title}</h1>
            {requiredTier && (
              <span className="rounded-sm border border-gold-border bg-surface-base px-2 py-0.5 text-[10px] font-medium tracking-[1px] uppercase text-gold-primary">
                {requiredTier}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-secondary">{resolvedSubtitle}</p>
        </div>

        <div className="w-full">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-gold transition-all duration-slow ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-ds-2 font-mono text-sm tabular-nums text-ink-primary">
            <span className="text-gold-primary font-semibold">{current}</span>
            <span className="text-ink-tertiary"> / {required} trades</span>
          </p>
        </div>

        <Button variant="gold" size="default" onClick={() => navigate(ctaTo)} className="w-full">
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}

export default TradeCountGate;
