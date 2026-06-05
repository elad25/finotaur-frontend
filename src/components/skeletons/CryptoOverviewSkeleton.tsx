/**
 * Bespoke skeleton for src/pages/app/crypto/Overview.tsx
 * Layout:
 *   1. LiveTicker — scrolling bar strip
 *   2. MarketStatsBar — 6-col stat grid
 *   3. 4-col layout:
 *      Left (3-col): TopCoinsTable (8-col table, 15 rows) + MiniHeatmap (flex-wrap tiles)
 *      Right (1-col): SidebarWidgets (4 stacked cards: Gainers, Losers, Trending, Volume)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function CryptoOverviewSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-44" withEyebrow={false} />

      {/* Live Ticker bar */}
      <Skeleton className="h-10 w-full rounded-xl" />

      {/* Market Stats Bar — 6 stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>

      {/* Main 4-col layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Left: table + heatmap */}
        <div className="xl:col-span-3 space-y-4">
          {/* TopCoinsTable */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
            <div className="space-y-0.5">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-36" />
            </div>
            <SkeletonTable rows={15} cols={6} />
          </div>

          {/* MiniHeatmap */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 40 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="rounded-md"
                  style={{ width: Math.max(28, 28 + (i % 5) * 10), height: Math.max(28, 28 + (i % 5) * 10) }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar: 4 cards */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-2">
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-3 w-14" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
