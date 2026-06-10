/**
 * Skeleton for /app/ai/copilot/macro (CopilotMacroPage)
 *
 * Loaded state: CopilotPageShell header +
 * hero section (central thesis) + 2-col row (weekly context / tactical) +
 * key risks section + ground sentiment section.
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonCard,
  SkeletonText,
} from "@/components/skeletons/shell";

export function AiCopilotMacroSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* CopilotPageShell header */}
      <div className="mb-ds-4 flex flex-wrap items-center justify-between gap-ds-3">
        <div className="flex items-center gap-ds-3">
          <Skeleton className="h-11 w-11 rounded-[7px] flex-shrink-0" />
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-32 rounded-[6px]" />
      </div>

      {/* Central thesis hero */}
      <div className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5 space-y-ds-4">
        <div className="flex items-center justify-between border-b border-border-ds-subtle pb-ds-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
        <SkeletonText lines={3} />
      </div>

      {/* Weekly context + tactical — 2 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-ds-3">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>

      {/* Key risks */}
      <div className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5 space-y-ds-4">
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-ds-3">
            <Skeleton className="h-5 w-5 rounded-[4px] flex-shrink-0" />
            <SkeletonText lines={2} className="flex-1" />
          </div>
        ))}
      </div>

      {/* Ground sentiment */}
      <div className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5 space-y-ds-3">
        <Skeleton className="h-3 w-32" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-[7px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-4">
            <SkeletonText lines={2} />
            <Skeleton className="h-3 w-40 mt-ds-2" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
