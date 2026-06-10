/**
 * Bespoke loading skeleton for /app/all-markets/summary (stock summary page).
 *
 * Mirrors the real layout:
 *   - Action buttons row (right-aligned: refresh, watchlist, alert, share)
 *   - Header section: logo + symbol + company name + sector | price + change + market cap/volume/PE/beta
 *   - 4 tab buttons: Overview / Fundamentals / Financials / News
 *   - Overview tab content (default):
 *       - 6-col KPI grid (Open / Prev Close / Day High / Day Low / EPS / Dividend)
 *       - 52-week range bar card
 *       - SummaryOverviewEmbed placeholders (analyst rating + metrics + profile)
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonStatRow,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function AllMarketsSummarySkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]" className="!pb-12">
      {/* Header section */}
      <div className="border-b border-border-ds-subtle pb-6 mb-6">
        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>

        {/* Main header row */}
        <div className="flex items-start justify-between gap-6">
          {/* Left: company logo + info */}
          <div className="flex items-start gap-4">
            <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
              {/* Sector ETF chips */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          </div>

          {/* Right: price + stats */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-baseline gap-3">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-3 w-40" />
            <div className="flex gap-5">
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-14" />
              </div>
              <div className="space-y-1 hidden sm:block">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-10" />
              </div>
              <div className="space-y-1 hidden md:block">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar (4 tabs) */}
      <div className="flex items-center gap-1 mb-6 border-b border-border-ds-subtle pb-px">
        {["Overview", "Fundamentals", "Financials", "News"].map((label) => (
          <div key={label} className="px-4 py-2.5">
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Overview tab content */}
      <div className="space-y-6">
        {/* 6-col KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-4 space-y-2"
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>

        {/* 52-week range bar */}
        <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-4">
          <Skeleton className="h-3 w-32 mb-3" />
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="flex justify-between mt-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* SummaryOverviewEmbed: analyst rating + metrics + profile */}
        <SkeletonCard lines={3} withGrid />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={2} withGrid />
      </div>
    </SkeletonPage>
  );
}
