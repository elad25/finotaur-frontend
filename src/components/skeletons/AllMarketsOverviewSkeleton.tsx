/**
 * Bespoke loading skeleton for /app/all-markets/overview.
 *
 * Mirrors the real layout:
 *   1. Market Regime card (full-width banner)
 *   2. Market Ticker Strip (full-width: left table + right chart panel)
 *   3. Two-column grid:
 *      Left  — Earnings strip + What Matters table + News card (3×6 rows)
 *      Right — Market Movers table (sidebar, 15 rows, sticky)
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function AllMarketsOverviewSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* 1. Market Regime banner */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-ds-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-36" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border-ds-subtle flex items-center justify-between">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* 2. Market Ticker Strip: category tabs + table + mini chart */}
      <div className="rounded-lg border border-border-ds-subtle overflow-hidden">
        {/* Header row: category pills + timeframe pills */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-ds-subtle">
          <div className="flex items-center gap-4">
            {["US", "World", "Commodities", "Futures", "Treasuries"].map((cat) => (
              <Skeleton key={cat} className="h-4 w-16" />
            ))}
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-8 rounded" />
            ))}
          </div>
        </div>
        {/* Body: 5 ticker rows + mini chart panel */}
        <div className="flex">
          <div className="flex-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center border-b border-border-ds-subtle py-2 px-3 gap-2"
              >
                <Skeleton className="h-full w-0.5 self-stretch" />
                <Skeleton className="flex-1 h-3" />
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-16 h-3" />
                <Skeleton className="w-12 h-3" />
              </div>
            ))}
          </div>
          <div className="w-[280px] border-l border-border-ds-subtle">
            <Skeleton className="w-full h-[145px]" shimmer />
          </div>
        </div>
      </div>

      {/* 3. Main content grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Earnings strip */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 px-4 py-3">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-28" />
              <div className="flex items-center gap-3 flex-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-24 rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          {/* What Matters This Week table */}
          <div className="rounded-xl border border-border-ds-subtle overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-ds-subtle">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
            {/* Col header */}
            <div className="flex items-center px-4 py-2 gap-2 border-b border-border-ds-subtle">
              <Skeleton className="w-16 h-3" />
              <Skeleton className="flex-1 h-3" />
              <Skeleton className="w-20 h-3" />
              <Skeleton className="w-20 h-3" />
              <Skeleton className="w-12 h-3" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center px-4 py-2.5 gap-2 border-b border-border-ds-subtle"
              >
                <Skeleton className="w-16 h-3" />
                <div className="flex-1 flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded-full" />
                  <Skeleton className="flex-1 h-3" />
                </div>
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-12 h-3" />
              </div>
            ))}
          </div>

          {/* Macro News card */}
          <div className="rounded-2xl border border-border-ds-subtle bg-surface-1">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-ds-subtle">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-20" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-4 px-4 py-3 border-b border-border-ds-subtle"
              >
                <Skeleton className="w-28 h-20 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — Movers sidebar */}
        <div className="lg:sticky lg:top-4 lg:self-start rounded-xl border border-border-ds-subtle overflow-hidden flex flex-col">
          {/* Header + tab pills */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-1">
              {["ACTIVES", "GAINERS", "LOSERS"].map((t) => (
                <Skeleton key={t} className="h-5 w-16 rounded" />
              ))}
            </div>
          </div>
          {/* Column headers */}
          <div className="flex items-center px-3 py-1.5 gap-2 border-b border-border-ds-subtle">
            <Skeleton className="flex-1 h-3" />
            <Skeleton className="w-14 h-3" />
            <Skeleton className="w-12 h-3" />
            <Skeleton className="w-14 h-3" />
          </div>
          {/* 15 mover rows */}
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center px-3 py-2 gap-2 border-b border-border-ds-subtle"
            >
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-10 ml-auto" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
