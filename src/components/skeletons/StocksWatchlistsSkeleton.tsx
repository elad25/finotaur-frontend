/**
 * Bespoke skeleton for src/pages/app/stocks/Watchlists.tsx
 * Layout: PageTemplate shell only (page is a placeholder — title + empty body).
 */
import {
  SkeletonPage,
  SkeletonHeader,
} from '@/components/skeletons/shell';

export function StocksWatchlistsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-36" withEyebrow={false} />
    </SkeletonPage>
  );
}
