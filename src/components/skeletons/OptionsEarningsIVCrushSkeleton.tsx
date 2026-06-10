/**
 * Bespoke skeleton for /app/options/earnings-iv-crush (Earnings IV Crush)
 *
 * Stub page — mirrors anticipated layout:
 *   1. Upcoming earnings strip
 *   2. Table: Ticker | Earnings Date | IV Before | IV After | IV Crush % | Expected Move (6 cols), 10 rows
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function OptionsEarningsIVCrushSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-52" />

      {/* Upcoming earnings strip */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 flex items-center gap-4 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 space-y-1.5">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      <SkeletonTable rows={10} cols={6} />
    </SkeletonPage>
  );
}
