/**
 * Bespoke skeleton for /app/forex/strength
 *
 * Mirrors the real layout (ForexStrength.tsx):
 *   1. CurrencyStrengthMeter — 8 horizontal bars
 *   2. Strength Rankings table — 8 rows, 7 cols (rank, currency, avg score,
 *      pairs, bull, bear, bar)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function ForexStrengthSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-48" />

      {/* CurrencyStrengthMeter */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <Skeleton className="h-4 w-44" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>

      {/* Strength Rankings table */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>
        {/* Header row */}
        <div className="grid grid-cols-7 gap-3 pb-2 border-b border-border-ds-subtle">
          {["#", "Currency", "Avg Score", "Pairs", "Bull", "Bear", "Bar"].map((h) => (
            <Skeleton key={h} className="h-3 w-full" />
          ))}
        </div>
        {/* 8 currency rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-3 py-1">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full mt-1" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
