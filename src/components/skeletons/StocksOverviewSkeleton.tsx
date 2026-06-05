/**
 * Bespoke skeleton for /app/stocks/overview (per-symbol stock page).
 *
 * Mirrors the real StocksOverview layout (max-w-[1200px] mx-auto px-2 md:px-4):
 *   1. PriceChartLite — full-width chart card with price header + sparkline area
 *   2. SnapshotCards — 5-stat horizontal strip
 *   3. FinotaurScore card — score header + big number + 10-dot progress bar + 4 factor chips + footnote
 *   4. FinotaurSnowflake row — pentagon graphic (180×180) + right: "Fundamental Health"
 *      label + 4 grade rows (label | score/100) + footnote
 *   5. AnalystConsensus card — full-width
 *   6. 2-col grid (md:grid-cols-2): NewsPreview | CompanyOverview
 *   7. SecFilings table — full-width
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonStatRow,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
} from "@/components/skeletons/shell";

export function StocksOverviewSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1200px]">
      {/* 1. PriceChartLite — chart with price line */}
      <SkeletonChart height="h-48" />

      {/* 2. SnapshotCards — 5 KPI stats */}
      <SkeletonStatRow count={5} />

      {/* 3. FinotaurScore card */}
      <div className="rounded-xl border border-border-ds-subtle p-4 space-y-3 bg-surface-1">
        {/* Header row: label + verdict pill */}
        <div className="flex items-start justify-between">
          <div className="space-y-ds-1">
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="h-2.5 w-48" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        {/* Big score number + /10 */}
        <div className="flex items-end gap-2">
          <Skeleton className="h-12 w-10" />
          <Skeleton className="h-5 w-8 mb-0.5" />
        </div>
        {/* 10-dot progress bar */}
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />
          ))}
        </div>
        {/* 3–4 factor chips */}
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-32 rounded-lg" />
          ))}
        </div>
        {/* Provenance footnote */}
        <Skeleton className="h-2.5 w-72 mt-1" />
      </div>

      {/* 4. FinotaurSnowflake + grade list side-by-side */}
      <div className="flex flex-col sm:flex-row items-start gap-4 rounded-xl border border-border-ds-subtle bg-surface-1 p-4">
        {/* Pentagon / snowflake graphic */}
        <Skeleton className="h-[180px] w-[180px] rounded-full shrink-0" />
        {/* Right: section label + 4 grade rows + footnote */}
        <div className="flex-1 space-y-3 w-full">
          <Skeleton className="h-3 w-36" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {["Value", "Growth", "Profitability", "Financial Health"].map((label) => (
              <div key={label} className="flex items-center justify-between py-0.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
          <Skeleton className="h-2.5 w-52 mt-1" />
        </div>
      </div>

      {/* 5. AnalystConsensus — card with sub-grid */}
      <SkeletonCard lines={2} withGrid />

      {/* 6. 2-col: NewsPreview | CompanyOverview */}
      <div className="grid md:grid-cols-2 gap-4">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>

      {/* 7. SecFilings table (4 cols: Date, Form, Description, Link) */}
      <SkeletonTable rows={5} cols={4} />
    </SkeletonPage>
  );
}
