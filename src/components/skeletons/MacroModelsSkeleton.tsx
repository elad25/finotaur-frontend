/**
 * Bespoke skeleton for src/pages/app/macro/Models.tsx
 * Layout:
 *   Header row (12-col grid): score ring | regime | risk signal | shock detector | AI insight
 *   Row 2 (12-col): radar chart | leading/lagging lists | turning points
 *   Row 3: key economic indicators (8-col grid of small cards)
 *   Row 4 (12-col): scenario cards (8-col) | risk controls (4-col)
 *   Row 5 (12-col): sensitivity matrix table (7-col) | global regions (5-col)
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function MacroModelsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* Row 1: Header (score + regime + signal + shock + AI insight) */}
      <div className="grid grid-cols-12 gap-6">
        {/* Score ring */}
        <div className="col-span-2 flex flex-col items-center gap-2">
          <Skeleton className="h-28 w-28 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        {/* Regime */}
        <div className="col-span-3 space-y-ds-2 flex flex-col justify-center">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        {/* Risk signal */}
        <div className="col-span-2 flex items-center">
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
        {/* Shock detector */}
        <div className="col-span-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
        {/* AI insight */}
        <div className="col-span-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>

      {/* Row 2: Radar / Leading-Lagging / Turning Points */}
      <div className="grid grid-cols-12 gap-6">
        {/* Radar chart */}
        <div className="col-span-4 rounded-2xl border border-border-ds-subtle p-6 space-y-ds-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-48 w-48 rounded-full mx-auto" />
        </div>
        {/* Leading/Lagging lists */}
        <div className="col-span-4 rounded-2xl border border-border-ds-subtle p-6 space-y-ds-3">
          <Skeleton className="h-4 w-40" />
          <div className="space-y-ds-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-ds-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
        {/* Turning points */}
        <div className="col-span-4 rounded-2xl border border-border-ds-subtle p-6 space-y-ds-3">
          <Skeleton className="h-4 w-36" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle p-3 space-y-ds-1">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Key Economic Indicators (8 cards) */}
      <section className="space-y-ds-3">
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </section>

      {/* Row 4: Scenarios (8/12) + Risk Controls (4/12) */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-ds-3">
          <Skeleton className="h-4 w-36" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border-ds-subtle p-5 space-y-ds-2">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-7 w-12" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-4 space-y-ds-3">
          <Skeleton className="h-4 w-32" />
          <div className="rounded-2xl border border-border-ds-subtle p-6 space-y-ds-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Sensitivity matrix (7/12) + Global regions (5/12) */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <SkeletonTable rows={6} cols={3} />
        </div>
        <div className="col-span-5 space-y-ds-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
