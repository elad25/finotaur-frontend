/**
 * Bespoke loading skeleton for /app/journal/strategies.
 *
 * Mirrors the real layout:
 *   1. Header — "My Strategies" title + subtitle + "New Strategy" button
 *   2. Grid of strategy cards (3-column on lg) — each with name, stats, bar
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalStrategiesSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* 1. Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>

      {/* 2. Strategy cards grid — 3 columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-6 space-y-4"
          >
            {/* Card header */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border-ds-subtle">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <Skeleton className="h-2.5 w-14" />
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </div>

            {/* Performance bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-2.5 w-10" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
