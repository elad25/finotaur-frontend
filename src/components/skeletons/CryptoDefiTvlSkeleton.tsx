/**
 * Bespoke skeleton for src/pages/app/crypto/DefiTvl.tsx
 * Layout:
 *   1. AiSummaryCard (full-width)
 *   2. TvlHeader: label + big number + dominant chain
 *   3. Section: TVL by Chain — 5-col × 2-row stat grid (10 chain stats)
 *   4. Section: Top Protocols — 7-col table (50 rows visible ~10)
 *   5. Section: Yields Screener — 7-col table (50 rows visible ~10)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function CryptoDefiTvlSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-36" withEyebrow={false} />

      {/* AiSummaryCard placeholder */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* TvlHeader: big number */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-44" />
      </div>

      {/* TVL by Chain — 5-col × 2-row */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Top Protocols table: 7 cols, 10 rows */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <SkeletonTable rows={10} cols={6} />
      </div>

      {/* Yields Screener table: 7 cols, 10 rows */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <SkeletonTable rows={10} cols={6} />
      </div>
    </SkeletonPage>
  );
}
