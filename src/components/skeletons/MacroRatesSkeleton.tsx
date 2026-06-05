/**
 * Bespoke skeleton for src/pages/app/macro/Rates.tsx
 * Layout: header (title + refresh) → KPI row (4 cards) →
 *   3 tab buttons (Overview / Differentials / Yields) →
 *   central banks table (8 cols, 6 rows)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonTabs,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function MacroRatesSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* Header: title block + refresh button */}
      <div className="flex items-start justify-between">
        <div className="space-y-ds-2">
          <Skeleton className="h-3 w-36" />
          <SkeletonHeader titleWidth="w-96" withEyebrow={false} />
          <Skeleton className="h-3 w-80" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* KPI Row: 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Tab navigation: 3 tabs */}
      <SkeletonTabs count={3} />

      {/* Central Banks table (Overview tab) */}
      <div className="rounded-2xl border border-border-ds-subtle overflow-hidden">
        {/* Table section header */}
        <div className="p-6 border-b border-border-ds-subtle">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3 w-80 mt-2" />
        </div>
        <div className="p-4">
          <SkeletonTable rows={8} cols={8} />
        </div>
      </div>
    </SkeletonPage>
  );
}
