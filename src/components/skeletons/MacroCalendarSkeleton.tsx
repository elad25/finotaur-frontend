/**
 * Bespoke skeleton for src/pages/app/macro/tabs/EconomicCalendar.tsx
 * Real layout:
 *   1. Page header: h1 "Economic Calendar"
 *   2. Sub-nav (2 tabs): Calendar / Major Events
 *   3. Inner Calendar page (default sub-tab):
 *      a. Header row: title block + 3 view-mode buttons (Today / Week / Month)
 *      b. Tab strip: Today / Week / Month / Impact (4 tabs)
 *      c. Filter bar: 7 country/impact toggle chips
 *      d. Impact summary pills: 3 counts (High / Medium / Low)
 *      e. HIGH-impact event list: section label → 4 event rows
 *         (each: flag icon + event name + impact badge + 3 data chips)
 *      f. MEDIUM-impact event list: section label → 5 event rows
 *      g. Calendar week grid (7-col × 3 rows)
 */
import {
  SkeletonPage,
  SkeletonTabs,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function MacroCalendarSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1400px]">
      {/* 1. Page header */}
      <Skeleton className="h-8 w-52" aria-hidden="true" />

      {/* 2. Sub-nav: 2 tabs */}
      <SkeletonTabs count={2} />

      {/* 3a. Inner Calendar header + view mode buttons */}
      <div className="flex items-center justify-between" aria-hidden="true">
        <div className="space-y-ds-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="flex gap-ds-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* 3b. Inner tab strip: 4 tabs */}
      <SkeletonTabs count={4} />

      {/* 3c. Filter bar: 7 chips */}
      <div className="flex gap-ds-2 flex-wrap" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      {/* 3d. Impact summary pills */}
      <div className="flex gap-ds-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-40 rounded-xl" />
        ))}
      </div>

      {/* 3e. HIGH-impact events */}
      <div className="space-y-ds-2" aria-hidden="true">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-ds-subtle p-4 flex items-start gap-4"
          >
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

      {/* 3f. MEDIUM-impact events */}
      <div className="space-y-ds-2" aria-hidden="true">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-ds-subtle p-4 flex items-start gap-4"
          >
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

      {/* 3g. Calendar week grid (7-col × 3 rows) */}
      <SkeletonTable rows={3} cols={7} />
    </SkeletonPage>
  );
}
