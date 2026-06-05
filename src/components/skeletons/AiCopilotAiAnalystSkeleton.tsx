/**
 * Skeleton for /app/ai/copilot/ai-analyst (CopilotAIAnalystPage → DailyBrief)
 *
 * CopilotAIAnalystPage delegates entirely to DailyBrief which is a module-driven
 * brief composition with a headline panel + N brief modules.
 * Skeleton mirrors the DailyBrief shell: header section + 3 brief module cards.
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonCard,
  SkeletonText,
} from "@/components/skeletons/shell";

export function AiCopilotAiAnalystSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* CopilotPageShell header (frameless — title area only) */}
      <div className="mb-ds-5 flex flex-wrap items-center justify-between gap-ds-3">
        <div className="flex items-center gap-ds-3">
          <Skeleton className="h-11 w-11 rounded-[7px] flex-shrink-0" />
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
        <Skeleton className="h-8 w-32 rounded-[6px]" />
      </div>

      {/* DailyBrief headline panel */}
      <div className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5 space-y-ds-3">
        <Skeleton className="h-3 w-32" />
        <SkeletonText lines={4} />
      </div>

      {/* Brief modules — 3 cards */}
      <div className="space-y-ds-3">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={2} />
      </div>
    </SkeletonPage>
  );
}
