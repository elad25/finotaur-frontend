/**
 * Bespoke skeleton for src/pages/app/stocks/News.tsx
 * Layout:
 *   1. PageTemplate header
 *   2. NewsList — repeated news item rows (image + title + meta)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from '@/components/skeletons/shell';

export function StocksNewsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-36" withEyebrow={false} />

      {/* News items */}
      <div className="space-y-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex gap-3 py-3">
            {/* Thumbnail */}
            <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-2.5 w-12" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
