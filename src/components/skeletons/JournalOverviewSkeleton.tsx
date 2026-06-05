/**
 * Bespoke loading skeleton for /app/journal/overview (Dashboard).
 *
 * Mirrors the real layout:
 *   1. Header row — greeting + date-picker + account filter + broker button
 *   2. AI Insight banner (full-width)
 *   3. 8-KPI card grid (4 per row on lg)
 *   4. Two-column section: Equity chart (left) + Daily PnL chart (right)
 *   5. Best/Worst trade pair
 *   6. By Time scatter + By Duration scatter (half-width each)
 *   7. Shortcut cards (6-up grid)
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonChart,
} from "@/components/skeletons/shell";

export function JournalOverviewSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1360px]">
      {/* 1. Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-[12px]" />
          <Skeleton className="h-10 w-36 rounded-[12px]" />
          <Skeleton className="h-10 w-36 rounded-[12px]" />
        </div>
      </div>

      {/* 2. AI Insight banner */}
      <div className="rounded-[12px] border border-border-ds-subtle px-6 py-4">
        <div className="flex items-center gap-5">
          <Skeleton className="h-11 w-11 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-9 w-40 rounded-[12px] shrink-0" />
        </div>
      </div>

      {/* 3. KPI cards — 4 per row on large screens */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[12px] border border-border-ds-subtle bg-surface-1 px-4 py-3 min-h-[94px]"
          >
            <div className="grid grid-cols-[1fr_66px] items-center gap-3 h-full">
              <div className="space-y-2">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full ml-auto" />
            </div>
          </div>
        ))}
      </div>

      {/* 4. Charts: Equity (left) + Daily PnL (right) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonChart height="h-[380px]" />
        <SkeletonChart height="h-[380px]" />
      </div>

      {/* 5. Best / Worst trade pair */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3"
          >
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>

      {/* 6. By Time + By Duration scatter charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-4 space-y-2"
          >
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <SkeletonChart height="h-[168px]" />
          </div>
        ))}
      </div>

      {/* 7. Shortcut cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[18px] border border-border-ds-subtle bg-surface-1 p-5 flex items-center gap-4"
          >
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-2.5 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
