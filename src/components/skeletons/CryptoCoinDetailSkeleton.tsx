/**
 * Bespoke skeleton for src/pages/app/crypto/CoinDetail.tsx
 * Layout (this page uses RouteSkeleton for whole-page gate):
 *   1. QuickStats card: coin icon + name/rank + price + change pills + 6-stat grid + supply bar
 *   2. Tab strip: 4 tabs (Chart & Signals | Derivatives | Fundamentals | Compare)
 *   3. Active tab content (Chart & Signals — default):
 *      - GlassCard: interval tabs + CandleChart (h-[350px])
 *      - GlassCard: 3-col signal badge grid (6 cards)
 */
import {
  SkeletonPage,
  SkeletonTabs,
  Skeleton,
  SkeletonChart,
  SkeletonCard,
} from '@/components/skeletons/shell';

export function CryptoCoinDetailSkeletonPage() {
  return (
    <SkeletonPage>
      {/* QuickStats card */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        {/* Coin identity */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-5 w-10 rounded" />
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-16 rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* Price + change pills */}
        <div className="flex items-end gap-3 flex-wrap">
          <Skeleton className="h-7 w-32" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="text-center space-y-0.5">
                <Skeleton className="h-2.5 w-6" />
                <Skeleton className="h-3.5 w-12" />
              </div>
            ))}
          </div>
        </div>

        {/* 6-stat grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle bg-surface-2 p-2 space-y-1">
              <Skeleton className="h-2.5 w-10" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        {/* Supply bar */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>

      {/* Tab strip */}
      <SkeletonTabs count={4} />

      {/* Chart & Signals tab (default) */}
      <div className="space-y-4">
        {/* Candle chart */}
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <div className="flex gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-10 rounded-lg" />
              ))}
            </div>
          </div>
          <SkeletonChart height="h-[350px]" />
        </div>

        {/* Signal badges — 3-col grid */}
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} lines={2} />
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
