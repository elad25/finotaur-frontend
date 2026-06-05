/**
 * Bespoke loading skeleton for /app/all-markets/calendar.
 *
 * Mirrors the real layout:
 *   - Page header (title + gradient bg)
 *   - 7 main tab buttons (Economic / Holidays / Earnings / Dividends / Splits / IPO / Expiration)
 *   - Control row: 5 time-filter pills + clock + search + country select + refresh + filter button
 *   - Content card: sub-section header + table (7 rows, 6 cols)
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function AllMarketsCalendarSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl" className="!py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-9 w-48" />
        </div>
      </div>

      {/* 7 main tabs */}
      <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-border-ds-subtle">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-32 rounded-lg" />
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Time-filter pills */}
        <div className="flex items-center gap-1 rounded-lg p-1 border border-border-ds-subtle">
          {["Yesterday", "Today", "Tomorrow", "This Week", "Next Week"].map((label) => (
            <Skeleton key={label} className="h-7 w-20 rounded" />
          ))}
        </div>
        {/* Right controls */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Content card with sub-section header + table */}
      <div className="rounded-xl border border-border-ds-subtle overflow-hidden">
        <div className="px-4 py-3 border-b border-border-ds-subtle">
          <Skeleton className="h-4 w-40" />
        </div>
        <SkeletonTable rows={8} cols={6} className="rounded-none border-0 border-b-0" />
      </div>
    </SkeletonPage>
  );
}
