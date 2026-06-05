/**
 * Bespoke skeleton for /app/forex/overview (Forex Overview hub).
 *
 * Mirrors the real ForexOverview layout (PageTemplate wrapper + space-y-4 body):
 *   0. PageTemplate header — breadcrumb + h1 + description
 *   1. DXYHero — GlassCard (amber glow) with left: eyebrow labels + large price + change row;
 *      right: sparkline (220×60)
 *   2. AIMarketBrief — GlassCard with title + 4 lines of AI text + footnote row
 *   3. Two-column grid (lg:grid-cols-2, gap-4):
 *      Left  — SessionClock GlassCard: title+subtitle + overall status row + 3 session rows
 *      Right — CurrencyStrengthMeter GlassCard: title+subtitle + 8 ranked bar rows (rank | currency | bar | score | count)
 *   4. TopMovers — grid-cols-1 sm:grid-cols-2 gap-3:
 *      Left  GlassCard (emerald): "Top Gainers" title + 5 mover rows (pair | price | %chg)
 *      Right GlassCard (red):    "Top Losers"  title + 5 mover rows
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonText,
} from "@/components/skeletons/shell";

export function ForexOverviewSkeletonPage() {
  return (
    <SkeletonPage>
      {/* PageTemplate header: breadcrumb + h1 title + description */}
      <SkeletonHeader titleWidth="w-40" withEyebrow />

      {/* 1. DXYHero — GlassCard: left info + right sparkline */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: two eyebrow lines + big price + change row */}
          <div className="space-y-1">
            <Skeleton className="h-2.5 w-32" />
            <Skeleton className="h-2.5 w-36" />
            <Skeleton className="h-12 w-28 mt-2" />
            <div className="flex items-center gap-2 mt-1">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          {/* Right: sparkline (220×60) */}
          <Skeleton className="h-[60px] w-[220px] shrink-0 rounded" shimmer />
        </div>
      </div>

      {/* 2. AIMarketBrief — GlassCard: title + 4-line text + footnote */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        {/* SectionHeader: title + subtitle */}
        <div className="space-y-0.5">
          <Skeleton className="h-4 w-32" />
        </div>
        {/* 4 lines of commentary */}
        <SkeletonText lines={4} />
        {/* Footnote row */}
        <div className="flex items-center gap-3 pt-3 border-t border-border-ds-subtle">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>

      {/* 3. SessionClock + CurrencyStrengthMeter (lg:grid-cols-2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SessionClock GlassCard */}
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
          {/* SectionHeader: title + subtitle (UTC hour) */}
          <div className="space-y-0.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          {/* Overall market status row (dot + text) */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
            <Skeleton className="h-3 w-48" />
          </div>
          {/* 3 session rows (Sydney/Tokyo, London, New York) */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-2 rounded-xl border border-border-ds-subtle"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-sm" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-24 hidden sm:block" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* CurrencyStrengthMeter GlassCard */}
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
          {/* SectionHeader */}
          <div className="space-y-0.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          {/* 8 currency rows: rank | currency | bar | score | count */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-4 shrink-0" />
              <Skeleton className="h-3 w-10 shrink-0" />
              <div className="flex-1 h-2 rounded-full overflow-hidden border border-border-ds-subtle">
                <Skeleton
                  className="h-full rounded-full"
                  style={{ width: `${40 + (i % 5) * 10}%` }}
                />
              </div>
              <Skeleton className="h-3 w-14 shrink-0" />
              <Skeleton className="h-3 w-8 shrink-0 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. TopMovers — 2-col grid of GlassCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Top Gainers */}
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-1">
          <Skeleton className="h-4 w-28 mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg"
            >
              <Skeleton className="h-3 w-16" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-14 hidden sm:block" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* Top Losers */}
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-1">
          <Skeleton className="h-4 w-24 mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg"
            >
              <Skeleton className="h-3 w-16" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-14 hidden sm:block" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
