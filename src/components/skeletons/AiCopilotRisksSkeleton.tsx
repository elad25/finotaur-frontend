/**
 * Skeleton for /app/ai/copilot/risks (CopilotRisksPage)
 *
 * Loaded state: CopilotPageShell header +
 * risk score panel (gauge + score + level + main drivers — 3-col grid) +
 * 4 RiskDriverCards (2-col md / 4-col xl) +
 * top-exposures list + risk summary panel.
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function AiCopilotRisksSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* CopilotPageShell header */}
      <div className="mb-ds-4 flex flex-wrap items-center justify-between gap-ds-3">
        <div className="flex items-center gap-ds-3">
          <Skeleton className="h-11 w-11 rounded-[7px] flex-shrink-0" />
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <Skeleton className="h-8 w-32 rounded-[6px]" />
      </div>

      {/* Risk score panel — 3-col grid */}
      <div className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-1 overflow-hidden">
        <div className="px-ds-5 pt-ds-4">
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="grid divide-y divide-border-ds-subtle lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {/* Gauge + score */}
          <div className="flex min-h-[116px] items-center gap-ds-4 px-ds-5 pb-ds-4 pt-ds-2">
            <Skeleton className="h-[78px] w-[142px] rounded-[8px] flex-shrink-0" />
            <div className="space-y-ds-1">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
          {/* Level */}
          <div className="flex min-h-[116px] flex-col justify-center px-ds-5 py-ds-4 space-y-ds-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
          {/* Main drivers */}
          <div className="flex min-h-[116px] flex-col justify-center px-ds-5 py-ds-4 space-y-ds-3">
            <Skeleton className="h-3 w-28" />
            <div className="flex flex-wrap gap-ds-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-7 w-28 rounded-[6px]" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4 RiskDriverCards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-ds-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} className="min-h-[164px]" />
        ))}
      </div>

      {/* Top-exposures list */}
      <div className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-4 space-y-ds-3">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-36" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[36px_60px_1fr_60px] items-center gap-ds-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>

      {/* Risk summary */}
      <div className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-4">
        <Skeleton className="h-3 w-28 mb-ds-3" />
        <div className="flex gap-ds-4">
          <Skeleton className="h-12 w-12 rounded-[8px] flex-shrink-0" />
          <div className="space-y-ds-2 flex-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
