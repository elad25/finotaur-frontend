/**
 * Bespoke skeleton for src/pages/app/crypto/Derivatives.tsx
 * Layout:
 *   1. Tab strip: 3 tabs (Funding Rates | Liquidations | Open Interest)
 *   2. GlassCard wrapping Funding Rates tab (default):
 *      - 3-col stat row (Avg Funding, Extreme High, Extreme Negative)
 *      - Signal badge card
 *      - Sort controls row
 *      - 5-col funding table (20 rows)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonTabs,
  Skeleton,
  SkeletonTable,
  SkeletonCard,
} from '@/components/skeletons/shell';

export function CryptoDerivativesSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-36" withEyebrow={false} />

      <SkeletonTabs count={3} />

      {/* Funding Rates tab content */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-4">
        {/* 3-col stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle bg-surface-2 p-3 space-y-1.5">
              <Skeleton className="h-2.5 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>

        {/* Signal badge */}
        <SkeletonCard lines={2} />

        {/* Sort controls */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Funding table: 5 cols, 20 rows */}
        <SkeletonTable rows={15} cols={5} />
      </div>
    </SkeletonPage>
  );
}
