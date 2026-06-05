/**
 * Bespoke skeleton for src/pages/app/macro/News.tsx
 * Layout: PageTemplate header → news list (article rows with icon/title/meta)
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from '@/components/skeletons/shell';

export function MacroNewsSkeletonPage() {
  return (
    <SkeletonPage>
      {/* PageTemplate header */}
      <SkeletonHeader titleWidth="w-24" withEyebrow />

      {/* News list rows */}
      <div className="space-y-ds-3 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-xl border border-border-ds-subtle p-4">
            {/* Thumbnail / source icon */}
            <Skeleton className="h-16 w-24 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-ds-2">
              {/* Title */}
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
              {/* Meta: source + time + tags */}
              <div className="flex gap-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
