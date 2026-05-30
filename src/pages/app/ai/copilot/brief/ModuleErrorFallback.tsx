/**
 * ModuleErrorFallback — compact per-module error card for use as
 * ErrorBoundary `fallback` prop on individual BriefModules.
 *
 * Intentionally small: a single PremiumFrame card, not a full-screen error.
 * Copy is English-only per FINOTAUR iron rule.
 */

import { PremiumFrame } from './PremiumFrame';
import { Eyebrow } from '@/components/ds/Card';

interface ModuleErrorFallbackProps {
  /** The section eyebrow label, e.g. "MARKET PULSE" — shown for context */
  eyebrow: string;
}

export function ModuleErrorFallback({ eyebrow }: ModuleErrorFallbackProps) {
  return (
    <PremiumFrame>
      <div className="px-ds-4 py-ds-3 flex items-start gap-ds-3">
        {/* Small red marker */}
        <div className="flex-none mt-0.5 h-5 w-5 flex items-center justify-center rounded-[4px] border border-num-negative/30 bg-num-negative/[0.07]">
          <span className="h-1.5 w-1.5 rounded-full bg-num-negative/70" />
        </div>

        <div className="min-w-0">
          <Eyebrow className="block mb-1">{eyebrow}</Eyebrow>
          <p className="text-sm font-medium text-ink-primary">
            This section couldn't load right now.
          </p>
          <p className="mt-1 text-xs text-ink-secondary">
            Try refreshing the page.
          </p>
        </div>
      </div>
    </PremiumFrame>
  );
}

export default ModuleErrorFallback;
