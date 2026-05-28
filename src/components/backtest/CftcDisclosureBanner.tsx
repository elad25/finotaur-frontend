/**
 * CftcDisclosureBanner — NFA / CFTC Rule 4.41(b)(1) hypothetical-performance
 * disclosure. Required on all backtest screens before public launch.
 *
 * Dismissible per-user via localStorage. Once dismissed the banner stays
 * hidden until localStorage is cleared. Key includes userId so
 * multi-account setups on the same browser each see the banner once.
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export interface CftcDisclosureBannerProps {
  /** Optional Tailwind class override for the outer container */
  className?: string;
}

const STORAGE_PREFIX = 'finotaur:cftc-disclosure-dismissed';

function getStorageKey(userId: string | undefined): string {
  return `${STORAGE_PREFIX}:${userId ?? 'anon'}`;
}

function readDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    // localStorage may be unavailable in some environments
    return false;
  }
}

function writeDismissed(key: string): void {
  try {
    localStorage.setItem(key, 'true');
  } catch {
    // ignore write failures
  }
}

export const CftcDisclosureBanner: React.FC<CftcDisclosureBannerProps> = ({
  className,
}) => {
  const { user } = useAuth();
  const storageKey = getStorageKey(user?.id);

  const [dismissed, setDismissed] = useState<boolean>(() =>
    readDismissed(storageKey)
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    writeDismissed(storageKey);
    setDismissed(true);
  };

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 ${className ?? ''}`}
    >
      <AlertTriangle
        size={16}
        className="mt-0.5 shrink-0 text-amber-400/80"
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
          Hypothetical Performance Disclosure
        </p>
        <p className="text-[11px] leading-relaxed text-amber-200/90">
          HYPOTHETICAL OR SIMULATED PERFORMANCE RESULTS HAVE CERTAIN
          LIMITATIONS. UNLIKE AN ACTUAL PERFORMANCE RECORD, SIMULATED RESULTS
          DO NOT REPRESENT ACTUAL TRADING. ALSO, SINCE THE TRADES HAVE NOT BEEN
          EXECUTED, THE RESULTS MAY HAVE UNDER-OR-OVER COMPENSATED FOR THE
          IMPACT, IF ANY, OF CERTAIN MARKET FACTORS, SUCH AS LACK OF LIQUIDITY.
          SIMULATED TRADING PROGRAMS IN GENERAL ARE ALSO SUBJECT TO THE FACT
          THAT THEY ARE DESIGNED WITH THE BENEFIT OF HINDSIGHT. NO
          REPRESENTATION IS BEING MADE THAT ANY ACCOUNT WILL OR IS LIKELY TO
          ACHIEVE PROFITS OR LOSSES SIMILAR TO THOSE SHOWN.
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-xs font-medium text-amber-400 transition-colors hover:text-amber-300"
        aria-label="Dismiss disclosure"
      >
        Got it
      </button>
    </div>
  );
};

export default CftcDisclosureBanner;
