/**
 * Bespoke skeleton for /app/commodities/overview (Commodities Dashboard)
 *
 * Mirrors the real layout (CommoditiesOverview.tsx):
 *   1. Macro Drivers strip — 4-stat grid (DXY, 10Y Real, 10Y Breakeven, 10Y Treasury)
 *   2. Sector board — 3-column grid (Energy | Metals | Agriculture),
 *      each card: section header + 4–5 row table (Name | Price | Change)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonStatRow,
} from "@/components/skeletons/shell";

function SectorCardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
      <Skeleton className="h-4 w-24" />
      {/* table header */}
      <div className="grid grid-cols-3 gap-3 pb-2 border-b border-border-ds-subtle">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-3 gap-3 py-1 border-b border-border-ds-subtle">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

export function CommoditiesOverviewSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-56" />

      {/* Macro Drivers — 4 stats */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <SkeletonStatRow count={4} />
      </div>

      {/* Sector board — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SectorCardSkeleton rows={5} />
        <SectorCardSkeleton rows={5} />
        <SectorCardSkeleton rows={4} />
      </div>
    </SkeletonPage>
  );
}
