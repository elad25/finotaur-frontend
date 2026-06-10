/**
 * Bespoke skeleton for /app/forex/pair/:symbol (Pair Detail)
 *
 * Mirrors the real layout (ForexPair.tsx):
 *   1. Price hero card — last price + change/pct
 *   2. Intraday chart card — 140px chart area
 *   3. Technical snapshot — 6-stat grid
 *   4. Sparkline mini card — price path + first/last price
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonStatRow,
} from "@/components/skeletons/shell";

export function ForexPairDetailSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-32" />

      {/* Price hero */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </div>

      {/* Intraday chart */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-[140px] w-full rounded-xl" />
      </div>

      {/* Technical snapshot — 6 stats */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-60" />
        </div>
        <SkeletonStatRow count={6} />
      </div>

      {/* Sparkline mini card */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="text-right space-y-2 flex-shrink-0">
          <Skeleton className="h-3 w-16 ml-auto" />
          <Skeleton className="h-4 w-20 ml-auto" />
          <Skeleton className="h-3 w-16 ml-auto" />
          <Skeleton className="h-4 w-20 ml-auto" />
        </div>
      </div>
    </SkeletonPage>
  );
}
