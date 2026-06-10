/**
 * Bespoke skeleton for src/pages/app/macro/tabs/InflationGrowth.tsx
 * Real layout:
 *   1. Page header: h1 "Inflation & Growth"
 *   2. Sub-nav (2 tabs): Indicators / Models
 *   3. Inner Indicators page (default sub-tab = MacroTerminal):
 *      a. 3-tab bar: Overview / Indicators / Calendar
 *      b. 5 macro summary pills (Growth / Inflation / Labor / Business / Sentiment)
 *      c. Narrative block (headline + 3-line body + takeaway button)
 *      d. Turning points list (section label + 6 rows: icon + title/badge + 2-line text)
 *      e. Cohesion scores: 5-col grid (label + big number + progress bar + delta)
 *      f. Themes grid (4 cards, 2-col): title + status badge + probability bar + description
 *      g. Implications table: 5 cols × 4 rows
 */
import {
  SkeletonPage,
  SkeletonTabs,
  SkeletonText,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function MacroIndicatorsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* 1. Page header */}
      <Skeleton className="h-8 w-52" aria-hidden="true" />

      {/* 2. Sub-nav: 2 tabs */}
      <SkeletonTabs count={2} />

      {/* 3a. Inner tab bar: Overview / Indicators / Calendar */}
      <SkeletonTabs count={3} />

      {/* 3b. 5 macro summary pills */}
      <div className="flex gap-ds-3 flex-wrap" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-ds-subtle px-4 py-3 space-y-ds-1 flex-1 min-w-[120px]"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>

      {/* 3c. Narrative block */}
      <div className="rounded-xl border border-border-ds-subtle p-5 space-y-ds-2" aria-hidden="true">
        <Skeleton className="h-5 w-72" />
        <SkeletonText lines={3} />
        <Skeleton className="h-8 w-40 rounded-lg mt-1" />
      </div>

      {/* 3d. Turning points */}
      <div className="space-y-ds-3" aria-hidden="true">
        <Skeleton className="h-4 w-36" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-ds-subtle p-4 flex items-start gap-3"
          >
            <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-ds-1">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>

      {/* 3e. Cohesion scores: 5-col */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* 3f. Themes grid: 2-col, 4 cards */}
      <div className="space-y-ds-2" aria-hidden="true">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle p-5 space-y-ds-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <div className="space-y-ds-1">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3g. Implications table */}
      <div className="space-y-ds-2" aria-hidden="true">
        <Skeleton className="h-4 w-40" />
        <SkeletonTable rows={4} cols={5} />
      </div>
    </SkeletonPage>
  );
}
