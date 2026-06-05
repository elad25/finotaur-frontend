/**
 * AdminSeoAnalyticsSkeleton — mirrors /app/admin/seo (SeoAnalyticsPage).
 *
 * Layout: header (title + eyebrow + refresh button) → health-badge row (5 pills)
 * → metric tiles (4 stat boxes) → charts row (2 charts side-by-side)
 * → ticker table → quick-links footer.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonStatRow,
  SkeletonChart,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function AdminSeoAnalyticsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* Page header */}
      <SkeletonHeader titleWidth="w-80" withEyebrow withActions />

      {/* Health badge pills row (5 badges) */}
      <div className="flex gap-ds-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-28 rounded-full" />
        ))}
      </div>

      {/* Metric tiles — 4 stats */}
      <SkeletonStatRow count={4} />

      {/* Charts row — 2 charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-ds-4">
        <SkeletonChart height="h-[240px]" />
        <SkeletonChart height="h-[240px]" />
      </div>

      {/* Ticker table */}
      <SkeletonTable rows={8} cols={5} />

      {/* Quick-links footer */}
      <div className="flex flex-wrap gap-ds-3 pt-ds-2 border-t border-border-ds-subtle">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-36 rounded-[12px]" />
        ))}
      </div>
    </SkeletonPage>
  );
}
