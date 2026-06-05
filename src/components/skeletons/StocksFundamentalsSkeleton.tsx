/**
 * Bespoke skeleton for src/pages/app/stocks/Fundamentals.tsx
 * Layout (active loading branch in that page):
 *   1. Stat row: 4 KPI cells
 *   2. Chart: h-48 (TrendsPanel)
 *   3. Table: 6 rows × 4 cols (HealthTable / ValuationPanel)
 *   (Extended with full loaded layout sections)
 *   4. Top row: AI Insight card + DCF box (2-col)
 *   5. KPIGrid — 4-stat row
 *   6. TrendsPanel — chart
 *   7. 3-col: ValuationPanel | HealthTable | IndustryComparison
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonStatRow,
  SkeletonChart,
  SkeletonTable,
  Skeleton,
} from '@/components/skeletons/shell';

export function StocksFundamentalsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-40" withEyebrow={false} />

      {/* Row 1: AI Insight + DCF box */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[300px] rounded-xl border border-border-ds-subtle bg-surface-1 p-3 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 w-52 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      {/* KPIGrid: 4 stats */}
      <SkeletonStatRow count={4} />

      {/* TrendsPanel chart */}
      <SkeletonChart height="h-48" />

      {/* 3-col: Valuation | Health | Industry */}
      <div className="grid md:grid-cols-3 gap-3">
        <SkeletonTable rows={6} cols={2} />
        <SkeletonTable rows={6} cols={2} />
        <SkeletonTable rows={6} cols={2} />
      </div>
    </SkeletonPage>
  );
}
