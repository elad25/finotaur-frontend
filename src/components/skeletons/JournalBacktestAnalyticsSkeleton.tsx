/**
 * Bespoke loading skeleton for /app/journal/backtest/analytics (BacktestAnalytics).
 *
 * Mirrors the real layout:
 *   1. Header — "Analytics" title + closed-trades count
 *   2. Strategy comparison table — header + 6 strategy rows
 *   3. Performance calendar — section title + 4-col calendar grid
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalBacktestAnalyticsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* 1. Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-3 w-32" />
      </div>

      {/* 2. Strategy comparison table */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-44" />
        <div className="rounded-xl border border-border-ds-subtle overflow-hidden">
          {/* Column headers — 6 */}
          <div className="grid grid-cols-6 gap-3 bg-surface-1 px-5 py-3 border-b border-border-ds-subtle">
            {["Strategy", "Trades", "Win Rate", "Net P&L", "Profit Factor", "Expectancy"].map((h) => (
              <Skeleton key={h} className="h-3" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-3 px-5 py-3 border-b border-border-ds-subtle last:border-b-0 items-center">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-3" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Performance calendar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-44" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-1.5"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-2.5 w-28" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
