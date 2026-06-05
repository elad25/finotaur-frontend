/**
 * Skeleton for /app/ai/ai-assistant (FINOTAUR AI chat)
 *
 * Loaded state: full-height flex layout —
 *   header (title + sparkles + "New Chat" button) | optional usage banner |
 *   chat interface (messages list + input bar at bottom).
 * Uses h-[calc(100vh-4rem)] so the skeleton occupies the same height.
 */
import { Skeleton } from "@/components/skeletons/shell";

export function AiAssistantSkeletonPage() {
  return (
    <div
      className="relative flex h-[calc(100vh-4rem)] overflow-hidden bg-surface-base"
      role="status"
      aria-label="Loading"
    >
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div
          className="relative border-b border-border-ds-subtle bg-surface-base px-6 py-4"
          aria-hidden="true"
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="space-y-ds-1">
                {/* "FINOTAUR AI ✦" title */}
                <Skeleton className="h-5 w-36" />
                {/* Conversation title */}
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            {/* New Chat button */}
            <Skeleton className="hidden sm:block h-9 w-24 rounded-[12px]" />
          </div>
        </div>

        {/* Chat messages area */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4 space-y-ds-4"
          aria-hidden="true"
        >
          {/* Simulate a few previous messages — alternating user / assistant */}
          {/* Assistant message (wide) */}
          <div className="flex gap-ds-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-ds-2 max-w-[70%]">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          {/* User message (aligned right) */}
          <div className="flex justify-end">
            <Skeleton className="h-10 w-48 rounded-[16px]" />
          </div>
          {/* Assistant message */}
          <div className="flex gap-ds-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-ds-2 max-w-[60%]">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div
          className="border-t border-border-ds-subtle bg-surface-base px-4 py-3"
          aria-hidden="true"
        >
          <div className="flex items-center gap-ds-3 rounded-[16px] border-[0.5px] border-border-ds-subtle bg-surface-1 px-4 py-3">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-8 w-8 rounded-[8px] flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
