/**
 * Bespoke skeleton for /app/forex/heatmap (Currency Heatmap)
 *
 * Mirrors the real layout (ForexHeatmap.tsx):
 *   Single GlassCard → 8×8 grid (column header row + 8 data rows × 8 cells),
 *   plus a legend strip at the bottom.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

const MAJORS = 8;

export function ForexHeatmapSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-48" />

      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3 overflow-x-auto">
        {/* Column headers: spacer + 8 currency labels */}
        <div className="flex gap-1.5" style={{ paddingLeft: "52px" }}>
          {Array.from({ length: MAJORS }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-11 flex-shrink-0" />
          ))}
        </div>

        {/* 8 rows */}
        {Array.from({ length: MAJORS }).map((_, r) => (
          <div key={r} className="flex items-center gap-1.5">
            {/* Row label */}
            <Skeleton className="h-4 w-[48px] flex-shrink-0" />
            {/* 8 cells */}
            {Array.from({ length: MAJORS }).map((_, c) => (
              <Skeleton key={c} className="h-9 w-11 flex-shrink-0 rounded" />
            ))}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-border-ds-subtle">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24 ml-auto" />
        </div>
      </div>
    </SkeletonPage>
  );
}
