/**
 * Bespoke loading skeleton for /app/journal/academy.
 *
 * The real page is a "Coming Soon" placeholder — one large centered card.
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalAcademySkeletonPage() {
  return (
    <SkeletonPage>
      {/* Page title */}
      <Skeleton className="h-6 w-24" />

      {/* Coming-soon placeholder card */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-12 flex flex-col items-center min-h-[400px] gap-5 justify-center">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-6 w-24 rounded-xl" />
        <Skeleton className="h-8 w-60 rounded-full" />
      </div>
    </SkeletonPage>
  );
}
