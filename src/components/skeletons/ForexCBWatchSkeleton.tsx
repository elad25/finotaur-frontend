/**
 * Bespoke skeleton for /app/forex/cb-watch (Central Bank Watch)
 *
 * Mirrors the real layout (ForexCBWatch.tsx):
 *   1. Policy Rates card — table: Bank | Currency | Policy Rate | Last Change | Next Meeting (8 rows)
 *   2. Carry Differentials card — table: Pair | Base | Quote | Differential (8 rows)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function ForexCBWatchSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-52" />

      {/* Policy Rates table */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="grid grid-cols-5 gap-3 pb-2 border-b border-border-ds-subtle">
          {["Bank", "Currency", "Policy Rate", "Last Change", "Next Meeting"].map((h) => (
            <Skeleton key={h} className="h-3 w-full" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-3 py-1 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-12 rounded" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>

      {/* Carry Differentials table */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="grid grid-cols-4 gap-3 pb-2 border-b border-border-ds-subtle">
          {["Pair", "Base", "Quote", "Differential"].map((h) => (
            <Skeleton key={h} className="h-3 w-full" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-3 py-1 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
