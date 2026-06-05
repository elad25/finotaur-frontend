/**
 * Bespoke skeleton for src/pages/app/macro/tabs/Pulse.tsx
 * Real layout:
 *   1. Page header row: h1 "Macro Pulse" + MarketStatusBadge (right)
 *   2. MacroChart: controls bar (title pill + ticker chips + normalize toggle) →
 *      tall line chart (≈340px) → time-range pill strip
 *   3. Overview section (MacroOverview embedded):
 *      - Sub-header row: "Market Overview" + live indicator pill
 *      - Market Sentiment Bar (full-width card with colored progress bar)
 *      - 5-col asset-card grid (10 cards, each: icon + symbol + price + daily/weekly change + volume)
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonChart,
} from '@/components/skeletons/shell';

export function MacroPulseSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* 1. Page header row */}
      <div className="flex items-center justify-between" aria-hidden="true">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      {/* 2. MacroChart: controls bar */}
      <div className="rounded-2xl border border-border-ds-subtle p-4 space-y-ds-4">
        <div className="flex items-center justify-between flex-wrap gap-ds-2">
          {/* Title pill + ticker chips */}
          <div className="flex items-center gap-ds-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-8 rounded-full" />
          </div>
          {/* Normalize toggle + range pills */}
          <div className="flex items-center gap-ds-2">
            <Skeleton className="h-7 w-24 rounded-lg" />
            <Skeleton className="h-7 w-8 rounded-full" />
            <Skeleton className="h-7 w-8 rounded-full" />
            <Skeleton className="h-7 w-8 rounded-full" />
            <Skeleton className="h-7 w-8 rounded-full" />
          </div>
        </div>
        {/* Tall line chart */}
        <SkeletonChart height="h-[340px]" />
      </div>

      {/* 3. Overview section: sub-header */}
      <div className="flex items-center justify-between" aria-hidden="true">
        <Skeleton className="h-7 w-52" />
        {/* Live indicator pill */}
        <div className="flex items-center gap-ds-2">
          <Skeleton className="h-6 w-32 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Market Sentiment Bar */}
      <div className="rounded-2xl border border-border-ds-subtle p-6 space-y-ds-3">
        <div className="flex items-center justify-between">
          <div className="space-y-ds-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
        {/* Colored progress bar */}
        <Skeleton className="h-3 w-full rounded-full" />
        {/* Legend */}
        <div className="flex items-center justify-center gap-6">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* 5-col asset-card grid (10 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-3"
            aria-hidden="true"
          >
            {/* Header: icon + symbol/name + badge */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-ds-2">
                <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                <div className="space-y-ds-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            {/* Price */}
            <Skeleton className="h-7 w-28" />
            {/* Daily / Weekly 2-col mini grid */}
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            {/* Volume row */}
            <div className="flex justify-between">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
