/**
 * Bespoke skeleton for src/pages/app/stocks/Earnings.tsx
 * Layout: PageTemplate shell only (page is a placeholder — title + empty body).
 */
import {
  SkeletonPage,
  SkeletonHeader,
} from '@/components/skeletons/shell';

export function StocksEarningsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-48" withEyebrow={false} />
    </SkeletonPage>
  );
}
