/**
 * Bespoke loading skeleton for /app/journal/calendar.
 *
 * Mirrors the real layout:
 *   1. Header — "Performance Calendar" title + account switcher dropdown
 *      + date-range controls + Today/Export buttons
 *   2. Month navigation strip — prev/next arrows + month label
 *   3. Day-of-week header row (Sun–Sat)
 *   4. Calendar grid — up to 6 rows × 7 columns, each cell with day number,
 *      P&L value, and win/loss indicator
 *   5. Mini stats footer — selected-week summary bar
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalCalendarSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1800px]">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* 2. Month navigation */}
      <div className="flex items-center justify-between rounded-xl border border-border-ds-subtle bg-surface-1 px-4 py-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-16 rounded" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>

      {/* 3. Day-of-week header + 4. Calendar grid */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 overflow-hidden">
        {/* DOW header */}
        <div className="grid grid-cols-7 border-b border-border-ds-subtle">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2 px-3 flex justify-center">
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>

        {/* 5 rows × 7 columns */}
        {Array.from({ length: 5 }).map((_, row) => (
          <div
            key={row}
            className="grid grid-cols-7 border-b border-border-ds-subtle last:border-b-0"
          >
            {Array.from({ length: 7 }).map((_, col) => (
              <div
                key={col}
                className="min-h-[100px] border-r border-border-ds-subtle last:border-r-0 p-2 space-y-1.5"
              >
                <Skeleton className="h-4 w-6 rounded-full" />
                <Skeleton className="h-5 w-16" />
                <div className="flex gap-1">
                  <Skeleton className="h-3.5 w-8 rounded" />
                  <Skeleton className="h-3.5 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 5. Weekly summary footer */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4">
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5 text-center">
              <Skeleton className="h-2.5 w-20 mx-auto" />
              <Skeleton className="h-5 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
