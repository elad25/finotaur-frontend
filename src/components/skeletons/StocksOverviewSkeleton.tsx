/**
 * Bespoke skeleton for src/pages/app/stocks/Overview.tsx
 * Layout (per-symbol page):
 *   1. PriceChartLite — full-width chart with price header
 *   2. SnapshotCards — horizontal stat strip (~5 stats)
 *   3. FinotaurScore card
 *   4. FinotaurSnowflake + 4-row grade list (side-by-side)
 *   5. AnalystConsensus card
 *   6. 2-col: NewsPreview | CompanyOverview
 *   7. SecFilings card
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonStatRow,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
} from '@/components/skeletons/shell';

export function StocksOverviewSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1200px]">
      {/* 1. PriceChartLite */}
      <SkeletonChart height="h-48" />

      {/* 2. SnapshotCards — 5-stat strip */}
      <SkeletonStatRow count={5} />

      {/* 3. FinotaurScore card */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. FinotaurSnowflake + grade rows */}
      <div className="flex flex-col sm:flex-row items-start gap-4 rounded-xl border border-border-ds-subtle bg-surface-1 p-4">
        <Skeleton className="h-[180px] w-[180px] rounded-full shrink-0" />
        <div className="flex-1 space-y-3 w-full">
          <Skeleton className="h-3 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. AnalystConsensus */}
      <SkeletonCard lines={2} withGrid />

      {/* 6. 2-col: NewsPreview | CompanyOverview */}
      <div className="grid md:grid-cols-2 gap-4">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>

      {/* 7. SecFilings */}
      <SkeletonTable rows={5} cols={4} />
    </SkeletonPage>
  );
}
