/**
 * Bespoke loading skeleton for /app/journal/support.
 *
 * Mirrors the real layout:
 *   1. Header — "Support Center" title + subtitle
 *   2. Info cards row — 3 cards (Response Time, Direct Email, Discord)
 *   3. AI Support chat card (full-width, chat-history area + input)
 *   4. Contact form card — subject select + message textarea + submit
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalSupportSkeletonPage() {
  return (
    <SkeletonPage>
      {/* 1. Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-3 w-72" />
      </div>

      {/* 2. Info cards row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[18px] border border-border-ds-subtle bg-surface-1 p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>

      {/* 3. AI Support chat card */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-ds-subtle">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        {/* Chat history area */}
        <div className="p-4 space-y-4 min-h-[240px]">
          {[{ side: "right", w: "w-2/3" }, { side: "left", w: "w-3/4" }, { side: "right", w: "w-1/2" }].map((msg, i) => (
            <div key={i} className={`flex ${msg.side === "right" ? "justify-end" : "justify-start"}`}>
              <Skeleton className={`h-10 ${msg.w} rounded-2xl`} />
            </div>
          ))}
        </div>
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 pb-4">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        </div>
      </div>

      {/* 4. Contact form */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-6 space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </SkeletonPage>
  );
}
