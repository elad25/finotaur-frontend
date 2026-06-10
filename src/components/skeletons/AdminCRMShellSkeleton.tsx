/**
 * AdminCRMShellSkeleton — mirrors /app/admin (AdminCRMShell + OverviewTab default).
 *
 * Layout: sidebar (left, fixed width) + main content area.
 * Main content mirrors the OverviewTab default:
 *   - KPI stat row (4 tiles) → user growth stat row (4 tiles)
 *   - Charts row (line chart + pie chart side-by-side)
 *   - Subscription breakdown table
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonStatRow,
  SkeletonChart,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function AdminCRMShellSkeletonPage() {
  return (
    <div className="flex bg-surface-base min-h-screen" role="status" aria-label="Loading">
      {/* Sidebar placeholder */}
      <div
        aria-hidden="true"
        className="hidden md:flex flex-col gap-ds-2 w-52 shrink-0 border-r border-border-ds-subtle p-4"
      >
        {/* Logo / brand */}
        <Skeleton className="h-8 w-32 mb-ds-4" />

        {/* Nav items */}
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-[8px]" />
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 p-6 space-y-ds-5">
        {/* Overview header */}
        <div className="space-y-ds-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>

        {/* KPI row 1 — users (4 stat tiles) */}
        <SkeletonStatRow count={4} />

        {/* KPI row 2 — revenue/billing (4 stat tiles) */}
        <SkeletonStatRow count={4} />

        {/* Charts row — line chart + pie chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-ds-4">
          <SkeletonChart height="h-64" />
          <SkeletonChart height="h-64" />
        </div>

        {/* Subscription breakdown table */}
        <SkeletonTable rows={6} cols={5} />
      </div>
    </div>
  );
}
