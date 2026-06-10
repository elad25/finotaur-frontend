/**
 * Skeleton for /app/futures/overview — the real page is the "Coming Soon"
 * placeholder (src/pages/app/ComingSoon.tsx): a centered card with a circular
 * icon, title, description, and email-signup row. Mirror THAT.
 */
import { Skeleton } from "@/components/skeletons/shell";

export function FuturesOverviewSkeletonPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6" role="status" aria-label="Loading">
      <div className="w-full max-w-md rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-6">
        <Skeleton className="mx-auto mb-ds-4 h-16 w-16 rounded-full" />
        <Skeleton className="mx-auto h-7 w-48 mb-ds-4" />
        <Skeleton className="mx-auto h-4 w-full mb-ds-2" />
        <Skeleton className="mx-auto h-4 w-3/4 mb-ds-5" />
        <Skeleton className="mx-auto h-4 w-40 mb-ds-3" />
        <div className="flex gap-ds-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default FuturesOverviewSkeletonPage;
