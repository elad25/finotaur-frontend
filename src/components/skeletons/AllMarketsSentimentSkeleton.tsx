/**
 * Bespoke loading skeleton for /app/all-markets/sentiment.
 *
 * Mirrors the real layout (max-w-[1000px]):
 *   1. Page header — eyebrow + title + subtitle
 *   2. Hero sentiment gauge — large circular gauge + score + label + two stat pills
 *   3. 2-col chart grid — VIX chart (left) + Put/Call Ratio chart (right)
 *   4. 2-col intelligence grid — Signals card (left) + Context card (right)
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonChart,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function AllMarketsSentimentSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1000px]">
      {/* 1. Page header */}
      <div className="space-y-ds-2">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* 2. Hero gauge */}
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-6 flex flex-col items-center gap-4">
        {/* Gauge circle */}
        <Skeleton className="h-48 w-48 rounded-full" />
        {/* Score + label */}
        <div className="text-center space-y-2">
          <Skeleton className="h-10 w-20 mx-auto" />
          <Skeleton className="h-5 w-24 mx-auto" />
        </div>
        {/* VIX + PCR pills */}
        <div className="flex gap-6">
          <div className="text-center space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12 mx-auto" />
          </div>
          <div className="text-center space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-12 mx-auto" />
          </div>
        </div>
      </div>

      {/* 3. Charts row */}
      <div className="grid md:grid-cols-2 gap-ds-5">
        <SkeletonChart height="h-48" />
        <SkeletonChart height="h-48" />
      </div>

      {/* 4. Intelligence row */}
      <div className="grid md:grid-cols-2 gap-ds-5">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    </SkeletonPage>
  );
}
