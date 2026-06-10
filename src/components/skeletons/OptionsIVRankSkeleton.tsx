/**
 * Bespoke skeleton for /app/options/iv-rank (IV Rank / Percentile)
 *
 * Stub page — mirrors anticipated layout:
 *   1. Ticker search + timeframe toggle
 *   2. Chart card (IV history line chart)
 *   3. Table: Ticker | IV Rank | IV Percentile | Current IV | 52W High | 52W Low (6 cols), 10 rows
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonChart,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function OptionsIVRankSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-40" />

      {/* Ticker + toggle */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <SkeletonChart height="h-56" />
      <SkeletonTable rows={10} cols={6} />
    </SkeletonPage>
  );
}
