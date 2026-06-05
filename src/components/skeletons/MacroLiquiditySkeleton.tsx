/**
 * Bespoke skeleton for src/pages/app/macro/Liquidity.tsx
 * Layout: PageTemplate (title + desc) → AI summary card → MetricChart (tall) →
 *         hero stat block → 3-col component cards → sparkline chart → monthly table
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonText,
  SkeletonTable,
  SkeletonChart,
} from '@/components/skeletons/shell';

export function MacroLiquiditySkeletonPage() {
  return (
    <SkeletonPage>
      {/* PageTemplate header: title + description */}
      <SkeletonHeader titleWidth="w-40" withEyebrow />

      {/* AI Summary Card */}
      <div className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-2">
        <Skeleton className="h-4 w-32" />
        <SkeletonText lines={2} />
      </div>

      {/* MetricChart: Net Liquidity vs Components (full-width, tall) */}
      <SkeletonChart height="h-72" />

      {/* Hero: Net Liquidity value + MoM/YoY pills */}
      <div className="space-y-ds-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-3 w-36" />
        <div className="flex gap-ds-2 mt-1">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>

      {/* Section 1: Component Breakdown — 3 stat cards */}
      <section className="space-y-ds-2">
        <Skeleton className="h-4 w-44" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </section>

      {/* Section 2: 12-Month Trend sparkline */}
      <section className="space-y-ds-2">
        <Skeleton className="h-4 w-36" />
        <SkeletonChart height="h-24" />
      </section>

      {/* Section 3: Monthly Snapshots table (5 cols) */}
      <section className="space-y-ds-2">
        <Skeleton className="h-4 w-44" />
        <SkeletonTable rows={12} cols={5} />
      </section>
    </SkeletonPage>
  );
}
