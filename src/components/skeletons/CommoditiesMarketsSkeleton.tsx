/**
 * Bespoke skeleton for /app/commodities/markets (Commodities Markets)
 *
 * Mirrors the real layout (CommoditiesMarkets.tsx):
 *   1. Tab strip: All | Energy | Metals | Agriculture
 *   2. GlassCard: table — Name | Sector | Price | Change | As Of (5 cols), ~15 rows
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTabs,
} from "@/components/skeletons/shell";

export function CommoditiesMarketsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-52" />

      {/* 4 tabs */}
      <SkeletonTabs count={4} />

      {/* Table card */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        {/* Column headers */}
        <div className="grid grid-cols-5 gap-3 pb-2 border-b border-border-ds-subtle">
          {["Name", "Sector", "Price", "Change", "As Of"].map((h) => (
            <Skeleton key={h} className="h-3 w-full" />
          ))}
        </div>
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-3 py-1 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
