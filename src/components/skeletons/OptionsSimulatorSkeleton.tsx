/**
 * Bespoke skeleton for /app/options/simulator (Simulator — P&L, Greeks, scenarios)
 *
 * Stub page — mirrors anticipated layout:
 *   1. Inputs panel (ticker, strike, expiry, option type, premium)
 *   2. P&L chart + 4-stat Greeks row
 *   3. Scenarios table
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonStatRow,
  SkeletonChart,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function OptionsSimulatorSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-36" />

      {/* Inputs */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Greeks stats */}
      <SkeletonStatRow count={4} />

      {/* P&L chart */}
      <SkeletonChart height="h-56" />

      {/* Scenarios table */}
      <SkeletonTable rows={6} cols={5} />
    </SkeletonPage>
  );
}
