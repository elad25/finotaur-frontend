/**
 * AffiliateDashboardSkeleton — mirrors src/features/affiliate/pages/AffiliateDashboard.tsx
 * (the feature-level dashboard, NOT the /app/journal wrapper page).
 *
 * Layout: sticky header bar (title + tier badge + refresh) → affiliate code card
 * → stats row (4) → tier progress bar card → tabs strip (4) → tab content table.
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonStatRow,
  SkeletonTable,
  SkeletonTabs,
} from "@/components/skeletons/shell";

export function AffiliateDashboardSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* Header bar — title + tier badge + refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-ds-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-8 w-8 rounded-[8px]" />
      </div>

      {/* Affiliate code card (wide) */}
      <Skeleton className="h-28 w-full rounded-[16px]" />

      {/* Stats row (4 tiles) */}
      <SkeletonStatRow count={4} />

      {/* Tier progress card */}
      <div className="rounded-[16px] border border-border-ds-subtle bg-surface-1 p-5 space-y-ds-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        {/* Progress bar */}
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-64" />
      </div>

      {/* Tabs: Overview | Referrals | Earnings | Payouts */}
      <SkeletonTabs count={4} />

      {/* Tab content (table) */}
      <SkeletonTable rows={5} cols={3} />
    </SkeletonPage>
  );
}
