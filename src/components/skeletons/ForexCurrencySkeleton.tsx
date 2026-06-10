/**
 * Bespoke skeleton for /app/forex/currency/:code (Currency Macro Cockpit)
 *
 * Mirrors the real layout (ForexCurrency.tsx):
 *   1. Currency hero line (code + full name)
 *   2. AI Macro Stance card — text block
 *   3. Policy Rate card — rate + last change + next meeting
 *   4. Key Indicators grid — 6 stat cells (2×3 / 3×2 / 4-col)
 *   5. COT Positioning card — net position + WoW change
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonText,
  SkeletonStatRow,
} from "@/components/skeletons/shell";

export function ForexCurrencySkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-52" />

      {/* Currency hero */}
      <div className="flex items-baseline gap-3">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-6 w-36" />
      </div>

      {/* AI Macro Stance */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <Skeleton className="h-4 w-36" />
        <SkeletonText lines={3} />
      </div>

      {/* Policy Rate */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex flex-wrap gap-6">
          {["Current Rate", "Last Change", "Next Meeting"].map((label) => (
            <div key={label} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Key Indicators — 6 stats */}
      <SkeletonStatRow count={6} />

      {/* COT Positioning */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="flex flex-wrap gap-6">
          {["Net Position", "WoW Change"].map((label) => (
            <div key={label} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
