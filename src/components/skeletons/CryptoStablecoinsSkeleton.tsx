/**
 * Bespoke skeleton for src/pages/app/crypto/Stablecoins.tsx
 * Layout:
 *   1. AiSummaryCard
 *   2. TotalCapHeader: label + big number + 3 change pills (24h/7d/30d)
 *   3. StablecoinMetricChart: MetricChart (h-[320px])
 *   4. Section: Supply Growth — sparkline card
 *   5. Section: Top 20 Stablecoins — 10-col table (20 rows)
 *   6. Section: Top 3 Dominance — 3-col stat grid (USDT | USDC | DAI)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonChart,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function CryptoStablecoinsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-36" withEyebrow={false} />

      {/* AiSummaryCard */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* TotalCapHeader */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-52" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* MetricChart */}
      <SkeletonChart height="h-[320px]" />

      {/* Supply Growth sparkline */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-16 w-full rounded" />
        </div>
      </div>

      {/* Top 20 Stablecoins table: 10 cols */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <SkeletonTable rows={10} cols={6} />
      </div>

      {/* Top 3 Dominance: 3-col stats */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-1.5">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
