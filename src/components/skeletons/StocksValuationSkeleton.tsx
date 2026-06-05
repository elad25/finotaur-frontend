/**
 * Bespoke skeleton for src/pages/app/stocks/Valuation.tsx
 * Layout:
 *   1. Page header (title + sector label)
 *   2. Row 1 (2-col): DCF Fair Value card | Grade Scorecard (snowflake + 4 grade bars)
 *   3. Row 2 (full): Multiples table + bar chart (2-col inside the card)
 *   4. Row 3 (2-col): Revenue/Earnings chart | EPS Trend chart
 *   5. Row 4: Peer comparison table
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonChart,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function StocksValuationSkeletonPage() {
  return (
    <SkeletonPage>
      {/* Page header */}
      <div className="space-y-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>

      {/* Row 1: DCF card + Grade scorecard */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* DCF Fair Value */}
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
          <Skeleton className="h-3 w-36" />
          <div className="rounded-xl bg-surface-2 py-6 flex flex-col items-center gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-3 w-28" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-surface-2 p-2 text-center space-y-1">
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-4 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Grade scorecard */}
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
          <Skeleton className="h-3 w-44" />
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Skeleton className="h-[180px] w-[180px] rounded-full shrink-0" />
            <div className="flex-1 w-full space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Multiples table + bar chart */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
        <Skeleton className="h-3 w-64" />
        <div className="grid md:grid-cols-2 gap-6">
          {/* Table left */}
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 pb-2 border-b border-border-ds-subtle">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, r) => (
              <div key={r} className="grid grid-cols-4 gap-2 py-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </div>
          {/* Bar chart right */}
          <SkeletonChart height="h-[200px]" />
        </div>
      </div>

      {/* Row 3: Revenue/Earnings + EPS charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <SkeletonChart height="h-40" />
        <SkeletonChart height="h-40" />
      </div>

      {/* Row 4: Peer comparison */}
      <SkeletonTable rows={5} cols={5} />
    </SkeletonPage>
  );
}
