/**
 * AffiliatePayoutsSkeleton — mirrors src/features/affiliate/pages/Affiliatepayouts.tsx.
 *
 * Layout: header → balance summary row (4 stats) → payout email form card
 * → payouts table → pagination.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonStatRow,
  SkeletonCard,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function AffiliatePayoutsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* Header */}
      <SkeletonHeader titleWidth="w-40" withEyebrow={false} />

      {/* Balance summary (4 stats) */}
      <SkeletonStatRow count={4} />

      {/* PayPal email setup card */}
      <SkeletonCard>
        <div className="space-y-ds-3">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-ds-3">
            <Skeleton className="h-10 flex-1 rounded-[8px]" />
            <Skeleton className="h-10 w-20 rounded-[8px]" />
          </div>
          <Skeleton className="h-3 w-56" />
        </div>
      </SkeletonCard>

      {/* Payouts table */}
      <SkeletonTable rows={5} cols={5} />

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
