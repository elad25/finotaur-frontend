/**
 * Bespoke skeleton for /app/commodities/calendar (Commodities Calendar)
 *
 * Mirrors the real layout (CommoditiesCalendar.tsx):
 *   1. Tab strip: Calendar | News | Catalysts | Reports
 *   2. GlassCard body — calendar event rows (date/time + flag + importance + event + values)
 *      8 rows matching the calendar tab default view.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTabs,
} from "@/components/skeletons/shell";

export function CommoditiesCalendarSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-56" />

      {/* 4 tabs */}
      <SkeletonTabs count={4} />

      {/* Card body — calendar event rows */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border-ds-subtle"
          >
            {/* Date/time */}
            <div className="w-20 flex-shrink-0 space-y-1 text-right">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4 ml-auto" />
            </div>
            {/* Flag */}
            <Skeleton className="h-5 w-6 flex-shrink-0 rounded" />
            {/* Importance dots */}
            <Skeleton className="h-3 w-12 flex-shrink-0" />
            {/* Event name */}
            <Skeleton className="h-4 flex-1" />
            {/* Values block */}
            <div className="hidden sm:flex gap-4 flex-shrink-0">
              <div className="space-y-1 text-right">
                <Skeleton className="h-2.5 w-16 ml-auto" />
                <Skeleton className="h-3.5 w-14 ml-auto" />
              </div>
              <div className="space-y-1 text-right">
                <Skeleton className="h-2.5 w-12 ml-auto" />
                <Skeleton className="h-3.5 w-14 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
