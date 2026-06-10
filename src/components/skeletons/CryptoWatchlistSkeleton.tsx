/**
 * Bespoke skeleton for src/pages/app/crypto/Watchlist.tsx
 * Layout:
 *   1. Tab strip: 2 tabs (Watchlist | Calculators)
 *   2. GlassCard wrapping Watchlist tab (default):
 *      - 3-col mini stats (Watching count | Combined MCap | Avg 24h)
 *      - Search input
 *      - Watchlist table: 6 cols (Coin | Price | 24h | MCap | 7d sparkline | remove)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonTabs,
  Skeleton,
  SkeletonTable,
} from '@/components/skeletons/shell';

export function CryptoWatchlistSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-36" withEyebrow={false} />

      <SkeletonTabs count={2} />

      {/* Watchlist tab content */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
        {/* 3-col mini stats */}
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle bg-surface-2 p-3 space-y-1">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>

        {/* Search input */}
        <Skeleton className="h-9 w-full rounded-lg" />

        {/* Watchlist table */}
        <SkeletonTable rows={8} cols={6} />
      </div>
    </SkeletonPage>
  );
}
