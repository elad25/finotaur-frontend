// src/pages/app/journal/finotaur-ai/components/DailyLimitBanner.tsx
// Informational banner shown when the user has hit the daily refresh limit (429).
// No action button — purely informational.

import * as React from 'react';

export function DailyLimitBanner() {
  return (
    <div className="flex items-center rounded-[4px] border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-2 font-sans text-small text-ink-tertiary">
      You&apos;ve used your manual refresh for today (1/1). Resets at 02:00 IL.
    </div>
  );
}
