/**
 * Bespoke loading skeleton for /app/journal/notes (Notebook).
 *
 * Mirrors the real 3-pane layout:
 *   1. Header row — "Notebook" title + mobile toggle button
 *   2. Three-pane container (horizontal):
 *      Left  (w-48): Folder sidebar — list of folder items
 *      Middle (w-64): Entry list — list of note entries
 *      Right  (flex-1): Editor area — title + content area
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalNotesSkeletonPage() {
  return (
    <SkeletonPage>
      {/* 1. Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-3 w-52" />
        </div>
      </div>

      {/* 2. Three-pane container */}
      <div className="flex gap-3 min-h-[520px]">
        {/* Left: Folder sidebar */}
        <div className="w-48 shrink-0 rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-2">
          <Skeleton className="h-7 w-full rounded-lg" />
          <div className="pt-2 space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Entry list */}
        <div className="w-64 shrink-0 rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border-ds-subtle p-2.5 space-y-1.5"
            >
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          ))}
        </div>

        {/* Right: Editor */}
        <div className="flex-1 rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-4">
          {/* Title bar */}
          <div className="flex items-center gap-3 border-b border-border-ds-subtle pb-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-7 w-7 rounded ml-auto" />
          </div>
          {/* Rich text content */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
            </div>
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
