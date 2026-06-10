/**
 * Bespoke skeleton for src/pages/app/macro/CreditSpreads.tsx
 * Layout: PageTemplate header → AI summary → MetricChart (HY/IG/EM) →
 *         regime hero pill → 3-col spread cards → combined sparkline chart → regime history bar
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonText,
  SkeletonChart,
} from '@/components/skeletons/shell';

export function MacroCreditSpreadsSkeletonPage() {
  return (
    <SkeletonPage>
      {/* PageTemplate header */}
      <SkeletonHeader titleWidth="w-36" withEyebrow />

      {/* AI Summary Card */}
      <div className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-2">
        <Skeleton className="h-4 w-32" />
        <SkeletonText lines={2} />
      </div>

      {/* MetricChart: HY / IG / EM OAS (tall) */}
      <SkeletonChart height="h-72" />

      {/* Regime Hero — large pill block */}
      <div className="space-y-ds-2">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-16 w-64 rounded-2xl" />
        <Skeleton className="h-3 w-28" />
      </div>

      {/* Section 1: 3 spread stat cards (HY, IG, EM) */}
      <section className="space-y-ds-2">
        <Skeleton className="h-4 w-44" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle p-3 space-y-ds-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Combined sparkline — HY/IG/EM stacked rows */}
      <section className="space-y-ds-2">
        <Skeleton className="h-4 w-48" />
        <div className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Regime history color band */}
      <section className="space-y-ds-2">
        <Skeleton className="h-4 w-36" />
        <div className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          <div className="flex gap-3 flex-wrap mt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-24" />
            ))}
          </div>
        </div>
      </section>
    </SkeletonPage>
  );
}
