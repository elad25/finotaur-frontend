/**
 * Skeleton for /app/ai/copilot/ai-chat (CopilotAIChatPage)
 *
 * Loaded state: CopilotPageShell header + CopilotChatPanel (min-h-[680px])
 * which is a full-height chat interface (messages + input bar).
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function AiCopilotAiChatSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* CopilotPageShell header */}
      <div className="mb-ds-4 flex flex-wrap items-center justify-between gap-ds-3">
        <div className="flex items-center gap-ds-3">
          <Skeleton className="h-11 w-11 rounded-[7px] flex-shrink-0" />
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-6 w-40" />
          </div>
        </div>
        <Skeleton className="h-8 w-32 rounded-[6px]" />
      </div>

      {/* CopilotChatPanel (min-h-[680px] in loaded state) */}
      <div
        className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 min-h-[680px] flex flex-col"
        aria-hidden="true"
      >
        {/* Messages area */}
        <div className="flex-1 p-ds-5 space-y-ds-4">
          {/* Assistant message */}
          <div className="flex gap-ds-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-ds-2 max-w-[65%]">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          {/* User message */}
          <div className="flex justify-end">
            <Skeleton className="h-9 w-56 rounded-[16px]" />
          </div>
          {/* Assistant message */}
          <div className="flex gap-ds-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-ds-2 max-w-[55%]">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-border-ds-subtle p-ds-4">
          <div className="flex items-center gap-ds-3 rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base px-4 py-3">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-8 w-8 rounded-[8px] flex-shrink-0" />
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
