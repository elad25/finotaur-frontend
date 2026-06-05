/**
 * Bespoke loading skeleton for /app/journal/import.
 *
 * Mirrors the real multi-step wizard layout:
 *   1. Header — "Import Trades" title + subtitle
 *   2. Step indicator — 3 steps (Upload, Map Columns, Import)
 *   3. Step 1 content: large drag-and-drop file upload zone
 *   4. Supported formats card
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalImportSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-4xl">
      {/* 1. Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-3 w-52" />
      </div>

      {/* 2. Step indicator */}
      <div className="flex items-center gap-0">
        {["Upload", "Map Columns", "Import"].map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            {i < 2 && <Skeleton className="h-px w-12 mx-3" />}
          </div>
        ))}
      </div>

      {/* 3. Upload zone */}
      <div className="rounded-2xl border-2 border-dashed border-border-ds-subtle px-6 py-14 text-center space-y-4">
        <Skeleton className="h-12 w-12 rounded-xl mx-auto" />
        <Skeleton className="h-5 w-48 mx-auto" />
        <Skeleton className="h-3 w-64 mx-auto" />
        <div className="flex items-center justify-center gap-3 pt-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
      </div>

      {/* 4. Supported formats */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <Skeleton className="h-4 w-36" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border-ds-subtle bg-surface-base p-3 flex items-center gap-2"
            >
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
