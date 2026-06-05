/**
 * Bespoke skeleton for src/pages/app/macro/Reports.tsx
 * Layout: header (title + filter tabs) →
 *   featured report card (large) →
 *   report cards grid (3-col)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from '@/components/skeletons/shell';

export function MacroReportsSkeletonPage() {
  return (
    <SkeletonPage>
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonHeader titleWidth="w-32" withEyebrow />
        {/* Category filter row */}
        <div className="flex gap-ds-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Search / sort bar */}
      <div className="flex gap-ds-3">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Featured report hero card */}
      <div className="rounded-2xl border border-border-ds-subtle p-6 flex gap-5">
        <Skeleton className="h-14 w-14 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-ds-2">
          <div className="flex items-start justify-between">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex gap-ds-2 pt-1">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Reports grid (3-col, 3 rows = 9 cards) */}
      <div className="space-y-ds-2">
        <Skeleton className="h-4 w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
