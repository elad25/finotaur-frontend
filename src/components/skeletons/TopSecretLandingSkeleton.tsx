/**
 * TopSecretLandingSkeleton — mirrors /app/top-secret landing (unauthenticated / non-subscriber).
 *
 * Layout: hero badge + title + stats row → report-type cards (3 col)
 * → pricing grid (2 col) → feature list rows.
 * Full dark-bg page (no standard max-w-[1600px] container — matches the
 * full-bleed dark layout of TopSecretLanding.tsx).
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonStatRow,
  SkeletonGrid,
} from "@/components/skeletons/shell";

export function TopSecretLandingSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-6xl">
      {/* Hero section */}
      <div className="text-center space-y-ds-3 py-ds-6">
        {/* Badge pill */}
        <div className="flex justify-center">
          <Skeleton className="h-8 w-52 rounded-full" />
        </div>
        {/* Main headline */}
        <Skeleton className="mx-auto h-10 w-[480px]" />
        <Skeleton className="mx-auto h-7 w-[340px]" />
        {/* Subtitle */}
        <Skeleton className="mx-auto h-4 w-80" />
      </div>

      {/* Stats row (3 stats) */}
      <SkeletonStatRow count={3} />

      {/* Report type cards (3 col) */}
      <SkeletonGrid cols={3} rows={1} cardHeight="h-56" />

      {/* Pricing grid — 2 tall cards side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-ds-4">
        <Skeleton className="h-96 rounded-[16px]" />
        <Skeleton className="h-96 rounded-[16px]" />
      </div>

      {/* Features list */}
      <div className="space-y-ds-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-ds-3">
            <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
            <Skeleton className="h-4 w-72" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
