/**
 * Skeleton for /app/ai/sector-analyzer
 *
 * Loaded state: centered title hero + trust-badge row + 11-sector grid (4 cols).
 * Mirrors the HomeView landing state (sector selection, before a sector is chosen).
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonGrid,
} from "@/components/skeletons/shell";

export function AiSectorAnalyzerSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1224px]">
      {/* Title hero — centered, large */}
      <div className="flex flex-col items-center gap-ds-3 mb-ds-4 text-center">
        <Skeleton className="h-3 w-40" />
        {/* Large gradient title */}
        <Skeleton className="h-14 w-72 md:w-96" />
        {/* Sub-label */}
        <Skeleton className="h-3 w-52" />
      </div>

      {/* Sub-heading */}
      <div className="flex justify-center mb-ds-5">
        <Skeleton className="h-6 w-72" />
      </div>

      {/* 11-sector grid, 4 cols */}
      <SkeletonGrid count={11} cols={4} cardLines={2} />

      {/* Footer trust badge row — 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 rounded-[8px] border-[0.5px] border-border-ds-subtle overflow-hidden mt-ds-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-ds-4 px-7 py-3.5">
            <Skeleton className="h-8 w-8 rounded-[8px] flex-shrink-0" />
            <div className="space-y-ds-1 min-w-0">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
