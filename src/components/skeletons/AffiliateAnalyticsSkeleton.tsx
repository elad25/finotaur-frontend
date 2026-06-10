/**
 * AffiliateAnalyticsSkeleton — mirrors src/features/affiliate/pages/Affiliateanalytics.tsx.
 *
 * Layout: header → date-range selector tabs → stats row (4) → main analytics chart
 * → secondary metrics row (2 charts or stat pairs).
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonStatRow,
  SkeletonChart,
} from "@/components/skeletons/shell";

export function AffiliateAnalyticsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* Header */}
      <SkeletonHeader titleWidth="w-36" withEyebrow={false} />

      {/* Date-range selector pills */}
      <div className="flex gap-ds-2">
        {["7 Days", "30 Days", "90 Days", "All Time"].map((label) => (
          <Skeleton key={label} className="h-8 w-20 rounded-[8px]" />
        ))}
      </div>

      {/* Stats row (4 tiles) */}
      <SkeletonStatRow count={4} />

      {/* Main chart */}
      <SkeletonChart height="h-64" />

      {/* Secondary metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-ds-4">
        <SkeletonChart height="h-40" />
        <SkeletonChart height="h-40" />
      </div>
    </SkeletonPage>
  );
}
