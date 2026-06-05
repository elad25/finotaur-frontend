/**
 * Bespoke skeleton for src/pages/app/macro/Calendar.tsx
 * Layout: header (title + view mode tabs) → filter bar →
 *   impact cluster summary (3 pills) →
 *   event list rows (high/medium/low grouped) → calendar grid (7-col week)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonTabs,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function MacroCalendarSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1400px]">
      {/* Header + view mode tabs */}
      <div className="flex items-center justify-between">
        <SkeletonHeader titleWidth="w-48" withEyebrow />
        <div className="flex gap-ds-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* View tabs: Today / Week / Month / Impact */}
      <SkeletonTabs count={4} />

      {/* Filter bar */}
      <div className="flex gap-ds-2 flex-wrap">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      {/* Impact cluster summary pills */}
      <div className="flex gap-ds-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-40 rounded-xl" />
        ))}
      </div>

      {/* HIGH impact events */}
      <div className="space-y-ds-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-ds-subtle p-4 flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-ds-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MEDIUM impact events */}
      <div className="space-y-ds-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-ds-subtle p-4 flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-ds-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar week grid (7 cols) */}
      <SkeletonTable rows={3} cols={7} />
    </SkeletonPage>
  );
}
