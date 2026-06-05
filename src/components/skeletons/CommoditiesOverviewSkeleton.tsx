/**
 * Bespoke skeleton for /app/commodities/overview (Commodities Dashboard).
 *
 * Mirrors the real CommoditiesOverview layout (PageTemplate wrapper + space-y-6 body):
 *   0. PageTemplate header — breadcrumb + h1 + description
 *   1. MacroStrip — SectionHeader (title + "as of" subtitle) + 4-stat grid (2 → 4 cols)
 *      Stats: US Dollar (DXY) | 10Y Real Yield | 10Y Breakeven | 10Y Treasury
 *   2. Sector board — md:grid-cols-3 gap-4, one GlassCard per sector:
 *      Energy   — SectionHeader + table (Name | Price | Change), ~6 rows (crude, gas, heating oil…)
 *      Metals   — SectionHeader + table, ~6 rows (gold, silver, copper, platinum…)
 *      Agriculture — SectionHeader + table, ~5 rows (corn, wheat, soy, coffee, sugar)
 *   3. Attribution footnote line
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonStatRow,
} from "@/components/skeletons/shell";

/** Inner skeleton for one sector GlassCard: header + 3-col table rows. */
function SectorCardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
      {/* SectionHeader: title */}
      <Skeleton className="h-4 w-20" />
      {/* Table header: Name | Price | Change */}
      <div className="grid grid-cols-3 gap-3 pb-2 border-b border-border-ds-subtle">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
      {/* Table body rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-3 gap-3 py-1.5 border-b border-border-ds-subtle">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

export function CommoditiesOverviewSkeletonPage() {
  return (
    <SkeletonPage>
      {/* PageTemplate header: breadcrumb + h1 + description */}
      <SkeletonHeader titleWidth="w-56" withEyebrow />

      {/* 1. MacroStrip — SectionHeader + 4-stat grid */}
      <div className="space-y-2">
        {/* SectionHeader: title + subtitle */}
        <div className="space-y-0.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        {/* 4 GlassStat cards: DXY, 10Y Real, 10Y Breakeven, 10Y Treasury */}
        <SkeletonStatRow count={4} />
      </div>

      {/* 2. Sector board — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Energy — ~6 rows: crude, brent, natural gas, heating oil, gasoline, rbob */}
        <SectorCardSkeleton rows={6} />
        {/* Metals — ~6 rows: gold, silver, copper, platinum, palladium, aluminum */}
        <SectorCardSkeleton rows={6} />
        {/* Agriculture — ~5 rows: corn, wheat, soybeans, coffee, sugar */}
        <SectorCardSkeleton rows={5} />
      </div>

      {/* 3. Attribution footnote */}
      <Skeleton className="h-3 w-96" />
    </SkeletonPage>
  );
}
