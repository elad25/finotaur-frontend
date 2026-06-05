/**
 * Bespoke loading skeleton for /app/all-markets/news.
 *
 * Mirrors the real layout (p-6):
 *   - Page title "Markets News"
 *   - NewsList renders a grid/list of news cards with thumbnail + headline + meta
 *   - We mirror ~8 news card rows (thumbnail left, text right)
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function AllMarketsNewsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]" className="!p-6">
      {/* Page title */}
      <Skeleton className="h-8 w-40 mb-6" />

      {/* News list: 8 rows */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-xl border border-border-ds-subtle bg-surface-1 p-4"
          >
            {/* Thumbnail */}
            <Skeleton className="shrink-0 h-20 w-28 rounded-lg" />
            {/* Text */}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex items-center gap-3 pt-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
