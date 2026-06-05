/**
 * Bespoke loading skeleton for /app/all-markets/warzone.
 *
 * Mirrors the real layout:
 *   The Warzonelanding is a full-screen marketing/sales page with:
 *     - Hero section: eyebrow badge + h1 + subheading + CTA buttons + hero metrics row
 *     - Mission briefing panel: 2-col (left text + right card)
 *     - Timeline/feature rail: numbered steps
 *     - Daily briefing preview: large card
 *     - Pricing section: 2–3 plan cards
 *     - Final CTA band
 *
 *   For admin users it renders WarZoneAdmin (different layout), but the
 *   isLoading gate fires before role is known — so we mirror the subscriber/
 *   landing layout which is the vast majority case.
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function AllMarketsWarzoneSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* Hero */}
      <div className="text-center space-y-4 py-8">
        <Skeleton className="h-6 w-32 mx-auto rounded-full" />
        <Skeleton className="h-12 w-96 mx-auto" />
        <Skeleton className="h-12 w-80 mx-auto" />
        <Skeleton className="h-5 w-64 mx-auto" />
        <div className="flex justify-center gap-3 pt-2">
          <Skeleton className="h-11 w-40 rounded-[12px]" />
          <Skeleton className="h-11 w-32 rounded-[12px]" />
        </div>
        {/* Hero metrics row */}
        <div className="flex justify-center gap-8 pt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Mission briefing — 2-col */}
      <div className="grid md:grid-cols-2 gap-ds-5">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        </div>
        <SkeletonCard lines={5} />
      </div>

      {/* Timeline rail — 4 steps */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48 mx-auto" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>

      {/* Daily briefing preview */}
      <SkeletonCard lines={4} withGrid />

      {/* Pricing: 2 plan cards */}
      <div className="grid md:grid-cols-2 gap-ds-5">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
      </div>

      {/* Final CTA band */}
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-8 text-center space-y-3">
        <Skeleton className="h-7 w-64 mx-auto" />
        <Skeleton className="h-4 w-80 mx-auto" />
        <Skeleton className="h-11 w-40 mx-auto rounded-[12px]" />
      </div>
    </SkeletonPage>
  );
}
