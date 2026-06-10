/**
 * TopSecretPageSkeleton — mirrors the /app/top-secret router page loading state.
 *
 * This is what shows while TopSecretPage.tsx resolves auth + status check
 * (the `authLoading || pageState === 'loading'` guard). It's intentionally
 * neutral — the page can resolve to either Landing or Dashboard, so we show
 * just a center-aligned brand pill + body shimmer to avoid layout shift.
 */
import { SkeletonPage, Skeleton } from "@/components/skeletons/shell";

export function TopSecretPageSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-6xl">
      {/* Brand badge placeholder */}
      <div className="flex justify-center py-ds-6">
        <Skeleton className="h-8 w-48 rounded-full" />
      </div>

      {/* Content shimmer blocks */}
      <Skeleton className="h-10 w-[420px] mx-auto" />
      <Skeleton className="h-4 w-72 mx-auto" />

      {/* Body card */}
      <Skeleton className="h-64 w-full rounded-[16px]" />

      {/* Two-column pricing placeholders */}
      <div className="grid grid-cols-2 gap-ds-4">
        <Skeleton className="h-48 rounded-[16px]" />
        <Skeleton className="h-48 rounded-[16px]" />
      </div>
    </SkeletonPage>
  );
}
