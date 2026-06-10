/**
 * Bespoke skeleton for src/pages/app/macro/Sentiment.tsx
 * Layout: header (title + mode selector) →
 *   Hero section (regime badge + score ring + reason text) →
 *   5-cluster grid →
 *   Fear/Greed factors panel →
 *   Risk scenarios →
 *   Historical sparkline charts
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonChart,
  SkeletonText,
} from '@/components/skeletons/shell';

export function MacroSentimentSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-full">
      {/* Header: title + mode selector (retail/institutional/quant) */}
      <div className="flex items-center justify-between">
        <SkeletonHeader titleWidth="w-40" withEyebrow />
        <div className="flex gap-ds-1 rounded-md border border-border-ds-subtle overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>
      </div>

      {/* Hero section: regime badge + score ring */}
      <div className="rounded-xl border border-border-ds-subtle p-7 space-y-ds-4">
        <div className="flex items-start justify-between">
          <div className="space-y-ds-2">
            <Skeleton className="h-3 w-28" />
            {/* Large regime badge */}
            <Skeleton className="h-16 w-48 rounded-xl" />
          </div>
          {/* Score ring */}
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        {/* Reason text */}
        <SkeletonText lines={2} />
        {/* Progress bar */}
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* 5-cluster grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Fear/Greed factors */}
      <div className="rounded-xl border border-border-ds-subtle p-5 space-y-ds-3">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-ds-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-28 flex-shrink-0" />
              <Skeleton className="h-2 flex-1 rounded-full" />
              <Skeleton className="h-3 w-10 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Risk scenarios */}
      <div className="space-y-ds-2">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Historical charts */}
      <div className="grid grid-cols-2 gap-4">
        <SkeletonChart height="h-40" />
        <SkeletonChart height="h-40" />
      </div>
    </SkeletonPage>
  );
}
