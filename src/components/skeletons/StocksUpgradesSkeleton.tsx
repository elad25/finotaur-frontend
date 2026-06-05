/**
 * Bespoke skeleton for src/pages/app/stocks/Upgrades.tsx
 * Layout:
 *   1. Page heading (h1 title + subtitle)
 *   2. Table card: header row + date range label
 *   3. Table body: 8 rows × 6 cols (#, Symbol, Repeats, Upgrades, Downgrades, Last event)
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function StocksUpgradesSkeletonPage() {
  return (
    <SkeletonPage>
      {/* Page heading */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3 w-80" />
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 overflow-hidden">
        {/* Card header row */}
        <div className="px-4 py-3 border-b border-border-ds-subtle flex items-center justify-between">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-3 w-48" />
        </div>
        {/* Table */}
        <div className="p-2">
          <SkeletonTable rows={8} cols={6} />
        </div>
      </div>
    </SkeletonPage>
  );
}
