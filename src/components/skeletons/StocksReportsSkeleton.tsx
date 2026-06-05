/**
 * Bespoke skeleton for src/pages/app/stocks/Reports.tsx
 * Layout:
 *   1. PageTemplate header
 *   2. ReportsSECDocuments — search input + document list
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from '@/components/skeletons/shell';

export function StocksReportsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-40" withEyebrow={false} />

      {/* Search bar */}
      <Skeleton className="h-9 w-full rounded-lg" />

      {/* Document list items */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border-ds-subtle bg-surface-1 p-4">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-7 w-20 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
