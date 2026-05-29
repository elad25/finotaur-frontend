/**
 * CftcDisclosureBanner — NFA / CFTC Rule 4.41(b)(1) hypothetical-performance
 * disclosure as a discreet footer link.
 *
 * Compliance retained, visual prominence removed: a single small "Hypothetical
 * Performance Disclosure" link at the bottom of each backtest screen,
 * expandable on click via a native <details>/<summary> element. The full
 * regulatory text is the disclosed content; nothing else is shipped with it.
 *
 * No JS state required — <details> handles the toggle natively, accessible
 * by default, and survives reload without any persistence layer.
 *
 * The component name is preserved (it ships at the same import path used by
 * Sprint A5 mount sites) so existing callers continue to work.
 */

import React from 'react';

export interface CftcDisclosureBannerProps {
  /** Optional Tailwind class override for the outer container. */
  className?: string;
}

export const CftcDisclosureBanner: React.FC<CftcDisclosureBannerProps> = ({
  className,
}) => {
  return (
    <details
      className={`mt-8 text-amber-200/60 ${className ?? ''}`.trim()}
    >
      <summary
        className="cursor-pointer list-none text-[10px] font-medium uppercase tracking-widest text-amber-400/70 transition-colors hover:text-amber-300"
      >
        Hypothetical Performance Disclosure
      </summary>
      <p className="mt-2 max-w-3xl text-[10px] leading-relaxed text-amber-200/60">
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
    </details>
  );
};

export default CftcDisclosureBanner;
