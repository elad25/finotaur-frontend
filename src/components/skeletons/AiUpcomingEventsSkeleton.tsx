/**
 * Skeleton for /app/ai/upcoming-events
 *
 * Loaded state: max-w-4xl centered layout —
 *   header (icon + eyebrow + h1 + description) |
 *   toolbar (range-selector + refresh button) |
 *   list of 4 event cards (date col + content col).
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonCard,
} from "@/components/skeletons/shell";

/** Single event card row — mirrors UpcomingEventCard layout */
function EventCardRow() {
  return (
    <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5">
      <div className="flex items-start gap-ds-5">
        {/* Date column */}
        <div className="w-[72px] flex-shrink-0 space-y-ds-1">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
        {/* Content column */}
        <div className="flex-1 space-y-ds-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        {/* CTA button */}
        <Skeleton className="h-8 w-28 rounded-[8px] flex-shrink-0 hidden sm:block" />
      </div>
    </div>
  );
}

export function AiUpcomingEventsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-4xl">
      {/* Header */}
      <div className="mb-ds-5">
        {/* Eyebrow row — icon + label */}
        <div className="flex items-center gap-ds-2 mb-ds-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-48 mb-ds-2" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-3/4 max-w-xl mt-ds-1" />
      </div>

      {/* Toolbar */}
      <div className="mb-ds-5 flex items-center justify-between gap-ds-4 flex-wrap">
        {/* Range selector pills */}
        <div className="flex gap-ds-2">
          {["3d", "7d", "30d"].map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-[8px]" />
          ))}
        </div>
        {/* Updated time + refresh */}
        <div className="flex items-center gap-ds-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-5 rounded" />
        </div>
      </div>

      {/* 4 event card rows */}
      <div className="space-y-ds-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <EventCardRow key={i} />
        ))}
      </div>
    </SkeletonPage>
  );
}
