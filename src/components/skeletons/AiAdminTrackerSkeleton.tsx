/**
 * Skeleton for AdminTrackerView (lazy-loaded from Top5.tsx for admin users)
 *
 * Loaded state: stat row (4 KPIs) + filters/search bar + performance table
 * + catalyst-type intelligence panel + score-correlation chart.
 * AdminTrackerView itself uses SkeletonTable + SkeletonStatRow internally,
 * so this mirrors the same shapes for the outer page shell.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonStatRow,
  SkeletonTable,
  SkeletonChart,
} from "@/components/skeletons/shell";
import { Skeleton } from "@/components/skeletons/shell";

export function AiAdminTrackerSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* Page heading */}
      <SkeletonHeader titleWidth="w-64" withEyebrow withActions />

      {/* KPI stat row — 4 metrics */}
      <SkeletonStatRow count={4} />

      {/* Filters row — search + dropdowns */}
      <div className="flex flex-wrap items-center gap-ds-3">
        <Skeleton className="h-9 w-48 rounded-[12px]" />
        <Skeleton className="h-9 w-32 rounded-[12px]" />
        <Skeleton className="h-9 w-32 rounded-[12px]" />
        <Skeleton className="h-9 w-28 rounded-[12px] ml-auto" />
      </div>

      {/* Main performance table — 8 cols × 8 rows */}
      <SkeletonTable rows={8} cols={6} />

      {/* Bottom row: catalyst intelligence + score correlation */}
      <div className="grid grid-cols-1 gap-ds-5 lg:grid-cols-2">
        <SkeletonChart height="h-48" />
        <SkeletonChart height="h-48" />
      </div>
    </SkeletonPage>
  );
}
