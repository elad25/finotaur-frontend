/**
 * Bespoke skeleton for src/pages/app/stocks/Movers.tsx
 * Layout:
 *   1. PageTemplate header (title + description)
 *   2. 2-col grid: Gainers card | Losers card
 *      Each card: CardHeader (title) + 6-row × 3-col table (Symbol | Price | Change%)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonTable,
  Skeleton,
} from '@/components/skeletons/shell';

export function StocksMoversSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-36" withEyebrow={false} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Gainers card */}
        <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
          <Skeleton className="h-5 w-24" />
          <SkeletonTable rows={6} cols={3} />
        </div>

        {/* Losers card */}
        <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
          <Skeleton className="h-5 w-20" />
          <SkeletonTable rows={6} cols={3} />
        </div>
      </div>
    </SkeletonPage>
  );
}
