/**
 * Bespoke loading skeleton for /app/journal/ai-review (FINOTAUR AI Chat).
 *
 * Mirrors the real full-height layout:
 *   1. Header — "FINOTAUR AI Chat" title + time-range select
 *      + group-by select + "Use My Trades" toggle + Full Analysis button
 *      + trades-loaded badge + questions-left badge
 *   2. Chat interface — fills remaining height:
 *      - Message area (empty state or messages)
 *      - Prompt chips (2 rows)
 *      - Input bar at the bottom
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalAIReviewSkeletonPage() {
  return (
    <div
      className="relative flex flex-col overflow-hidden"
      role="status"
      aria-label="Loading"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      {/* 1. Header */}
      <div className="border-b border-border-ds-subtle bg-surface-base px-6 py-4 shrink-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-3 w-44" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-md" />
            </div>
            <Skeleton className="h-9 w-36 rounded-[12px]" />
            <Skeleton className="h-9 w-32 rounded-[12px]" />
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </div>

      {/* 2. Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface-base px-6">
        {/* Messages */}
        <div className="flex-1 py-6 space-y-4 overflow-hidden">
          {[
            { side: "right", w: "w-3/5" },
            { side: "left", w: "w-4/5" },
            { side: "right", w: "w-2/5" },
          ].map((msg, i) => (
            <div key={i} className={`flex ${msg.side === "right" ? "justify-end" : "justify-start"}`}>
              <Skeleton className={`h-14 ${msg.w} rounded-2xl`} />
            </div>
          ))}
        </div>

        {/* Prompt chips — 2 rows */}
        <div className="space-y-2 pb-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-40 rounded-full" />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-36 rounded-full" />
            ))}
          </div>
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-3 pb-6">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
        </div>
      </div>
    </div>
  );
}
