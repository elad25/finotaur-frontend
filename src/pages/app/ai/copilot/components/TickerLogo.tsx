// Shared logo renderer with letter-avatar fallback.
// Use anywhere a copilot surface wants to show a ticker's brand mark.
//
// Load order:
//   1. Primary URL (FMP) — fast, works for most major US tickers
//   2. Fallback URL (logo.dev) — second attempt on primary failure
//   3. Letter avatar — gold-tinted rounded box with first character

import { useState } from 'react';
import { getCompanyLogo, getCompanyLogoFallback } from '../utils/companyLogo';

interface Props {
  ticker: string;
  size?: number;            // px — applied to both width and height of the image
  className?: string;       // forwarded to the wrapper / img element
  letterClassName?: string; // extra classes for the letter fallback span
}

export function TickerLogo({
  ticker,
  size = 28,
  className = '',
  letterClassName,
}: Props) {
  const [stage, setStage] = useState<'primary' | 'fallback' | 'letter'>('primary');
  const primary = getCompanyLogo(ticker);
  const fallback = getCompanyLogoFallback(ticker);

  if (stage === 'letter' || !primary) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-md bg-gold-primary/12 ${letterClassName ?? 'font-mono text-sm font-semibold text-gold-primary'} ${className}`}
        style={{ width: size, height: size }}
      >
        {ticker.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  const url = stage === 'primary' ? primary : fallback;
  return (
    <img
      src={url}
      alt={ticker}
      width={size}
      height={size}
      className={`rounded-md object-contain ${className}`}
      onError={() => setStage(stage === 'primary' && fallback ? 'fallback' : 'letter')}
      loading="lazy"
    />
  );
}
