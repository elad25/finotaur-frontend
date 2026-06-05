/**
 * Bespoke skeleton for src/pages/app/macro/Indicators.tsx
 * Layout: 3-tab navigation (overview / indicators / calendar) →
 *   5 macro summary stat pills →
 *   Narrative block →
 *   Turning points list (3 items) →
 *   Cohesion scores row →
 *   Themes grid (3-col) →
 *   Implications table
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonTabs,
  Skeleton,
  SkeletonTable,
  SkeletonText,
} from '@/components/skeletons/shell';

export function MacroIndicatorsSkeletonPage() {
  return (
    <SkeletonPage>
      {/* Page header */}
      <SkeletonHeader titleWidth="w-44" withEyebrow />

      {/* 3-tab navigation */}
      <SkeletonTabs count={3} />

      {/* 5 macro summary pills (growth/inflation/labor/business/sentiment) */}
      <div className="flex gap-ds-3 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-ds-subtle px-4 py-3 space-y-ds-1 flex-1 min-w-[120px]">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>

      {/* Narrative block */}
      <div className="rounded-xl border border-border-ds-subtle p-5 space-y-ds-2">
        <Skeleton className="h-5 w-64" />
        <SkeletonText lines={3} />
        <Skeleton className="h-8 w-40 rounded-lg mt-1" />
      </div>

      {/* Turning points */}
      <div className="space-y-ds-3">
        <Skeleton className="h-4 w-36" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-ds-subtle p-4 flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-ds-1">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>

      {/* Cohesion scores */}
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-ds-subtle p-3 space-y-ds-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Themes grid (3-col) */}
      <div className="space-y-ds-2">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Implications table */}
      <div className="space-y-ds-2">
        <Skeleton className="h-4 w-40" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    </SkeletonPage>
  );
}
