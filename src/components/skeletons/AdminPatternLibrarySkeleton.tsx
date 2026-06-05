/**
 * AdminPatternLibrarySkeleton — mirrors /app/admin/pattern-library-list (PatternLibraryList).
 *
 * Layout: header (title + "Analyze new" link) → filters row (4 controls: category
 * select, direction select, sector input, apply button) → patterns table (6 rows × 7 cols).
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function AdminPatternLibrarySkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-6xl">
      {/* Header */}
      <SkeletonHeader titleWidth="w-48" withEyebrow={false} withActions />

      {/* Filters row (4 inputs) */}
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-ds-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-[8px]" />
          ))}
        </div>
      </div>

      {/* Patterns table */}
      <SkeletonTable rows={6} cols={7} />
    </SkeletonPage>
  );
}
