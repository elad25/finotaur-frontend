// src/pages/app/journal/finotaur-ai/components/StaleBriefingBanner.tsx
// Inline banner shown when briefing data is stale and not currently refreshing.
// Ghost-link style for the action — no gold (gold is reserved for confirm CTAs).

import * as React from 'react';

interface StaleBriefingBannerProps {
  onRefresh?: () => void;
}

export function StaleBriefingBanner({ onRefresh }: StaleBriefingBannerProps) {
  return (
    <div className="flex items-center gap-ds-2 rounded-[4px] border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-2 font-sans text-small text-ink-tertiary">
      <span>Briefing may be outdated.</span>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="underline underline-offset-2 transition-colors duration-base hover:text-ink-secondary"
        >
          Refresh now
        </button>
      )}
    </div>
  );
}
