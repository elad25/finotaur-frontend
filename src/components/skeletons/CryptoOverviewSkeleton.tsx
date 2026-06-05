/**
 * Bespoke skeleton for /app/crypto/overview (Crypto Dashboard).
 *
 * Mirrors the real CryptoOverview layout (PageTemplate wrapper):
 *   0. PageTemplate header — breadcrumb + h1 title + description line
 *   1. LiveTicker — full-width scrolling price bar strip
 *   2. MarketStatsBar — 6-col grid of stat cards (2 on mobile → 3 → 6)
 *   3. xl:grid-cols-4 main layout:
 *      Left (xl:col-span-3, space-y-4):
 *        a. TopCoinsTable — GlassCard: title+subtitle + 8-col table (50 coins, 15 shown while loading)
 *        b. MiniHeatmap — GlassCard: title + flex-wrap of ~40 sized tiles
 *      Right sidebar (1 col, space-y-3): 4 stacked GlassCards
 *        • Top Gainers  — title + 5 coin rows (icon+symbol | %change)
 *        • Top Losers   — title + 5 coin rows
 *        • Trending     — title + 8 coin rows
 *        • Volume Spikes — title + ~8 coin rows
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function CryptoOverviewSkeletonPage() {
  return (
    <SkeletonPage>
      {/* PageTemplate header: breadcrumb + h1 + description */}
      <SkeletonHeader titleWidth="w-48" withEyebrow />

      {/* 1. LiveTicker — scrolling bar */}
      <Skeleton className="h-10 w-full rounded-xl" />

      {/* 2. MarketStatsBar — 6 stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-1.5"
          >
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>

      {/* 3. Main layout: xl:grid-cols-4 */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Left: col-span-3 */}
        <div className="xl:col-span-3 space-y-4">
          {/* a. TopCoinsTable — GlassCard with section header + table body */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
            <div className="space-y-0.5">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-3 w-40" />
            </div>
            {/* Table header: # | Coin | Price | 24h | 7d | MCap | Volume | Vol/MCap | 7d chart */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto_auto] gap-2 pb-2 border-b border-border-ds-subtle">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-10" />
              ))}
            </div>
            {/* 15 coin rows */}
            {Array.from({ length: 15 }).map((_, r) => (
              <div
                key={r}
                className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto_auto] gap-2 py-1.5 border-b border-border-ds-subtle"
              >
                <Skeleton className="h-4 w-6" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-8" />
                </div>
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-16" />
                ))}
              </div>
            ))}
          </div>

          {/* b. MiniHeatmap — GlassCard with title + flex-wrap tiles */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
            <div className="space-y-0.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 40 }).map((_, i) => {
                const sz = Math.max(28, 28 + (i % 5) * 10);
                return (
                  <Skeleton
                    key={i}
                    className="rounded-md"
                    style={{ width: sz, height: sz }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right sidebar: 4 stacked GlassCards */}
        <div className="space-y-3">
          {/* Top Gainers — 5 coin rows */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-2">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-1 px-1">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>

          {/* Top Losers — 5 coin rows */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-2">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-1 px-1">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>

          {/* Trending — 8 coin rows */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-2">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-1 px-1">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>

          {/* Volume Spikes — 8 coin rows */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-2">
            <div className="space-y-0.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-2.5 w-28" />
            </div>
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-1 px-1">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
