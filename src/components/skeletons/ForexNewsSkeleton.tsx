/**
 * Bespoke skeleton for /app/forex/news
 *
 * Mirrors the real layout (ForexNews.tsx):
 *   Header + NewsList — a list of 8 news rows (thumbnail + headline + meta).
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function ForexNewsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-24" />

      {/* News feed rows */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 divide-y divide-border-ds-subtle overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 p-4">
            <Skeleton className="w-28 h-20 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
