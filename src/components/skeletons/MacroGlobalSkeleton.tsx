/**
 * Bespoke skeleton for src/pages/app/macro/tabs/GlobalMarkets.tsx
 * Real layout:
 *   1. Page header: h1 "Global Markets"
 *   2. Sub-nav (2 tabs): Heatmap / Cross-Asset
 *   3. Inner GlobalHeatmap page (default sub-tab):
 *      a. Sticky header bar: icon + h1 + live-badge + time-range pills + view-mode
 *         toggle + sort select + refresh button
 *      b. Global Stats Bar: regime label + score + Markets-Up count + Global Avg
 *         + session timeline (3 status dots)
 *      c. Narrative panel (collapsible, default open): headline + 2-line text
 *      d. US region section: region header (name + breadth counts + avg) →
 *         6-col index-card grid (6 cards) → 4-col sub-panels row (breadth/vol/fx/futures)
 *         → weighting bar → sector heatmap strip
 *      e. Europe region section: region header → 5-col index-card grid (9 cards)
 *         → 3-col sub-panels → sector heatmap strip
 *      f. Asia region section: region header → index-card grid
 */
import {
  SkeletonPage,
  SkeletonTabs,
  Skeleton,
} from '@/components/skeletons/shell';

/** One region block: header + card grid + sub-panels row + sector strip */
function RegionSectionSkeleton({
  gridCols,
  cardCount,
  subPanelCount,
}: {
  gridCols: string;
  cardCount: number;
  subPanelCount: number;
}) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {/* Region header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-ds-3">
          <Skeleton className="h-1 w-5 rounded-full" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-ds-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Index card grid */}
      <div className={`rounded-xl border border-border-ds-subtle p-4 grid ${gridCols} gap-3`}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border-ds-subtle p-3 space-y-ds-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-full rounded" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Sub-panels row */}
      <div
        className={`grid gap-4`}
        style={{ gridTemplateColumns: `repeat(${subPanelCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: subPanelCount }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-3">
            <Skeleton className="h-4 w-32" />
            <div className="space-y-ds-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sector heatmap strip */}
      <div className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-2">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-5 lg:grid-cols-11 gap-2">
          {Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MacroGlobalSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* 1. Page header */}
      <Skeleton className="h-8 w-48" aria-hidden="true" />

      {/* 2. Sub-nav: 2 tabs */}
      <SkeletonTabs count={2} />

      {/* 3a. Sticky header bar */}
      <div
        className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-3"
        aria-hidden="true"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Icon + title + live badge */}
          <div className="flex items-center gap-ds-3">
            <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
            <div className="space-y-ds-1">
              <div className="flex items-center gap-ds-2">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          {/* Controls */}
          <div className="flex items-center gap-ds-2 flex-wrap">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        {/* 3b. Global Stats Bar */}
        <div className="rounded-xl border border-border-ds-subtle px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="space-y-ds-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="w-px h-8 bg-border-ds-subtle" />
            <div className="space-y-ds-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="space-y-ds-1 text-center">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-12" />
            </div>
            <div className="space-y-ds-1 text-center">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
            <div className="w-px h-8 bg-border-ds-subtle" />
            {/* Session timeline: 3 dots */}
            <div className="flex items-center gap-ds-2">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-2 w-2 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 3c. Narrative panel */}
      <div
        className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-2"
        aria-hidden="true"
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>

      {/* 3d. United States region: 6-col grid, 4 sub-panels */}
      <RegionSectionSkeleton
        gridCols="grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        cardCount={6}
        subPanelCount={4}
      />

      {/* 3e. Europe region: 5-col grid, 3 sub-panels */}
      <RegionSectionSkeleton
        gridCols="grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
        cardCount={5}
        subPanelCount={3}
      />

      {/* 3f. Asia region: 4-col grid, 3 sub-panels */}
      <RegionSectionSkeleton
        gridCols="grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        cardCount={8}
        subPanelCount={3}
      />
    </SkeletonPage>
  );
}
