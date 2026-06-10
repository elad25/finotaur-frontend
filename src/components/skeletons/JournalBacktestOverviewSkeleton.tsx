/**
 * Bespoke loading skeleton for /app/journal/backtest/overview.
 *
 * Mirrors the real backtest overview layout:
 *   1. Header — "Backtest Overview" title + subtitle + action buttons
 *   2. KPI row — 6 stats (Net P&L, Trades, Win Rate, Sharpe, Max DD, Calmar)
 *   3. Equity curve chart (full-width)
 *   4. Two-column: trade scatter by time (left) + monthly returns table (right)
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonChart,
} from "@/components/skeletons/shell";

export function JournalBacktestOverviewSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* 2. KPI row — 6 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-2"
          >
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>

      {/* 3. Equity curve */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <SkeletonChart height="h-[240px]" />
      </div>

      {/* 4. Scatter + Monthly returns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <SkeletonChart height="h-[200px]" />
        </div>
        <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 overflow-hidden">
          <div className="px-5 py-3 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-36" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-3 px-5 py-2.5 border-b border-border-ds-subtle last:border-b-0 items-center">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-3" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
