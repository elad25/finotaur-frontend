/**
 * Bespoke skeleton for /app/options/chain (Options Chain)
 *
 * Stub page — mirrors the anticipated layout:
 *   1. Ticker search bar + expiration selector
 *   2. Options chain table: Calls (bid/ask/delta/OI) | Strike | Puts (bid/ask/delta/OI) — 15 rows
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function OptionsChainSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-40" />

      {/* Ticker + expiration selector row */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Options chain table: CALLS | Strike | PUTS — 9 cols */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        {/* Call-side label | center | Put-side label */}
        <div className="grid grid-cols-9 gap-2 pb-2 border-b border-border-ds-subtle">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
        {/* 15 strike rows */}
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
