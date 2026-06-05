/**
 * Bespoke loading skeleton for /app/journal/trade/:id (Trade Detail).
 *
 * Mirrors the real layout:
 *   1. Header — back button + symbol title + badges (session, side, outcome)
 *      + date + Edit button
 *   2. KPI cards row — up to 4 (P&L, R-Multiple, Risk:Reward, Duration)
 *   3. Trade Details card — 2-col grid of field/value pairs
 *   4. Chart section (TradingView chart placeholder)
 *   5. Notes / tags section
 *   6. Screenshots row
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonChart,
} from "@/components/skeletons/shell";

export function JournalTradeDetailSkeletonPage() {
  return (
    <SkeletonPage>
      {/* 1. Header */}
      <div className="flex items-center gap-4 mb-2">
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-7 w-20 rounded-lg" />
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-9 w-20 rounded-lg shrink-0" />
      </div>

      {/* 2. KPI cards — 4 up */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {["P&L", "R-Multiple", "Risk:Reward", "Duration"].map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-6 space-y-2"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>

      {/* 3. Trade Details */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Chart */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <Skeleton className="h-5 w-28" />
        <SkeletonChart height="h-[400px]" />
      </div>

      {/* 5. Notes + Tags */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {["Notes", "Tags"].map((section) => (
          <div
            key={section}
            className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3"
          >
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* 6. Screenshots */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-48 rounded-xl" />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
