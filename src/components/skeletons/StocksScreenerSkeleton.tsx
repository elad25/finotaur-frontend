/**
 * Bespoke skeleton for src/pages/app/stocks/Screener.tsx
 * Layout:
 *   1. Asset toggle tabs (Stocks / Crypto)
 *   2. Page header (title + description)
 *   3. GlassCard: FilterPanel — preset buttons row + 5-col filter inputs
 *   4. GlassCard: ResultsTable — 50-row results table (7 cols)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function StocksScreenerSkeletonPage() {
  return (
    <SkeletonPage>
      {/* Asset toggle tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>

      {/* Page header */}
      <SkeletonHeader titleWidth="w-32" withEyebrow={false} />

      {/* FilterPanel card */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
        {/* Preset buttons row */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-xl" />
          ))}
        </div>
        {/* 5-col filter inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* ResultsTable card — 7 cols, 15 rows visible */}
      <SkeletonTable rows={15} cols={6} />
    </SkeletonPage>
  );
}
