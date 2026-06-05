/**
 * AffiliateEarningsSkeleton — mirrors src/features/affiliate/pages/Affiliateearnings.tsx.
 *
 * Layout: header → earnings summary stat row (4 tiles) → filter bar (month select + type filter)
 * → commissions table → pagination.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonStatRow,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function AffiliateEarningsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* Header */}
      <SkeletonHeader titleWidth="w-36" withEyebrow={false} />

      {/* Earnings summary stat row (4 tiles) */}
      <SkeletonStatRow count={4} />

      {/* Filter bar */}
      <div className="flex items-center gap-ds-3">
        <Skeleton className="h-9 w-40 rounded-[8px]" />
        <Skeleton className="h-9 w-36 rounded-[8px]" />
      </div>

      {/* Commissions table */}
      <SkeletonTable rows={8} cols={5} />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-ds-2">
          <Skeleton className="h-8 w-8 rounded-[8px]" />
          <Skeleton className="h-8 w-8 rounded-[8px]" />
        </div>
      </div>
    </SkeletonPage>
  );
}
