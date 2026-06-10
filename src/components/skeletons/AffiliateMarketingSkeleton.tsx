/**
 * AffiliateMarketingSkeleton — mirrors src/features/affiliate/pages/Affiliatemarketing.tsx.
 *
 * Layout: header → template selector row (scrollable cards) → canvas/preview area
 * → toolbar (color/text controls) → download/share buttons.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function AffiliateMarketingSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-5xl">
      {/* Header */}
      <SkeletonHeader titleWidth="w-48" withEyebrow={false} withActions />

      {/* Template cards — horizontal scroll row */}
      <div className="flex gap-ds-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-28 flex-shrink-0 rounded-[12px]" />
        ))}
      </div>

      {/* Canvas / preview area (square-ish) */}
      <Skeleton className="h-80 w-full rounded-[16px]" />

      {/* Toolbar — color/text controls */}
      <div className="flex items-center gap-ds-3 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-[8px]" />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-ds-3">
        <Skeleton className="h-10 w-32 rounded-[12px]" />
        <Skeleton className="h-10 w-28 rounded-[12px]" />
      </div>
    </SkeletonPage>
  );
}
