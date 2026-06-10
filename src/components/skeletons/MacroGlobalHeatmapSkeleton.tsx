/**
 * Bespoke skeleton for src/pages/app/macro/GlobalHeatmap.tsx
 * Layout: sticky header (title + global stats bar) →
 *   Narrative panel →
 *   US section: 6-col grid + 4-col (breadth/vol/fx/futures) + weighting + sector heatmap →
 *   Europe section: 5-col grid + 3-col + sector heatmap →
 *   Asia section: ~10-col grid + panels →
 *   Cross-region matrix / comparison panels
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function MacroGlobalHeatmapSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-full">
      {/* Sticky header simulation */}
      <div className="space-y-ds-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-ds-1">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          {/* Controls: range pills + view toggle + sort */}
          <div className="flex gap-ds-2">
            <Skeleton className="h-9 w-40 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>
        {/* Global stats bar */}
        <div className="flex items-center justify-between rounded-xl border border-border-ds-subtle px-4 py-3">
          <div className="flex gap-6">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="flex gap-6">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>

      {/* Narrative panel (collapsible) */}
      <Skeleton className="h-14 w-full rounded-xl" />

      {/* ── United States section ── */}
      <div className="space-y-ds-3">
        <Skeleton className="h-5 w-36" />
        {/* 6-col index card grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        {/* 4-col sub-panels: breadth / vol+rates / FX / futures */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
        {/* Weighting panel */}
        <Skeleton className="h-20 rounded-lg" />
        {/* Sector heatmap: responsive grid */}
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>

      {/* ── Europe section ── */}
      <div className="space-y-ds-3">
        <Skeleton className="h-5 w-28" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-4 md:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>

      {/* ── Asia Pacific section ── */}
      <div className="space-y-ds-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Cross-region matrix + comparison table */}
      <div className="grid grid-cols-2 gap-4">
        <SkeletonTable rows={4} cols={5} />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </SkeletonPage>
  );
}
