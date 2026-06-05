/**
 * Bespoke skeleton for src/pages/app/stocks/Sectors.tsx
 * Layout:
 *   1. PageTemplate header
 *   2. Today's Leaders: 2-col performance bar (Top Performer | Weakest)
 *   3. Sort controls row (4 buttons)
 *   4. 4-col sector card grid (11 cards — SPDR sector ETFs)
 *      Each card: name/symbol + change badge + price + bar + 4-stat mini grid
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from '@/components/skeletons/shell';

export function StocksSectorsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-44" withEyebrow={false} />

      {/* Today's Leaders: 2-col performance cards */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-2">
              <Skeleton className="h-2.5 w-24" />
              <div className="flex items-baseline justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-14" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-lg" />
        ))}
      </div>

      {/* Sector cards grid — 11 cards, 4-col */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
            {/* Header: name + badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-2.5 w-12" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            {/* Price row */}
            <div className="flex items-baseline justify-between">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
            {/* Change bar */}
            <Skeleton className="h-1.5 w-full rounded-full" />
            {/* Stats 2x2 */}
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-0.5">
                  <Skeleton className="h-2 w-14" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
