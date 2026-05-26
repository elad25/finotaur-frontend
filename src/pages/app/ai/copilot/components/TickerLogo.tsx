// Shared logo renderer with letter-avatar fallback.
// Use anywhere a copilot surface wants to show a ticker's brand mark.
//
// Falls back gracefully when:
//   • getCompanyLogo returns null (empty ticker)
//   • the remote image fails to load (network error, 404, etc.)

import { useState } from 'react';
import { getCompanyLogo } from '../utils/companyLogo';

interface Props {
  ticker: string;
  size?: number;            // px — applied to both width and height of the image
  className?: string;       // forwarded to the wrapper
  letterClassName?: string; // styling for the letter fallback
}

export function TickerLogo({
  ticker,
  size = 28,
  className = '',
  letterClassName = 'font-mono text-base text-gold-primary',
}: Props) {
  const [failed, setFailed] = useState(false);
  const url = getCompanyLogo(ticker);

  if (!url || failed) {
    return (
      <span className={`${letterClassName} ${className}`}>
        {ticker.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={ticker}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
