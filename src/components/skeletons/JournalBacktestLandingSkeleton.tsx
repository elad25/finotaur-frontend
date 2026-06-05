/**
 * Bespoke loading skeleton for /app/journal/backtest (BacktestLanding).
 *
 * The real page is a marketing/upsell landing for non-Premium users.
 * Layout:
 *   1. Premium badge + hero headline + CTA buttons
 *   2. Feature grid — 6 cards (3 cols)
 *   3. Comparison table
 *   4. Final CTA panel
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalBacktestLandingSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* 1. Hero */}
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <Skeleton className="h-10 w-40 rounded-full" />
        <Skeleton className="h-16 w-96 rounded-xl" />
        <Skeleton className="h-16 w-80 rounded-xl" />
        <Skeleton className="h-4 w-2/3 mt-2" />
        <div className="flex gap-4 mt-4">
          <Skeleton className="h-14 w-56 rounded-xl" />
          <Skeleton className="h-14 w-44 rounded-xl" />
        </div>
      </div>

      {/* 2. Feature grid — 3 cols × 2 rows */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-8 space-y-4"
          >
            <Skeleton className="h-14 w-14 rounded-xl" />
            <Skeleton className="h-5 w-44" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Comparison table */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-4 border-b border-border-ds-subtle p-5">
          {["Feature", "Free", "Basic", "Premium"].map((h) => (
            <Skeleton key={h} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 border-b border-border-ds-subtle p-5 items-center">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-12 mx-auto" />
            <Skeleton className="h-4 w-12 mx-auto" />
            <Skeleton className="h-4 w-12 mx-auto" />
          </div>
        ))}
      </div>

      {/* 4. Final CTA */}
      <div className="rounded-3xl border border-border-ds-subtle bg-surface-1 p-10 flex flex-col items-center gap-5">
        <Skeleton className="h-8 w-40 rounded-full" />
        <Skeleton className="h-7 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-14 w-52 rounded-xl" />
          <Skeleton className="h-14 w-44 rounded-xl" />
        </div>
      </div>
    </SkeletonPage>
  );
}
