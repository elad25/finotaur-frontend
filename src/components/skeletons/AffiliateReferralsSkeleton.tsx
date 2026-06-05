/**
 * AffiliateReferralsSkeleton — mirrors src/features/affiliate/pages/Affiliatereferrals.tsx.
 *
 * Layout: header (title) → filter stat-cards row (6 status tiles, clickable)
 * → search + filter bar → referrals table → pagination row.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonStatRow,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function AffiliateReferralsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* Page title */}
      <SkeletonHeader titleWidth="w-40" withEyebrow={false} />

      {/* Status filter stat-cards (6) */}
      <SkeletonStatRow count={6} />

      {/* Search + filter row */}
      <div className="flex items-center gap-ds-3">
        <Skeleton className="h-9 flex-1 rounded-[8px]" />
        <Skeleton className="h-9 w-36 rounded-[8px]" />
      </div>

      {/* Referrals table */}
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
