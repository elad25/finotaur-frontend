/**
 * Bespoke skeleton for src/pages/app/macro/tabs/RatesCentralBanks.tsx
 * Real layout:
 *   1. Page header: h1 "Rates & Central Banks"
 *   2. Sub-nav (3 tabs): Yield Curve & Rates / Real Yields / Credit Spreads
 *   3. Inner Rates page (default sub-tab):
 *      a. Section header: eyebrow + h1 + description + Refresh button (right)
 *      b. KPI row: 4 cards (Global Policy Momentum / Avg Rate / CB Stance / FX Carry)
 *      c. Inner tab strip: 3 tabs (Central Banks Overview / Rate Differentials / Yields & Analysis)
 *      d. Central Banks table: 8 cols × 6+ rows (card wrapper with section header)
 *      e. Rate History Chart (card): h-[300px] multi-line recharts
 *      f. Two-column section: Momentum Engine (5 bank rows with progress bars)
 *         + Currency Rate Overview (2-col mini grid of bank cards)
 */
import {
  SkeletonPage,
  SkeletonTabs,
  Skeleton,
  SkeletonTable,
  SkeletonChart,
} from '@/components/skeletons/shell';

export function MacroRatesSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* 1. Page header */}
      <Skeleton className="h-8 w-64" aria-hidden="true" />

      {/* 2. Sub-nav: 3 tabs */}
      <SkeletonTabs count={3} />

      {/* 3a. Inner Rates header + refresh */}
      <div className="flex items-start justify-between" aria-hidden="true">
        <div className="space-y-ds-2">
          <div className="flex items-center gap-ds-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-7 w-[480px]" />
          <Skeleton className="h-3 w-[520px]" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* 3b. KPI row: 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-ds-subtle p-5 space-y-ds-2">
            <div className="flex items-start justify-between">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-3 w-3" />
            </div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>

      {/* 3c. Inner tab strip: 3 tabs */}
      <div className="flex items-center gap-ds-2 border-b border-border-ds-subtle pb-4" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-44 rounded-lg" />
        ))}
      </div>

      {/* 3d. Central Banks table card */}
      <div className="rounded-2xl border border-border-ds-subtle overflow-hidden" aria-hidden="true">
        <div className="p-6 border-b border-border-ds-subtle space-y-ds-2">
          <div className="flex items-start gap-ds-3">
            <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="space-y-ds-1">
              <Skeleton className="h-5 w-60" />
              <Skeleton className="h-3 w-80" />
            </div>
          </div>
        </div>
        <div className="p-4">
          <SkeletonTable rows={6} cols={8} />
        </div>
      </div>

      {/* 3e. Rate History Chart */}
      <div className="rounded-2xl border border-border-ds-subtle p-6 space-y-ds-4" aria-hidden="true">
        <div className="flex items-start gap-ds-3">
          <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="space-y-ds-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <SkeletonChart height="h-[300px]" />
      </div>

      {/* 3f. Two-column bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-hidden="true">
        {/* Momentum Engine */}
        <div className="rounded-2xl border border-border-ds-subtle p-6 space-y-ds-4">
          <div className="flex items-start gap-ds-3">
            <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="space-y-ds-1">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <div className="space-y-ds-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-ds-2">
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-8" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Currency Rate Overview */}
        <div className="rounded-2xl border border-border-ds-subtle p-6 space-y-ds-4">
          <div className="flex items-start gap-ds-3">
            <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="space-y-ds-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-7 w-16" />
                <div className="flex items-center gap-ds-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-2 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
