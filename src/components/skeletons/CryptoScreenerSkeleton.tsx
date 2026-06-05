/**
 * Bespoke skeleton for src/pages/app/crypto/Screener.tsx
 * Layout:
 *   1. Tab strip: 3 tabs (Scanner | Sectors | Exchanges)
 *   2. GlassCard wrapping active tab:
 *      Scanner tab (default):
 *        - Preset buttons row (5 presets)
 *        - 5-col filter inputs (Market Cap select + 4 number inputs)
 *        - Match count label
 *        - 7-col results table (15 rows)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonTabs,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function CryptoScreenerSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-44" withEyebrow={false} />

      {/* Page tab strip */}
      <SkeletonTabs count={3} />

      {/* Scanner tab content */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-xl" />
          ))}
        </div>

        {/* 5-col filter inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>

        {/* Match count */}
        <Skeleton className="h-3 w-24" />

        {/* Results table: 7 cols, 15 rows */}
        <SkeletonTable rows={15} cols={6} />
      </div>
    </SkeletonPage>
  );
}
