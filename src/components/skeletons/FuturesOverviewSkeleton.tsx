/**
 * Bespoke skeleton for src/pages/app/futures/Overview.tsx
 * Layout: PageTemplate shell only (page is a placeholder — title + empty body).
 */
import {
  SkeletonPage,
  SkeletonHeader,
} from '@/components/skeletons/shell';

export function FuturesOverviewSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-44" withEyebrow={false} />
    </SkeletonPage>
  );
}
