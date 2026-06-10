/**
 * Skeleton for /app/ai/options-intelligence
 *
 * Loaded state: centered title hero + feature-rail (4 items) +
 * 4-tab nav + tab content area (charts + flow cards).
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonChart,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function AiOptionsIntelligenceSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1536px]">
      {/* Title hero */}
      <div className="flex flex-col items-center gap-ds-3 text-center mb-ds-3">
        <Skeleton className="h-14 w-72 md:w-96" />
        {/* Sub-label with feature rail */}
        <Skeleton className="h-5 w-80" />
        {/* Feature rail — 4 items */}
        <div className="flex flex-wrap items-center justify-center gap-ds-5 mt-ds-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-ds-2">
              <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* 4-tab navigation */}
      <div className="flex justify-center overflow-x-auto px-4 mb-ds-3">
        <div className="flex gap-ds-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-[12px]" />
          ))}
        </div>
      </div>

      {/* Tab content — overview layout: 2 charts + stat row */}
      <div className="grid grid-cols-1 gap-ds-5 lg:grid-cols-2">
        <SkeletonChart height="h-64" />
        <SkeletonChart height="h-64" />
      </div>

      {/* Flow cards grid */}
      <div className="grid grid-cols-1 gap-ds-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </SkeletonPage>
  );
}
