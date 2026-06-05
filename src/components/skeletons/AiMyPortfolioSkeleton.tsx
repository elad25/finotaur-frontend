/**
 * AiMyPortfolioSkeleton — mirrors /copilot (FinotaurCopilotDashboard connected state).
 *
 * This skeleton is shown while admin/access loading resolves. The dominant
 * first-load view is the connected FinotaurCopilotDashboard whose real layout is:
 *
 *   xl:grid-cols-12, gap-3, mt-5
 *   Row 1 (col-4 each):
 *     PortfolioValuePanel  — label, large value, sub-line, 2-stat row
 *     AiBrainPanel         — icon + title, body lines, action items
 *     InsightsPanel        — icon + title, body lines
 *   Row 2:
 *     ActionItemsStrip     — col-12, horizontal scroll of 3 action cards
 *   Row 3:
 *     PerformanceChart     — col-8, h-64 chart with time-range tabs
 *     TopOpportunitiesPanel— col-4, list of 3–4 opportunity rows
 *   Row 4 (col-4 each):
 *     AllocationPanel      — donut + legend
 *     SectorExposurePanel  — bar list
 *     RiskAnalysisPanel    — gauge + risk drivers
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonChart,
  SkeletonCard,
  SkeletonStatRow,
} from "@/components/skeletons/shell";

export function AiMyPortfolioSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">

        {/* ── Row 1: PortfolioValuePanel (col-4) ── */}
        <div className="xl:col-span-4">
          <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5 space-y-ds-3 h-full">
            {/* Label */}
            <Skeleton className="h-3 w-28" />
            {/* Large value */}
            <Skeleton className="h-10 w-44" />
            {/* Sub-line (change %) */}
            <Skeleton className="h-3 w-36" />
            {/* 2 quick stats */}
            <SkeletonStatRow count={2} />
          </div>
        </div>

        {/* ── Row 1: AiBrainPanel (col-4) ── */}
        <div className="xl:col-span-4">
          <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5 space-y-ds-3 h-full">
            {/* Icon + title row */}
            <div className="flex items-center gap-ds-2">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <Skeleton className="h-4 w-32" />
            </div>
            {/* Body lines */}
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
            {/* Action link */}
            <Skeleton className="h-8 w-36 rounded-[12px]" />
          </div>
        </div>

        {/* ── Row 1: InsightsPanel (col-4) ── */}
        <div className="xl:col-span-4">
          <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5 space-y-ds-3 h-full">
            <div className="flex items-center gap-ds-2">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>

        {/* ── Row 2: ActionItemsStrip (col-12) ── */}
        <div className="xl:col-span-12">
          <div className="flex gap-ds-3 overflow-x-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-64 rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-4 space-y-ds-2"
              >
                <div className="flex items-center gap-ds-2">
                  <Skeleton className="h-7 w-7 rounded-[8px] shrink-0" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Row 3: PerformanceChart (col-8) ── */}
        <div className="xl:col-span-8">
          <SkeletonChart height="h-64" />
        </div>

        {/* ── Row 3: TopOpportunitiesPanel (col-4) ── */}
        <div className="xl:col-span-4">
          <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5 space-y-ds-3 h-full">
            <Skeleton className="h-4 w-40 mb-ds-2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-ds-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-ds-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Row 4: AllocationPanel (col-4) ── */}
        <div className="xl:col-span-4">
          <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5 space-y-ds-3 h-full">
            <Skeleton className="h-4 w-28 mb-ds-2" />
            {/* Donut placeholder */}
            <Skeleton className="h-32 w-32 rounded-full mx-auto" />
            {/* Legend rows */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-ds-2">
                <Skeleton className="h-3 w-3 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-10 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Row 4: SectorExposurePanel (col-4) ── */}
        <div className="xl:col-span-4">
          <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5 space-y-ds-3 h-full">
            <Skeleton className="h-4 w-36 mb-ds-2" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-ds-1">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Row 4: RiskAnalysisPanel (col-4) ── */}
        <div className="xl:col-span-4">
          <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5 space-y-ds-3 h-full">
            <Skeleton className="h-4 w-32 mb-ds-2" />
            {/* Gauge placeholder */}
            <Skeleton className="h-24 w-24 rounded-full mx-auto" />
            {/* Risk driver rows */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-ds-2">
                <Skeleton className="h-4 w-4 rounded shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </SkeletonPage>
  );
}
