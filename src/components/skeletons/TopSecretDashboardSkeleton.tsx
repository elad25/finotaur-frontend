/**
 * TopSecretDashboardSkeleton — mirrors /app/top-secret subscriber dashboard.
 *
 * Layout: header bar (title + tier badge + buttons) → search/filter row
 * → featured report card (wide) → report grid (3 col) → archive section.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTable,
  SkeletonGrid,
} from "@/components/skeletons/shell";

export function TopSecretDashboardSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-6xl">
      {/* Header — title + subscription badge + action buttons */}
      <SkeletonHeader titleWidth="w-56" withEyebrow={false} withActions />

      {/* Search + filter row */}
      <div className="flex items-center gap-ds-3">
        <Skeleton className="h-9 flex-1 rounded-[12px]" />
        <Skeleton className="h-9 w-28 rounded-[12px]" />
        <Skeleton className="h-9 w-28 rounded-[12px]" />
      </div>

      {/* Featured (pinned) report card — wide */}
      <Skeleton className="h-40 w-full rounded-[16px]" />

      {/* Report cards grid (3 col, 2 rows = 6 cards) */}
      <SkeletonGrid cols={3} rows={2} cardHeight="h-48" />

      {/* Archive section heading */}
      <div className="flex items-center gap-ds-3">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>

      {/* Archive table */}
      <SkeletonTable rows={4} cols={4} />
    </SkeletonPage>
  );
}
