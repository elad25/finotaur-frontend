/**
 * Bespoke skeleton for /app/commodities/seasonality (Seasonality)
 *
 * Mirrors the real layout (CommoditiesSeasonality.tsx):
 *   1. Symbol selector tabs (9 commodities)
 *   2. Chart card — 340px line chart area + caption
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTabs,
} from "@/components/skeletons/shell";

export function CommoditiesSeasonalitySkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-32" />

      {/* Symbol selector — 9 tabs */}
      <SkeletonTabs count={9} />

      {/* Chart card */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <Skeleton className="h-[340px] w-full rounded-lg" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </SkeletonPage>
  );
}
