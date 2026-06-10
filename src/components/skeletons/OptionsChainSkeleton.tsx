/**
 * Skeleton for /app/options/chain — the real page is the "Coming Soon"
 * placeholder (src/pages/app/ComingSoon.tsx): a single centered card with a
 * circular icon, title, description, and an email-signup row. Mirror THAT,
 * not a fake options chain.
 */
import { Skeleton } from "@/components/skeletons/shell";

export function OptionsChainSkeletonPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6" role="status" aria-label="Loading">
      <div className="w-full max-w-md rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-6">
        {/* circular icon */}
        <Skeleton className="mx-auto mb-ds-4 h-16 w-16 rounded-full" />
        {/* title */}
        <Skeleton className="mx-auto h-7 w-48 mb-ds-4" />
        {/* description (2 centered lines) */}
        <Skeleton className="mx-auto h-4 w-full mb-ds-2" />
        <Skeleton className="mx-auto h-4 w-3/4 mb-ds-5" />
        {/* "get notified" label */}
        <Skeleton className="mx-auto h-4 w-40 mb-ds-3" />
        {/* email input + button row */}
        <div className="flex gap-ds-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default OptionsChainSkeletonPage;
