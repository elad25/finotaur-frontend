/**
 * Bespoke skeleton for src/pages/app/macro/RealYields.tsx
 * Layout: PageTemplate header → AI summary → MetricChart → hero stat (10Y TIPS) →
 *         3-col real yields sparklines → 3-col breakeven cards → TIPS/Gold overlay
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonText,
  SkeletonChart,
} from '@/components/skeletons/shell';

export function MacroRealYieldsSkeletonPage() {
  return (
    <SkeletonPage>
      {/* PageTemplate header */}
      <SkeletonHeader titleWidth="w-48" withEyebrow />

      {/* AI Summary Card */}
      <div className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-2">
        <Skeleton className="h-4 w-32" />
        <SkeletonText lines={2} />
      </div>

      {/* MetricChart: TIPS yields + breakeven inflation (tall) */}
      <SkeletonChart height="h-72" />

      {/* Hero: 10Y TIPS + secondary pills */}
      <div className="space-y-ds-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-3 w-28" />
        <div className="flex gap-ds-2 mt-1">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>

      {/* Section 1: Real Yield Curve — 3 sparkline cards (5Y, 10Y, 30Y) */}
      <section className="space-y-ds-2">
        <Skeleton className="h-4 w-36" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle p-3 space-y-ds-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-2 w-20" />
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Breakeven Inflation — 3 stat cards */}
      <section className="space-y-ds-2">
        <Skeleton className="h-4 w-44" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </section>

      {/* Section 3: TIPS vs Gold overlay — 2 sparklines stacked */}
      <section className="space-y-ds-2">
        <Skeleton className="h-4 w-40" />
        <div className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-3">
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </section>
    </SkeletonPage>
  );
}
