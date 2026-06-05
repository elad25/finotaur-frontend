/**
 * Bespoke skeleton for src/pages/app/stocks/Insider.tsx
 * Layout:
 *   1. Page header (title + subtitle) + refresh button
 *   2. Summary stats: 4-col grid (Buys, Sells, Cluster, 13F holders)
 *   3. Insider Transactions section: header + 3 transaction cards
 *   4. Recent Form 4 Filings section: header + card with 5 rows
 *   5. Institutional 13F section: header + 3 summary stats + holder rows
 *   6. Footer disclaimer
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonCard,
} from '@/components/skeletons/shell';

export function StocksInsiderSkeletonPage() {
  return (
    <SkeletonPage>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>

      {/* Summary stats 4-col */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 text-center space-y-2">
            <Skeleton className="h-4 w-4 mx-auto rounded-full" />
            <Skeleton className="h-7 w-12 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        ))}
      </div>

      {/* Insider Transactions section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>

      {/* Form 4 Filings section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start justify-between gap-4 py-3 border-b border-border-ds-subtle last:border-0">
              <div className="flex items-start gap-2 flex-1">
                <Skeleton className="h-3.5 w-3.5 mt-0.5 shrink-0 rounded" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-44" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-12 rounded" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 13F Institutional section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-4">
          {/* 3-col ownership summary */}
          <div className="grid grid-cols-3 gap-3 pb-4 border-b border-border-ds-subtle">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center space-y-1">
                <Skeleton className="h-5 w-16 mx-auto" />
                <Skeleton className="h-3 w-28 mx-auto" />
              </div>
            ))}
          </div>
          {/* Holder rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-wrap gap-4 items-center py-3 border-b border-border-ds-subtle last:border-0">
              <div className="flex-1 min-w-[160px] space-y-1">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                  <Skeleton className="h-3.5 w-40" />
                </div>
                <Skeleton className="h-3 w-28 ml-5" />
              </div>
              <div className="text-right min-w-[70px] space-y-1">
                <Skeleton className="h-3.5 w-16 ml-auto" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
              <div className="text-right min-w-[50px] space-y-1">
                <Skeleton className="h-3.5 w-12 ml-auto" />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
              <Skeleton className="h-5 w-20 rounded-lg shrink-0" />
              <Skeleton className="h-4 w-4 ml-auto shrink-0 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <Skeleton className="h-12 w-full rounded-lg" />
    </SkeletonPage>
  );
}
