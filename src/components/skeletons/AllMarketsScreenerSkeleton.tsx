/**
 * Bespoke loading skeleton for /app/all-markets/screener (StocksScreener).
 *
 * Mirrors the real layout:
 *   - Asset toggle: Stocks / Crypto tabs (GlassTabs)
 *   - PageTemplate header: "Screener" + description
 *   - Filter panel card: preset pills row + filter input grid (6 cols)
 *   - Results table card: sort-header row (8 cols) + 50 data rows
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function AllMarketsScreenerSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* Asset toggle tabs */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* PageTemplate header */}
      <div className="space-y-2 mb-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Filter panel card */}
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-4 mb-3">
        {/* Preset pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
        {/* Filter inputs grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-full rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Results table card */}
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-4">
        {/* Result count + pagination info */}
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-8 rounded" />
            <Skeleton className="h-7 w-8 rounded" />
            <Skeleton className="h-7 w-8 rounded" />
          </div>
        </div>
        <SkeletonTable rows={15} cols={8} className="border-0 rounded-none" />
      </div>
    </SkeletonPage>
  );
}
