/**
 * Bespoke skeleton for src/pages/app/crypto/Sentiment.tsx
 * Layout:
 *   1. Tab strip: 3 tabs (Overview | News | On-Chain)
 *   2. Overview tab (default):
 *      - 4-col row: Fear & Greed gauge (1-col) + 3 signal badges (3-col)
 *      - Market Breadth bar card
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonTabs,
  Skeleton,
  SkeletonCard,
} from '@/components/skeletons/shell';

export function CryptoSentimentSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-44" withEyebrow={false} />

      <SkeletonTabs count={3} />

      {/* Overview tab */}
      <div className="space-y-4">
        {/* Fear & Greed + signals row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Fear & Greed gauge */}
          <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-3 space-y-2">
            <Skeleton className="h-3 w-24" />
            <div className="flex items-baseline gap-1">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>

          {/* 3 signal badges */}
          <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} lines={2} />
            ))}
          </div>
        </div>

        {/* Market Breadth bar card */}
        <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
