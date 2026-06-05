/**
 * Skeleton for /app/ai/my-portfolio (Copilot dashboard entry point)
 *
 * Loaded state (connected): 12-col grid —
 *   col-4 PortfolioValuePanel | col-4 AiBrainPanel | col-4 InsightsPanel |
 *   full-width ActionItemsStrip |
 *   col-8 PerformanceChart | col-4 TopOpportunitiesPanel |
 *   col-4 AllocationPanel | col-4 SectorExposurePanel | col-4 RiskAnalysisPanel.
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonStatRow,
} from "@/components/skeletons/shell";

export function AiMyPortfolioSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* Top row: 3 panels × col-4 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-ds-3">
        {/* PortfolioValuePanel */}
        <div className="xl:col-span-4">
          <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5 space-y-ds-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-3 w-32" />
            <SkeletonStatRow count={2} />
          </div>
        </div>

        {/* AiBrainPanel */}
        <div className="xl:col-span-4">
          <SkeletonCard lines={4} className="h-full" />
        </div>

        {/* InsightsPanel */}
        <div className="xl:col-span-4">
          <SkeletonCard lines={3} className="h-full" />
        </div>

        {/* ActionItemsStrip — full width */}
        <div className="xl:col-span-12">
          <div className="flex gap-ds-3 overflow-x-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-64 flex-shrink-0 rounded-[12px]" />
            ))}
          </div>
        </div>

        {/* PerformanceChart */}
        <div className="xl:col-span-8">
          <SkeletonChart height="h-64" />
        </div>

        {/* TopOpportunitiesPanel */}
        <div className="xl:col-span-4">
          <SkeletonCard lines={3} withGrid className="h-full" />
        </div>

        {/* AllocationPanel */}
        <div className="xl:col-span-4">
          <SkeletonCard lines={2} className="h-full" />
        </div>

        {/* SectorExposurePanel */}
        <div className="xl:col-span-4">
          <SkeletonCard lines={3} className="h-full" />
        </div>

        {/* RiskAnalysisPanel */}
        <div className="xl:col-span-4">
          <SkeletonCard lines={2} className="h-full" />
        </div>
      </div>
    </SkeletonPage>
  );
}
