/**
 * Bespoke loading skeleton for /app/journal/backtest/results (Playbook).
 *
 * Mirrors the real layout:
 *   1. Header — "Playbook" title + strategy count + "New strategy" button
 *   2. Strategy cards grid — 3 cols, each with name, stats row, sparkline,
 *      and "Open" button
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonChart,
} from "@/components/skeletons/shell";

export function JournalBacktestResultsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* 1. Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* 2. Cards grid — 3 cols */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 border-t border-border-ds-subtle pt-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <Skeleton className="h-2.5 w-14" />
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </div>

            {/* Sparkline */}
            <SkeletonChart height="h-[80px]" />

            {/* CTA */}
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
