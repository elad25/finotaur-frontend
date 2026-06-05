/**
 * AffiliateOverviewSkeleton — mirrors src/features/affiliate/pages/Affiliateoverview.tsx.
 *
 * Layout: header (title + tier badge) → affiliate code banner → stats row (4)
 * → quick-action cards grid (2×2) → conversion metrics row (2 cards).
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonStatRow,
  SkeletonGrid,
} from "@/components/skeletons/shell";

export function AffiliateOverviewSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* Header — title + tier badge */}
      <div className="flex items-center justify-between">
        <SkeletonHeader titleWidth="w-48" withEyebrow={false} />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      {/* Affiliate code copy banner */}
      <div className="rounded-[16px] border border-border-ds-subtle bg-surface-1 p-5 space-y-ds-3">
        <div className="flex items-center gap-ds-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 flex-1 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-[8px]" />
        </div>
        <Skeleton className="h-3 w-48" />
      </div>

      {/* Stats row (4 tiles) */}
      <SkeletonStatRow count={4} />

      {/* Quick-action cards — 2×2 grid */}
      <SkeletonGrid cols={2} rows={2} cardHeight="h-20" />

      {/* Conversion metrics — 2 cards side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-ds-4">
        <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-4 space-y-ds-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-4 space-y-ds-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </SkeletonPage>
  );
}
