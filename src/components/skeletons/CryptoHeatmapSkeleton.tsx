/**
 * Bespoke skeleton for src/pages/app/crypto/Heatmap.tsx
 * Layout:
 *   1. AiSummaryCard
 *   2. Section header
 *   3. TopStatsBar: label + big MCap number + 2 pills (gainers/losers)
 *   4. Category filter pills (1 pill for now)
 *   5. HeatmapGrid: flex-wrap tiles of varying sizes (mirrors HeatmapSkeleton)
 *   6. Legend row
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from '@/components/skeletons/shell';

export function CryptoHeatmapSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-44" withEyebrow={false} />

      {/* AiSummaryCard */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Section header */}
      <div className="space-y-1">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-64" />
      </div>

      {/* TopStatsBar */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-52" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>

      {/* Category pill */}
      <div className="flex gap-2">
        <Skeleton className="h-7 w-14 rounded-full" />
      </div>

      {/* Heatmap tiles — flex-wrap with variable widths */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3">
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {Array.from({ length: 30 }).map((_, i) => {
            // Mirror the variance in HeatmapSkeleton
            const size = Math.max(48, 48 + (i % 7) * 12);
            return (
              <Skeleton
                key={i}
                className="rounded-xl"
                style={{ width: size, height: size, minWidth: 56, minHeight: 48 }}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-3 w-16" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
