/**
 * StockLogo — reusable ticker logo component.
 *
 * Mirrors the self-hosted logo store pattern from StockAnalyzerHero:
 * fetches from the `stock-logo` edge function (which lazily caches logos
 * in Supabase storage). Falls back to a two-letter monogram on double error.
 */

import { useState } from 'react';

interface StockLogoProps {
  ticker: string;
  size?: number; // px, default 40
  className?: string;
}

export function StockLogo({ ticker, size = 40, className }: StockLogoProps) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const logoSrc = supabaseUrl
    ? `${supabaseUrl}/functions/v1/stock-logo?symbol=${encodeURIComponent(ticker)}`
    : null;

  const [failed, setFailed] = useState(false);
  const [retried, setRetried] = useState(false);

  function handleError() {
    if (!retried) {
      setRetried(true);
    } else {
      setFailed(true);
    }
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-surface-1 border border-border-ds-subtle${className ? ` ${className}` : ''}`}
    >
      {logoSrc && !failed ? (
        <img
          src={retried ? `${logoSrc}?retry=1` : logoSrc}
          alt={ticker}
          loading="lazy"
          className="h-full w-full object-contain p-1"
          onError={handleError}
        />
      ) : (
        <span
          className="font-mono font-semibold text-gold-primary leading-none select-none"
          style={{ fontSize: Math.round(size * 0.35) }}
        >
          {ticker.slice(0, 2)}
        </span>
      )}
    </div>
  );
}

export default StockLogo;
