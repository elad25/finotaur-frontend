/**
 * Bespoke loading skeleton for /app/journal/finotaur-ai (AI Coach / FINO).
 *
 * Mirrors the real layout:
 *   1. Score hero — circular score + title line
 *   2. Daily briefing banner (full-width)
 *   3. Chat panel — full-height layout:
 *      - Prompt chips row
 *      - Conversation area (empty, then messages)
 *      - Input bar at the bottom
 *
 * During initial load (subscription not yet resolved) the page renders the
 * PageLoader — we mirror the same full-height centered spinner layout.
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalFinotaurAISkeletonPage() {
  return (
    <SkeletonPage>
      {/* Score hero */}
      <div className="flex items-center gap-5 rounded-2xl border border-border-ds-subtle bg-surface-1 px-6 py-5">
        <Skeleton className="h-16 w-16 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-9 w-32 rounded-[12px] shrink-0" />
      </div>

      {/* Daily briefing banner */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>

      {/* Chat panel — full height */}
      <div
        className="flex flex-col rounded-2xl border border-border-ds-subtle bg-surface-1 overflow-hidden"
        style={{ minHeight: "calc(100vh - 350px)" }}
      >
        {/* Prompt chips row */}
        <div className="flex gap-2 flex-wrap px-5 py-3 border-b border-border-ds-subtle">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-36 rounded-full" />
          ))}
        </div>

        {/* Message area */}
        <div className="flex-1 p-5 space-y-4">
          {[{ side: "right", w: "w-2/3" }, { side: "left", w: "w-3/4" }, { side: "right", w: "w-1/2" }, { side: "left", w: "w-4/5" }].map((msg, i) => (
            <div key={i} className={`flex ${msg.side === "right" ? "justify-end" : "justify-start"}`}>
              <Skeleton className={`h-12 ${msg.w} rounded-2xl`} />
            </div>
          ))}
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-3 px-5 pb-5 pt-3 border-t border-border-ds-subtle">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
        </div>
      </div>
    </SkeletonPage>
  );
}
