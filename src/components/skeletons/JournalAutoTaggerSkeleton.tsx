/**
 * Bespoke loading skeleton for /app/journal/auto-tagger.
 *
 * Mirrors the real layout (two cards stacked):
 *   1. Header — "Auto-Tagger" title + subtitle
 *   2. Rules card — header with "+ New rule" button + rules list
 *   3. Apply card — description + "Run auto-tagger" button + preview table
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalAutoTaggerSkeletonPage() {
  return (
    <SkeletonPage>
      {/* 1. Page title */}
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-3 w-72" />
      </div>

      {/* 2. Rules card */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        {/* 5 rule rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border-ds-subtle bg-surface-base px-4 py-3"
          >
            {/* Toggle */}
            <Skeleton className="h-5 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-3 w-16 shrink-0" />
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-7 w-14 rounded-lg" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Apply card */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-72" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-8 w-32 rounded-lg shrink-0" />
        </div>

        {/* Preview impact table */}
        <div className="rounded-lg border border-border-ds-subtle overflow-hidden">
          <div className="grid grid-cols-4 gap-2 bg-surface-base px-4 py-2 border-b border-border-ds-subtle">
            {["Rule", "Tag", "Matches", "Status"].map((h) => (
              <Skeleton key={h} className="h-3" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-border-ds-subtle last:border-b-0 items-center">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-3" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
