/**
 * Bespoke skeleton for /app/commodities/macro (Macro Drivers)
 *
 * Mirrors the real layout (CommoditiesMacro.tsx):
 *   1. Tab strip: Dollar (DXY) | Real Yields | Inflation Breakevens | Correlations
 *   2. GlassCard: single stat + explanation paragraph
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTabs,
  SkeletonStat,
  SkeletonText,
} from "@/components/skeletons/shell";

export function CommoditiesMacroSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-40" />

      {/* 4 tabs */}
      <SkeletonTabs count={4} />

      {/* Card body */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-4">
        <div className="max-w-xs">
          <SkeletonStat />
        </div>
        <SkeletonText lines={3} className="max-w-lg" />
      </div>
    </SkeletonPage>
  );
}
