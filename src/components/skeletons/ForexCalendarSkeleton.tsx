/**
 * Bespoke skeleton for /app/forex/calendar
 *
 * Mirrors the real layout (ForexCalendar.tsx):
 *   Single GlassCard → table with 7 columns:
 *   Time | Currency | Impact | Event | Actual | Forecast | Previous
 *   10 event rows.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function ForexCalendarSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-48" />

      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        {/* Column headers */}
        <div className="grid grid-cols-7 gap-3 pb-2 border-b border-border-ds-subtle">
          {["Time", "Currency", "Impact", "Event", "Actual", "Forecast", "Previous"].map((h) => (
            <Skeleton key={h} className="h-3 w-full" />
          ))}
        </div>
        {/* 10 event rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-3 py-1 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-5 w-12 rounded" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
