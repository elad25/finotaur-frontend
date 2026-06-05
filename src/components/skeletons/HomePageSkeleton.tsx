/**
 * HomePageSkeleton — mirrors the /app/home hub layout.
 *
 * Real layout (max-w-5xl, space-y-ds-6):
 *   1. Greeting — centered h1
 *   2. Ask Fino card (Card variant="featured") — 160×160 img + right col:
 *        label, subtitle, input+send button row, 5 prompt chips
 *   3. Explore Products section — eyebrow + h2 + sm:2-col card grid (6 cards,
 *        each with 40×40 icon, title, blurb line)
 *   4. Recommended Focus — eyebrow + sm:2-col grid (2 compact cards)
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function HomePageSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-5xl">
      {/* 1. Greeting — centered */}
      <div className="flex justify-center">
        <Skeleton className="h-9 w-72" />
      </div>

      {/* 2. Ask Fino card */}
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-5">
        <div className="flex items-center gap-ds-4">
          {/* FINO animated asset placeholder */}
          <Skeleton className="h-40 w-40 flex-shrink-0 self-center rounded-[12px]" />

          {/* Right column */}
          <div className="flex-1 min-w-0 space-y-ds-3">
            {/* "Ask Fino" label */}
            <Skeleton className="h-5 w-24" />
            {/* Subtitle */}
            <Skeleton className="h-3.5 w-72" />

            {/* Input + Send button row */}
            <div className="flex items-center gap-ds-2 mt-ds-3">
              <Skeleton className="h-8 flex-1 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-[12px]" />
            </div>

            {/* 5 prompt chips */}
            <div className="flex flex-wrap gap-2 mt-ds-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-32 rounded-sm" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Explore Products section */}
      <section aria-hidden="true">
        {/* Section header: eyebrow + h2 */}
        <div className="mb-ds-4 space-y-ds-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-56" />
        </div>

        {/* sm:2-col grid of 6 product cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-5"
            >
              <div className="flex items-center gap-ds-3">
                {/* Icon container */}
                <Skeleton className="h-10 w-10 flex-shrink-0 rounded-[12px]" />
                {/* Title + blurb */}
                <div className="space-y-ds-1 flex-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Recommended Focus section */}
      <section aria-hidden="true">
        {/* Eyebrow only (no h2 in real page) */}
        <div className="mb-ds-4">
          <Skeleton className="h-3 w-36" />
        </div>

        {/* sm:2-col grid of 2 compact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[12px] border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-3"
            >
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-52 mt-ds-1" />
            </div>
          ))}
        </div>
      </section>
    </SkeletonPage>
  );
}
