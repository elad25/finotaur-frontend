/**
 * Bespoke skeleton for /app/options/volatility (Volatility — IV Rank/Percentile, Skew, Term Structure)
 *
 * Stub page — mirrors anticipated layout:
 *   1. Sub-tabs: IV Rank | Skew | Term Structure
 *   2. Two cards: chart + table
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTabs,
  SkeletonChart,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function OptionsVolatilitySkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-36" />
      <SkeletonTabs count={3} />
      <SkeletonChart height="h-64" />
      <SkeletonTable rows={8} cols={5} />
    </SkeletonPage>
  );
}
