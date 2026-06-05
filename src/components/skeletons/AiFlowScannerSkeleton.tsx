/**
 * Skeleton for /app/ai/flow-scanner
 *
 * Loaded state: centered title hero + feature-rail (5 items) +
 * 4-stat QuickStats row + 5-tab nav + tab content (list of flow cards) +
 * signal feed section at the bottom.
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonStatRow,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function AiFlowScannerSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1536px]">
      {/* Title hero */}
      <div className="flex flex-col items-center gap-ds-3 text-center mb-ds-3">
        <Skeleton className="h-14 w-56 md:w-80" />
        <Skeleton className="h-5 w-96 max-w-full" />
        {/* Feature rail — 5 items */}
        <div className="flex flex-wrap items-center justify-center gap-ds-5 mt-ds-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-ds-2">
              <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* QuickStats — 4 stat cards */}
      <SkeletonStatRow count={4} />

      {/* 5-tab navigation */}
      <div className="flex justify-center overflow-x-auto px-4 mb-ds-3">
        <div className="flex gap-ds-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-[12px]" />
          ))}
        </div>
      </div>

      {/* Tab content — flow list (4 rows of cards) */}
      <div className="space-y-ds-3 mb-ds-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[12px]" />
        ))}
      </div>

      {/* Signal feed section */}
      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5">
        <Skeleton className="h-5 w-40 mb-ds-4" />
        <div className="space-y-ds-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} lines={1} />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
