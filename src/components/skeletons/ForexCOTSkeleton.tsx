/**
 * Bespoke skeleton for /app/forex/cot (COT Positioning)
 *
 * Mirrors the real layout (ForexCOT.tsx):
 *   Single GlassCard → table with 7 columns:
 *   Currency | Net Position | WoW Change | Non-Comm Long | Non-Comm Short | Open Interest | Report Date
 *   8 currency rows.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function ForexCOTSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-44" />

      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        {/* Column headers */}
        <div className="grid grid-cols-7 gap-3 pb-2 border-b border-border-ds-subtle">
          {["Currency", "Net Position", "WoW Change", "Non-Comm Long", "Non-Comm Short", "Open Interest", "Report Date"].map((h) => (
            <Skeleton key={h} className="h-3 w-full" />
          ))}
        </div>
        {/* 8 currency rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-3 py-1 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
