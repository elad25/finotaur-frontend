/**
 * Bespoke loading skeleton for /app/journal/statistics.
 *
 * Mirrors the real layout:
 *   1. Header — "Statistics" title + subtitle
 *   2. Filter bar — date range + symbol + strategy + session + status selects
 *   3. Tab strip — 6 tabs (Overview, Detailed Cuts, Assets, Strategies,
 *      Trade Types, Time Analysis)
 *   4. Overview tab content:
 *      - 6-KPI row (Win Rate, Net P&L, Avg R:R, Profit Factor, Expectancy, Max DD)
 *      - Equity curve chart
 *      - Two-column: distribution chart + rolling metrics chart
 */
import {
  SkeletonPage,
  SkeletonTabs,
  Skeleton,
  SkeletonChart,
} from "@/components/skeletons/shell";

export function JournalStatisticsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* 1. Header */}
      <div className="px-0 space-y-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-3 w-52" />
      </div>

      {/* 2. Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-ds-subtle bg-surface-1 px-4 py-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-36 rounded-lg" />
        ))}
      </div>

      {/* 3. Tab strip — 6 tabs */}
      <SkeletonTabs count={6} />

      {/* 4. Overview tab: 6 KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-4 space-y-2"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>

      {/* Equity curve */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <SkeletonChart height="h-[240px]" />
      </div>

      {/* Distribution + Rolling metrics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          <SkeletonChart height="h-[200px]" />
        </div>
        <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          <SkeletonChart height="h-[200px]" />
        </div>
      </div>
    </SkeletonPage>
  );
}
