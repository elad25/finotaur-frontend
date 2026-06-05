/**
 * Bespoke skeleton for src/pages/app/macro/Events.tsx
 * Layout: header →
 *   Featured event hero card →
 *   Upcoming events list (alternating impact levels) →
 *   Quick reference table (prev/forecast/impact cols)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function MacroEventsSkeletonPage() {
  return (
    <SkeletonPage>
      {/* Header */}
      <SkeletonHeader titleWidth="w-40" withEyebrow />

      {/* Featured / hero event card */}
      <div className="rounded-2xl border border-border-ds-subtle p-6 space-y-ds-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-ds-2">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        {/* Market effect section */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border-ds-subtle">
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
        {/* Affected assets */}
        <div className="flex gap-ds-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </div>

      {/* Event list */}
      <div className="space-y-ds-2">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-ds-subtle p-4 flex gap-4">
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-ds-1">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick reference table */}
      <div className="space-y-ds-2">
        <Skeleton className="h-4 w-36" />
        <SkeletonTable rows={8} cols={6} />
      </div>
    </SkeletonPage>
  );
}
