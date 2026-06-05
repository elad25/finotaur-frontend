/**
 * Bespoke skeleton for src/pages/app/macro/tabs/RiskRegime.tsx
 * Real layout:
 *   1. Page header: h1 "Risk & Regime"
 *   2. Sub-nav (2 tabs): Liquidity / Regime Models
 *   3. Inner Liquidity page (default sub-tab):
 *      a. MarketStatusBadge (shown when market closed)
 *      b. AI Summary Card (full-width text card with gold sparkle icon)
 *      c. LiquidityMetricChart (recharts multi-line with range pills) ≈ h-[300px]+controls
 *      d. Hero stat block: eyebrow label + big "$X.XXT" number + DataFreshness line
 *         + MoM/YoY pills row
 *      e. Section 1 — Component Breakdown: header → 3-col GlassStat cards
 *         (Fed Assets / Treasury General Acct / Overnight Repo)
 *      f. Section 2 — 12-Month Trend: header → sparkline chart (h-16)
 *      g. Section 3 — Monthly Snapshots: header → compact table (5 cols × 12 rows)
 */
import {
  SkeletonPage,
  SkeletonTabs,
  Skeleton,
  SkeletonChart,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function MacroRiskSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* 1. Page header */}
      <Skeleton className="h-8 w-40" aria-hidden="true" />

      {/* 2. Sub-nav: 2 tabs */}
      <SkeletonTabs count={2} />

      {/* 3b. AI Summary Card */}
      <div
        className="rounded-2xl border border-border-ds-subtle p-5 space-y-ds-3"
        aria-hidden="true"
      >
        <div className="flex items-start gap-ds-3">
          <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-ds-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </div>
        </div>
      </div>

      {/* 3c. LiquidityMetricChart */}
      <div
        className="rounded-2xl border border-border-ds-subtle p-4 space-y-ds-3"
        aria-hidden="true"
      >
        {/* Chart title + legend pills */}
        <div className="flex items-center justify-between flex-wrap gap-ds-2">
          <Skeleton className="h-5 w-52" />
          <div className="flex items-center gap-ds-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-20 rounded-full" />
            ))}
          </div>
        </div>
        {/* Range pills */}
        <div className="flex gap-ds-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-10 rounded-lg" />
          ))}
        </div>
        <SkeletonChart height="h-[300px]" />
      </div>

      {/* 3d. Hero stat block */}
      <div className="space-y-ds-2" aria-hidden="true">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-3 w-36" />
        <div className="flex gap-ds-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>

      {/* 3e. Section 1 — Component Breakdown */}
      <div className="space-y-ds-3" aria-hidden="true">
        <div className="space-y-ds-1">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16 rounded-full" />
              </div>
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-36" />
              <div className="flex items-center gap-ds-2">
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3f. Section 2 — 12-Month Trend */}
      <div className="space-y-ds-3" aria-hidden="true">
        <div className="space-y-ds-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="rounded-xl border border-border-ds-subtle p-4 space-y-ds-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-32" />
          </div>
          {/* Sparkline placeholder */}
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>

      {/* 3g. Section 3 — Monthly Snapshots */}
      <div className="space-y-ds-3" aria-hidden="true">
        <div className="space-y-ds-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-52" />
        </div>
        <div className="rounded-xl border border-border-ds-subtle overflow-hidden">
          <SkeletonTable rows={12} cols={5} />
        </div>
      </div>
    </SkeletonPage>
  );
}
