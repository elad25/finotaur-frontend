/**
 * HomePageSkeleton — mirrors the /app/home hub layout.
 *
 * Layout: greeting (centered text) → Ask Fino card (image + input + chips)
 * → Explore Products grid (2-col, ~7 cards) → Recommended Focus (2-col, 2 cards).
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonGrid,
} from "@/components/skeletons/shell";

export function HomePageSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-5xl">
      {/* 1. Greeting (centered) */}
      <div className="flex justify-center">
        <Skeleton className="h-8 w-64" />
      </div>

      {/* 2. Ask Fino card — image + right column */}
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-5">
        <div className="flex items-center gap-ds-4">
          {/* FINO avatar placeholder */}
          <Skeleton className="h-40 w-40 flex-shrink-0 rounded-[12px]" />

          {/* Right column */}
          <div className="flex-1 min-w-0 space-y-ds-3">
            {/* "Ask Fino" label + subtitle */}
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-56" />

            {/* Input + button row */}
            <div className="flex items-center gap-ds-2 mt-ds-3">
              <Skeleton className="h-8 flex-1 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-[12px]" />
            </div>

            {/* Prompt chips */}
            <div className="flex flex-wrap gap-2 mt-ds-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-28 rounded-sm" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Explore Products section */}
      <div className="space-y-ds-4">
        {/* Section header */}
        <div className="space-y-ds-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-52" />
        </div>

        {/* 2-column product card grid, 6 cards */}
        <SkeletonGrid cols={2} rows={3} cardHeight="h-16" />
      </div>

      {/* 4. Recommended Focus section */}
      <div className="space-y-ds-4">
        <Skeleton className="h-3 w-36" />
        <SkeletonGrid cols={2} rows={1} cardHeight="h-16" />
      </div>
    </SkeletonPage>
  );
}
