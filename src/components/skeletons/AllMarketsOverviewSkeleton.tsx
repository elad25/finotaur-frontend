/**
 * Bespoke loading skeleton for /app/all-markets/overview.
 *
 * Mirrors the real AllMarketsOverview layout (space-y-4):
 *   1. MarketRegimeTimeline — full-width banner card with icon + regime label + 3 indicators
 *   2. MarketTickerStrip — category tabs header + 5 ticker rows + right mini chart panel
 *   3. Two-column grid lg:[1fr,320px]:
 *      Left column (space-y-4):
 *        a. EarningsToday — horizontal pill strip (icon + label + 6 pills)
 *        b. WhatMattersThisWeek — table with header + 5-col header row + 6 event rows
 *        c. MacroNews — Card with CardHeader + 6 news rows (thumbnail + 2 text lines each)
 *      Right column (sticky):
 *        MarketMoversWidget — header+tabs + 4-col column-header + 15 mover rows
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function AllMarketsOverviewSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]" className="pb-8">
      {/* 1. MarketRegimeTimeline banner */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: icon + regime label + confidence */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-ds-2">
              <Skeleton className="h-3 w-20" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-5 w-10 rounded" />
              </div>
            </div>
          </div>
          {/* Right: 3 indicator chips (Vol / Liq / Breadth) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3.5 w-3.5 rounded-sm" />
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-4" />
            </div>
            <Skeleton className="h-3 w-px" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3.5 w-3.5 rounded-sm" />
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-4" />
            </div>
            <Skeleton className="h-3 w-px" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3.5 w-3.5 rounded-sm" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-4" />
            </div>
          </div>
        </div>
        {/* Bottom row: footnote + link */}
        <div className="mt-4 pt-4 border-t border-border-ds-subtle flex items-center justify-between">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* 2. MarketTickerStrip */}
      <div className="bg-surface-1 border border-border-ds-subtle rounded-lg overflow-hidden">
        {/* Header: 5 category tabs + timeframe pills */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-ds-subtle">
          <div className="flex items-center gap-4">
            {["US", "World", "Commodities", "Futures", "Treasuries"].map((cat) => (
              <Skeleton key={cat} className="h-3 w-14" />
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-8 rounded" />
            ))}
          </div>
        </div>
        {/* Body: ticker rows left + chart panel right */}
        <div className="flex">
          {/* 5 ticker rows */}
          <div className="flex-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center border-b border-border-ds-subtle py-1.5 px-3 gap-2"
              >
                <Skeleton className="h-full w-0.5 self-stretch" />
                <Skeleton className="flex-1 h-3" />
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-16 h-3" />
                <Skeleton className="w-14 h-3" />
              </div>
            ))}
          </div>
          {/* Right chart panel (280px wide, ~160px tall) */}
          <div className="w-[280px] border-l border-border-ds-subtle flex flex-col">
            <div className="flex items-center justify-between px-3 pt-2">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="flex-1 m-2 h-[120px]" shimmer />
          </div>
        </div>
      </div>

      {/* 3. Main content grid: left stacked + right movers sidebar */}
      <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
        {/* Left column */}
        <div className="space-y-4">
          {/* a. EarningsToday — horizontal scroll strip */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-6" />
              </div>
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-lg border border-border-ds-subtle"
                  >
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-8 rounded" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-3 w-20 shrink-0" />
            </div>
          </div>

          {/* b. WhatMattersThisWeek table */}
          <div className="rounded-xl border border-border-ds-subtle overflow-hidden bg-surface-1">
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-ds-subtle">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-4 w-44" />
              </div>
              <Skeleton className="h-3 w-28" />
            </div>
            {/* Table column headers: Day | Event | Forecast | Previous | (badge) */}
            <div className="flex items-center px-4 py-2 gap-2 border-b border-border-ds-subtle bg-surface-2">
              <Skeleton className="w-16 h-3" />
              <Skeleton className="flex-1 h-3" />
              <Skeleton className="w-20 h-3" />
              <Skeleton className="w-20 h-3" />
              <Skeleton className="w-12 h-3" />
            </div>
            {/* 6 event rows */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center px-4 py-2.5 gap-2 border-b border-border-ds-subtle"
              >
                <Skeleton className="w-16 h-3" />
                <div className="flex-1 flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded-sm shrink-0" />
                  <Skeleton className="flex-1 h-3" />
                </div>
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-12 h-3" />
              </div>
            ))}
          </div>

          {/* c. MacroNews Card (CardHeader + 6 news rows + footer link) */}
          <div className="rounded-2xl border border-border-ds-subtle bg-surface-1">
            {/* CardHeader */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-ds-subtle">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-sm" />
                <Skeleton className="h-5 w-48" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
            {/* 6 news rows: thumbnail (112×80) + headline + meta */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-4 px-4 py-3 border-b border-border-ds-subtle"
              >
                <Skeleton className="w-28 h-20 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
            {/* Footer link row */}
            <div className="border-t border-border-ds-subtle p-3 flex items-center justify-center gap-1">
              <Skeleton className="h-4 w-44" />
            </div>
          </div>
        </div>

        {/* Right column: Market Movers sidebar */}
        <div className="lg:sticky lg:top-4 lg:self-start rounded-xl border border-border-ds-subtle bg-surface-1 overflow-hidden flex flex-col">
          {/* Header + ACTIVES/GAINERS/LOSERS tabs */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-1">
              {["ACTIVES", "GAINERS", "LOSERS"].map((t) => (
                <Skeleton key={t} className="h-5 w-16 rounded" />
              ))}
            </div>
          </div>
          {/* Column headers: Symbol | Price | Vol | Chg% */}
          <div className="flex items-center px-3 py-1.5 gap-2 border-b border-border-ds-subtle bg-surface-2">
            <Skeleton className="flex-1 h-3" />
            <Skeleton className="w-14 h-3" />
            <Skeleton className="w-12 h-3" />
            <Skeleton className="w-14 h-3" />
          </div>
          {/* 15 mover rows */}
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center px-3 py-2 gap-2 border-b border-border-ds-subtle"
            >
              <Skeleton className="h-3 w-10 flex-1" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
          {/* Footer timestamp */}
          <div className="px-3 py-1.5 border-t border-border-ds-subtle">
            <Skeleton className="h-2.5 w-28" />
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
