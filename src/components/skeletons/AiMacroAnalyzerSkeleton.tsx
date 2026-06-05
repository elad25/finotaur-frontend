/**
 * Skeleton for /app/ai/macro-analyzer
 *
 * Loaded state: centered title hero + trust-badge row (3 cols) +
 * 6-tab navigation + 2-column content grid (2 × h-80 panels).
 * Mirrors the MacroAnalyzer loaded layout exactly.
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function AiMacroAnalyzerSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1440px]">
      {/* Title hero — centered */}
      <div className="flex flex-col items-center gap-ds-3 mb-ds-4 text-center">
        <Skeleton className="h-14 w-72 md:w-96" />
        <Skeleton className="h-3 w-64" />
      </div>

      {/* Trust badges row — 3 columns */}
      <div className="mx-auto grid w-full max-w-[820px] grid-cols-1 sm:grid-cols-3 gap-0 rounded-[8px] border-[0.5px] border-border-ds-subtle overflow-hidden mb-ds-5">
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

      {/* 6-tab strip */}
      <div className="flex flex-wrap justify-center gap-ds-2 border-b border-border-ds-subtle pb-ds-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-[12px]" />
        ))}
      </div>

      {/* 2-column content panels */}
      <div className="grid grid-cols-1 gap-ds-5 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-[12px]" />
        <Skeleton className="h-80 w-full rounded-[12px]" />
      </div>

      {/* Footer line */}
      <div className="flex justify-center mt-ds-4">
        <Skeleton className="h-3 w-64" />
      </div>
    </SkeletonPage>
  );
}
