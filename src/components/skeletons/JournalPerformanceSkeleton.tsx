/**
 * Bespoke loading skeleton for /app/journal/performance.
 *
 * Mirrors the real layout:
 *   1. Header — "Performance Report" title + period toggle (Week/Month/Quarter)
 *      + Export button
 *   2. Period-over-period comparison strip
 *   3. 4-KPI row (Net P&L, Win Rate, Avg R, Total Trades)
 *   4. Two charts side-by-side — equity curve + win/loss breakdown
 *   5. Best / Worst trade pair cards
 *   6. Trades breakdown table
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonChart,
} from "@/components/skeletons/shell";

export function JournalPerformanceSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="flex items-center gap-3">
          {/* Period toggle */}
          <div className="flex rounded-xl overflow-hidden border border-border-ds-subtle">
            {["Week", "Month", "Quarter"].map((p) => (
              <Skeleton key={p} className="h-9 w-20" />
            ))}
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* 2. Comparison strip */}
      <div className="flex gap-3 rounded-xl border border-border-ds-subtle bg-surface-1 px-4 py-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>

      {/* 3. KPI row — 4 cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>

      {/* 4. Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <SkeletonChart height="h-[240px]" />
        </div>
        <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <SkeletonChart height="h-[240px]" />
        </div>
      </div>

      {/* 5. Best / Worst trades */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3"
          >
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>

      {/* 6. Trades breakdown table */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 overflow-hidden">
        <div className="px-5 py-4 border-b border-border-ds-subtle">
          <Skeleton className="h-4 w-32" />
        </div>
        {/* 6 cols: date, symbol, side, P&L, R, outcome */}
        <div className="grid grid-cols-6 px-5 py-2.5 border-b border-border-ds-subtle gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-6 px-5 py-3 border-b border-border-ds-subtle gap-4 items-center"
          >
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-3" />
            ))}
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
