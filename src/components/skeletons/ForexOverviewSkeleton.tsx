/**
 * Bespoke skeleton for /app/forex/overview
 *
 * Mirrors the real layout (ForexOverview.tsx):
 *   1. DXYHero — full-width hero band
 *   2. AIMarketBrief — full-width text card
 *   3. Two-column grid (lg): SessionClock | CurrencyStrengthMeter
 *   4. TopMovers — full-width table
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonText,
  SkeletonStatRow,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function ForexOverviewSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-40" />

      {/* DXYHero — price + change strip */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="flex items-end gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-20 ml-auto" />
        </div>
        <Skeleton className="h-[80px] w-full" />
      </div>

      {/* AIMarketBrief */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-2">
        <Skeleton className="h-4 w-40" />
        <SkeletonText lines={3} />
      </div>

      {/* SessionClock + CurrencyStrengthMeter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SessionClock */}
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* CurrencyStrengthMeter — 8 bars */}
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>

      {/* TopMovers table — 10 rows, 4 cols */}
      <SkeletonTable rows={10} cols={4} />
    </SkeletonPage>
  );
}
