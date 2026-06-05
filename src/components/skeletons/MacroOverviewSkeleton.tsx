/**
 * Bespoke skeleton for src/pages/app/macro/Overview.tsx
 * Layout: header row (title + status pill) → sentiment bar → 10-card grid (5 cols)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from '@/components/skeletons/shell';

export function MacroOverviewSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-full">
      {/* Header row: title + status pill */}
      <div className="flex items-center justify-between">
        <SkeletonHeader titleWidth="w-52" withEyebrow={false} />
        {/* Status badge */}
        <Skeleton className="h-9 w-48 rounded-xl" />
      </div>

      {/* Market Sentiment Bar */}
      <div className="rounded-2xl border border-border-ds-subtle p-6 space-y-ds-3">
        <div className="flex items-center justify-between">
          <div className="space-y-ds-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
        {/* Sentiment bar */}
        <Skeleton className="h-3 w-full rounded-full" />
        {/* Legend */}
        <div className="flex items-center justify-center gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-28" />
          ))}
        </div>
      </div>

      {/* Market cards grid: 5 cols, 2 rows = 10 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </SkeletonPage>
  );
}
