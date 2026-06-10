/**
 * Skeleton for /app/ai/copilot/holdings (CopilotHoldingsPage)
 *
 * Loaded state: CopilotPageShell header +
 * 3-metric row (Positions / Market value / Unrealized P&L) +
 * HoldingsTable (5-col data table).
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonStatRow,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function AiCopilotHoldingsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* CopilotPageShell header */}
      <div className="mb-ds-4 flex flex-wrap items-center justify-between gap-ds-3">
        <div className="flex items-center gap-ds-3">
          <Skeleton className="h-11 w-11 rounded-[7px] flex-shrink-0" />
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
        <Skeleton className="h-8 w-32 rounded-[6px]" />
      </div>

      {/* 3-metric row */}
      <SkeletonStatRow count={3} />

      {/* Holdings table — 5 cols × 6 rows */}
      <SkeletonTable rows={6} cols={5} />
    </SkeletonPage>
  );
}
