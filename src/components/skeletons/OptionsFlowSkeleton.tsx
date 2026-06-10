/**
 * Bespoke skeleton for /app/options/flow (Options Flow — unusual/block/sweep)
 *
 * Stub page — mirrors anticipated layout:
 *   1. Filters bar (ticker, side, size, expiry)
 *   2. Flow table: Time | Ticker | Exp | Strike | Type | Side | Premium | OI | Flag (9 cols), 15 rows
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function OptionsFlowSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-36" />

      {/* Filter row */}
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-lg" />
        ))}
      </div>

      {/* Flow table */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <div className="grid grid-cols-9 gap-2 pb-2 border-b border-border-ds-subtle">
          {["Time", "Ticker", "Exp", "Strike", "Type", "Side", "Premium", "OI", "Flag"].map((h) => (
            <Skeleton key={h} className="h-3 w-full" />
          ))}
        </div>
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="grid grid-cols-9 gap-2 py-1 border-b border-border-ds-subtle">
            {Array.from({ length: 9 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
