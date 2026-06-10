/**
 * Bespoke skeleton for /app/forex/pairs
 *
 * Mirrors the real layout (ForexPairs.tsx):
 *   Single GlassCard → section header + sortable table:
 *   Pair | Price | Change | % Change | → (arrow)
 *   ~20 pair rows.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function ForexPairsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-52" />

      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        {/* Section header */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-56" />
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-5 gap-3 pb-2 border-b border-border-ds-subtle">
          {["Pair", "Price", "Change", "% Change", ""].map((h, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>

        {/* ~20 pair rows */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-3 py-1 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
