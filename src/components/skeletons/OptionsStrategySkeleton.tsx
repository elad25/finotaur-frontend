/**
 * Bespoke skeleton for /app/options/strategy (Strategy Builder)
 *
 * Stub page — mirrors anticipated layout:
 *   1. Strategy selector + ticker input
 *   2. Legs table (2 columns: calls | puts)
 *   3. P&L chart card
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonChart,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function OptionsStrategySkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-44" />

      {/* Strategy selector row */}
      <div className="flex gap-3 flex-wrap">
        <Skeleton className="h-10 w-44 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Legs */}
      <SkeletonCard lines={3} />

      {/* P&L chart */}
      <SkeletonChart height="h-56" />
    </SkeletonPage>
  );
}
