/**
 * Bespoke skeleton for src/pages/app/stocks/Sentiment.tsx
 * Layout:
 *   1. Page header (eyebrow + title + subtitle) + refresh button
 *   2. Row 1 (2-col):
 *      - Insider Sentiment Score card: big score number + gauge bar
 *      - Insider Activity Summary: 2×2 stat grid + market backdrop pill
 *   3. Row 2: Insider & Institutional Signals section header + 3 signal cards
 *   4. Row 3: Recent Form 4 Filings section header + 5 filing rows
 *   5. Footer disclaimer
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonCard,
} from '@/components/skeletons/shell';

export function StocksSentimentSkeletonPage() {
  return (
    <SkeletonPage>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-60" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>

      {/* Row 1: Score card + Summary card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Insider Sentiment Score */}
        <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-5 space-y-4">
          <Skeleton className="h-3 w-40" />
          <div className="text-center space-y-2">
            <Skeleton className="h-14 w-24 mx-auto" />
            <Skeleton className="h-4 w-28 mx-auto" />
            <Skeleton className="h-3 w-48 mx-auto" />
          </div>
          {/* Gauge */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        </div>

        {/* Activity summary */}
        <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
          <Skeleton className="h-3 w-44" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[6px] border border-border-ds-subtle bg-surface-2 p-3 text-center space-y-2">
                <Skeleton className="h-4 w-4 mx-auto rounded-full" />
                <Skeleton className="h-6 w-10 mx-auto" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-border-ds-subtle flex items-center justify-between">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Row 2: Signals section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-8 rounded-[6px]" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>

      {/* Row 3: Form 4 Filings section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-14 rounded-[6px]" />
        </div>
        <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start justify-between gap-4 py-3 border-b border-border-ds-subtle last:border-0">
              <div className="flex items-start gap-2 flex-1">
                <Skeleton className="h-3.5 w-3.5 shrink-0 mt-0.5 rounded" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <div className="text-right space-y-1 shrink-0">
                <Skeleton className="h-5 w-14 rounded-[6px]" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer disclaimer */}
      <Skeleton className="h-12 w-full rounded-[6px]" />
    </SkeletonPage>
  );
}
