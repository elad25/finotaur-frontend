/**
 * Bespoke skeleton for src/pages/app/macro/CrossAsset.tsx
 * Layout: header (title + timeframe toggle + status) →
 *   Row 1: 3-col (What Matters / Risk Gauge / Market Regime) →
 *   Row 2: Asset Relationships full-width 3-col grid (6 cards) →
 *   Row 2.5: Custom Asset Ratio panel →
 *   Row 3: 3-col (Volatility / Macro Risk Heatmap / Breadth) →
 *   Row 4: Capital Flows full-width →
 *   Row 5: Playbook 3-col →
 *   Row 6: Full Asset Table
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function MacroCrossAssetSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-ds-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-3 w-80" />
        </div>
        <div className="flex gap-ds-2">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Row 1: What Matters / Risk Gauge / Market Regime */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border-ds-subtle p-5 space-y-ds-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <div className="space-y-ds-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Asset Relationships full-width, 3-col grid (6 relationship cards) */}
      <div className="rounded-2xl border border-border-ds-subtle p-5 space-y-ds-3">
        <Skeleton className="h-4 w-44" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Row 2.5: Custom Asset Ratio panel */}
      <div className="rounded-2xl border border-border-ds-subtle p-5 space-y-ds-3">
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>

      {/* Row 3: Volatility / Macro Risk Heatmap / Breadth */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border-ds-subtle p-5 space-y-ds-3">
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Row 4: Capital Flows (full width) */}
      <div className="rounded-2xl border border-border-ds-subtle p-5 space-y-ds-3">
        <Skeleton className="h-4 w-36" />
        <div className="space-y-ds-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Row 5: Playbook — 6 cells in 3 cols */}
      <div className="rounded-2xl border border-border-ds-subtle p-5 space-y-ds-3">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Row 6: Full asset table */}
      <SkeletonTable rows={10} cols={7} />
    </SkeletonPage>
  );
}
