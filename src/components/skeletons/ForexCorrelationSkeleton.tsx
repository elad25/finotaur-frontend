/**
 * Bespoke skeleton for /app/forex/correlation
 *
 * Mirrors the real layout (ForexCorrelation.tsx):
 *   1. Card with toggle header (30D / 90D) + 7×7 correlation matrix grid
 *   2. Legend strip at the bottom
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

const MATRIX_SIZE = 7; // 7 major pairs in the demo matrix

export function ForexCorrelationSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-48" />

      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-4">
        {/* Header: description + window toggle */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-56" />
          <div className="flex gap-1">
            <Skeleton className="h-7 w-12 rounded-md" />
            <Skeleton className="h-7 w-12 rounded-md" />
          </div>
        </div>

        {/* 7×7 matrix (header row + 7 data rows) */}
        <div className="overflow-x-auto">
          {/* Column headers */}
          <div className="flex gap-1.5 mb-1.5" style={{ paddingLeft: "72px" }}>
            {Array.from({ length: MATRIX_SIZE }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-16" />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: MATRIX_SIZE }).map((_, r) => (
            <div key={r} className="flex items-center gap-1.5 mb-1.5">
              <Skeleton className="h-4 w-[68px] flex-shrink-0" />
              {Array.from({ length: MATRIX_SIZE }).map((_, c) => (
                <Skeleton key={c} className="h-10 w-16 flex-shrink-0 rounded" />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-border-ds-subtle">
          {["Strong positive", "Strong negative", "Neutral"].map((label) => (
            <div key={label} className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
