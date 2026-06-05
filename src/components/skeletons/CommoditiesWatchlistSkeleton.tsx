/**
 * Bespoke skeleton for /app/commodities/watchlist (My Desk)
 *
 * Mirrors the real layout (CommoditiesWatchlist.tsx):
 *   1. Tab strip: Watchlist | My Open Trades
 *   2. GlassCard — Watchlist tab default:
 *      - Add-symbol input row (input + button)
 *      - 4 watchlist item rows (ticker + name + price/change + remove)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTabs,
} from "@/components/skeletons/shell";

export function CommoditiesWatchlistSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-28" />

      {/* 2 tabs */}
      <SkeletonTabs count={2} />

      {/* Card body */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
        {/* Add-symbol row */}
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-16 rounded-xl" />
        </div>

        {/* Watchlist item rows */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border-ds-subtle"
          >
            <div className="flex-1 flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="text-right space-y-1 flex-shrink-0 mr-2">
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-3 w-12 ml-auto" />
            </div>
            <Skeleton className="h-4 w-4 flex-shrink-0" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
