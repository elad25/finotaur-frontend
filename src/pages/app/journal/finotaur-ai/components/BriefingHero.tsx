// src/pages/app/journal/finotaur-ai/components/BriefingHero.tsx
// Orchestrates the AI Coach Briefing section (Phase 4).
// Owns: heading row, stale/limit banners, insight grid, recommendations card.

import * as React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Card, Eyebrow } from '@/components/ds/Card';
import { BriefingSkeleton } from './BriefingSkeleton';
import { DailyLimitBanner } from './DailyLimitBanner';
import { InsightCard } from './InsightCard';
import { StaleBriefingBanner } from './StaleBriefingBanner';
import type { Briefing, Insight } from '../types';

dayjs.extend(relativeTime);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a concise "as of" label for the header.
 * Examples: "2h ago", "Today 10:32", "May 27 14:05"
 */
function formatRelativeTime(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) return '';
  const diffHours = dayjs().diff(d, 'hour');
  if (diffHours < 1) return d.fromNow();               // "a few minutes ago"
  if (diffHours < 24) return d.fromNow();              // "2 hours ago"
  if (d.isSame(dayjs(), 'day')) return `Today ${d.format('HH:mm')}`; // "Today 10:32"
  return d.format('MMM D HH:mm');                      // "May 27 14:05"
}

// ---------------------------------------------------------------------------
// ErrorCard — reused from ScoreHero pattern (kept local to avoid circular dep)
// ---------------------------------------------------------------------------
interface ErrorCardProps {
  error: Error;
  onRetry?: () => void;
}

function ErrorCard({ error, onRetry }: ErrorCardProps) {
  return (
    <div className="rounded-[12px] border-l-2 border-status-error bg-surface-1 p-ds-5">
      <p className="font-sans text-body text-ink-primary">Could not load briefing.</p>
      {error.message && (
        <p className="mt-ds-1 font-sans text-small text-ink-tertiary">{error.message}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-ds-2 font-sans text-small text-ink-secondary underline underline-offset-2 transition-colors duration-base hover:text-ink-primary"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface BriefingHeroProps {
  briefing: Briefing | null;
  stale: boolean;
  refreshing: boolean;
  generatedAt: string | null;
  isLoading: boolean;
  error: Error | null;
  onRefresh?: () => void;
  /** True when the last refresh attempt got a 429 daily-limit response */
  refreshing429?: boolean;
  onDiscuss?: (insight: Insight) => void;
}

// ---------------------------------------------------------------------------
// BriefingHero
// ---------------------------------------------------------------------------
export function BriefingHero({
  briefing,
  stale,
  refreshing,
  generatedAt,
  isLoading,
  error,
  onRefresh,
  refreshing429,
  onDiscuss,
}: BriefingHeroProps) {
  if (isLoading) return <BriefingSkeleton />;
  if (error) return <ErrorCard error={error} onRetry={onRefresh} />;

  // No briefing yet — render nothing; FinotaurAI page may show EmptyState above
  if (!briefing || briefing.insights.length === 0) return null;

  const featured = briefing.insights.find((i) => i.featured);
  const rest = briefing.insights.filter((i) => !i.featured);

  return (
    <section className="flex flex-col gap-ds-4">
      {/* ── Header row ───────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <Eyebrow>AI Coach Briefing</Eyebrow>
        <div className="flex items-center gap-ds-3 font-sans text-[12px] text-ink-tertiary">
          {generatedAt && (
            <span>As of {formatRelativeTime(generatedAt)}</span>
          )}
          {refreshing ? (
            <span className="text-gold-primary">Refreshing…</span>
          ) : onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="transition-colors duration-base hover:text-gold-primary"
            >
              Refresh
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Banners ──────────────────────────────────────────────────── */}
      {refreshing429 && <DailyLimitBanner />}
      {!refreshing429 && stale && !refreshing && (
        <StaleBriefingBanner onRefresh={onRefresh} />
      )}

      {/* ── Insight grid ─────────────────────────────────────────────── */}
      {/* Featured card spans 2 columns on md+, rest fill the grid */}
      <div className="grid grid-cols-1 gap-ds-4 md:grid-cols-2 xl:grid-cols-3">
        {featured && (
          <div className="md:col-span-2 xl:col-span-2">
            <InsightCard insight={featured} featured onDiscuss={onDiscuss} />
          </div>
        )}
        {rest.map((insight) => (
          <InsightCard key={insight.id} insight={insight} onDiscuss={onDiscuss} />
        ))}
      </div>

      {/* ── Recommendations card ─────────────────────────────────────── */}
      {briefing.recommendations.length > 0 && (
        <Card>
          <Eyebrow>Recommendations</Eyebrow>
          <ul className="mt-ds-3 flex flex-col gap-ds-2">
            {briefing.recommendations.map((rec, idx) => (
              <li
                key={idx}
                className="font-sans text-body text-ink-secondary leading-relaxed"
              >
                — {rec}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
