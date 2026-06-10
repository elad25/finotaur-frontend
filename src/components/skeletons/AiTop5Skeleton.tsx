/**
 * Skeleton for /app/ai/top-5
 *
 * Loaded state: centered title area + 3-tab nav (Research Queue / Performance Lab /
 * Research Brief) + 5-stat bar + list of 5 expandable stock cards (collapsed rows).
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonStatRow,
} from "@/components/skeletons/shell";

/** Collapsed stock card row — logo + ticker + badge + score ring + price */
function StockCardRow() {
  return (
    <div className="flex items-center gap-ds-4 px-ds-5 py-ds-4 rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1">
      {/* Rank badge + logo */}
      <div className="relative flex-shrink-0">
        <Skeleton className="h-12 w-12 rounded-[12px]" />
        <Skeleton className="absolute -top-1.5 -left-1.5 h-[22px] w-[22px] rounded-full" />
      </div>
      {/* Ticker + name + direction badge */}
      <div className="flex-1 min-w-0 space-y-ds-1">
        <div className="flex items-center gap-ds-2 flex-wrap">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-5 w-20 rounded-[6px]" />
        </div>
        <div className="flex items-center gap-ds-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      {/* Price + change */}
      <div className="text-right flex-shrink-0 space-y-ds-1">
        <Skeleton className="h-6 w-16 ml-auto" />
        <Skeleton className="h-3 w-12 ml-auto" />
      </div>
      {/* Score ring */}
      <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
      {/* Chevron */}
      <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
    </div>
  );
}

export function AiTop5SkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1240px]">
      {/* Page header area */}
      <div className="flex flex-col items-center gap-ds-3 text-center mb-ds-3">
        <Skeleton className="h-14 w-64 md:w-80" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* 3-tab navigation */}
      <div className="flex flex-wrap items-center justify-center gap-ds-2 mb-ds-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-36 rounded-[12px]" />
        ))}
      </div>

      {/* Section header */}
      <div className="flex items-center gap-ds-3 mb-ds-5">
        <Skeleton className="h-9 w-9 rounded-[8px] flex-shrink-0" />
        <div className="flex-1 space-y-ds-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>

      {/* Stats bar — 5 stats */}
      <SkeletonStatRow count={5} className="mb-ds-7" />

      {/* 5 collapsed stock cards */}
      <div className="space-y-ds-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <StockCardRow key={i} />
        ))}
      </div>
    </SkeletonPage>
  );
}
