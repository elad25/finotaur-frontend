// src/components/macro/DataFreshness.tsx
// Tiny freshness/stale badge for macro data. Pure, no external deps beyond React.
// Renders null when asOf is missing or unparseable.

import type { JSX } from 'react';

export interface DataFreshnessProps {
  /** ISO string, ms epoch, or Date representing when data was last fetched/updated */
  asOf?: string | number | Date | null;
  /** Age in hours beyond which data is considered stale (default 36) */
  ttlHours?: number;
  /** Optional hint shown as a subtle dot */
  source?: 'live' | 'cache';
  className?: string;
}

function parseDate(asOf: string | number | Date | null | undefined): Date | null {
  if (asOf == null) return null;
  if (asOf instanceof Date) return isNaN(asOf.getTime()) ? null : asOf;
  const d = new Date(asOf);
  return isNaN(d.getTime()) ? null : d;
}

function formatShortDate(d: Date): string {
  const now = new Date();
  const ageMs = now.getTime() - d.getTime();
  const ageHours = ageMs / 3_600_000;

  if (ageHours < 24) {
    // Show time-of-day for data less than 24 h old
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DataFreshness({
  asOf,
  ttlHours = 36,
  source,
  className,
}: DataFreshnessProps): JSX.Element | null {
  // Compute inside render — never at module scope (per spec).
  const parsed = parseDate(asOf);
  if (!parsed) return null;

  const now = new Date();
  const ageHours = (now.getTime() - parsed.getTime()) / 3_600_000;
  const isStale = ageHours > ttlHours;
  const shortDate = formatShortDate(parsed);

  if (isStale) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-amber-500 ${className ?? ''}`}
      >
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
        />
        Stale · as of {shortDate}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-white/40 ${className ?? ''}`}
    >
      {source === 'live' && (
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
        />
      )}
      {source === 'cache' && (
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0"
        />
      )}
      as of {shortDate}
    </span>
  );
}

export default DataFreshness;
