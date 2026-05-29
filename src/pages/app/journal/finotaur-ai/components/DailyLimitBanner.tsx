// src/pages/app/journal/finotaur-ai/components/DailyLimitBanner.tsx
// Phase 5b — informational banner driven by /api/journal-ai/usage data.
// Renders ONLY when there is something worth flagging:
//   - briefing refreshes exhausted
//   - journal_coach calls at >=80% of cap
// When usage is absent or healthy, returns null.

import * as React from 'react';
import type { UsageResponse } from '../types';

interface DailyLimitBannerProps {
  /** Usage payload from /api/journal-ai/usage. When undefined or null,
   *  the banner renders nothing (graceful fallback for older callsites). */
  usage?: UsageResponse | null;
}

function formatResetTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function DailyLimitBanner({ usage }: DailyLimitBannerProps): JSX.Element | null {
  const today = usage?.today;
  const resetLabel = formatResetTime(usage?.resets_at);

  const refreshesUsed = today?.briefing_refreshes_used;
  const refreshesMax = today?.briefing_refreshes_max;
  const refreshExhausted =
    typeof refreshesUsed === 'number' &&
    typeof refreshesMax === 'number' &&
    refreshesMax > 0 &&
    refreshesUsed >= refreshesMax;

  const callsUsed = today?.journal_coach_calls_used;
  const callsMax = today?.journal_coach_calls_max;
  const callsRemaining =
    typeof callsUsed === 'number' && typeof callsMax === 'number'
      ? Math.max(callsMax - callsUsed, 0)
      : null;
  const callsNearLimit =
    callsRemaining !== null && callsMax !== undefined && callsRemaining <= Math.max(1, Math.floor(callsMax * 0.2));

  if (!refreshExhausted && !callsNearLimit) return null;

  const parts: string[] = [];
  if (refreshExhausted) {
    parts.push(`Daily briefing refresh used (${refreshesUsed}/${refreshesMax})`);
  }
  if (callsNearLimit && callsRemaining !== null) {
    parts.push(
      callsRemaining === 0
        ? `AI requests exhausted (${callsUsed}/${callsMax})`
        : `${callsRemaining} AI request${callsRemaining === 1 ? '' : 's'} left today`,
    );
  }
  const message = parts.join(' · ');
  const resetSuffix = resetLabel ? ` Resets at ${resetLabel}.` : '';

  return (
    <div
      role="status"
      className="flex items-center rounded-[4px] border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-2 font-sans text-small text-ink-tertiary"
    >
      {message}.{resetSuffix}
    </div>
  );
}
