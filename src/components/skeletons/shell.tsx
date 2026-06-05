/**
 * Shared building blocks for PER-PAGE skeletons.
 *
 * Every page in the app gets its OWN skeleton component under
 * `src/components/skeletons/` that mirrors that page's real loaded layout
 * (same header, stat rows, grids, charts, tables — in the same positions and
 * counts). Those components compose the primitives from `@/components/ds/Skeleton`
 * plus the page wrapper below, and are used in TWO places:
 *   1. the page's own in-render loading gate (`if (isLoading) return <XSkeletonPage/>`)
 *   2. the route-transition registry in `@/components/ds/RouteSkeleton`
 * so the loading state always matches the destination page.
 *
 * Keep these components PURE/presentational (only ds/Skeleton + DS tokens) so
 * they stay cheap enough to ship in the route-transition path.
 *
 * @see DESIGN_SYSTEM.md (Loaders)
 */
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ds/Skeleton";

export {
  Skeleton,
  SkeletonText,
  SkeletonStat,
  SkeletonStatRow,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
  SkeletonGrid,
} from "@/components/ds/Skeleton";

/** Standard page wrapper — matches the app content container (max-width + padding). */
export function SkeletonPage({
  children,
  className,
  maxWidth = "max-w-[1600px]",
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <div
      className={cn("mx-auto w-full space-y-ds-5 p-4 md:p-6", maxWidth, className)}
      role="status"
      aria-label="Loading"
    >
      {children}
    </div>
  );
}

/** Page heading placeholder (eyebrow line + title). Width tunable per page. */
export function SkeletonHeader({
  titleWidth = "w-64",
  withEyebrow = true,
  withActions = false,
}: {
  titleWidth?: string;
  withEyebrow?: boolean;
  withActions?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-ds-4" aria-hidden="true">
      <div className="space-y-ds-2">
        {withEyebrow && <Skeleton className="h-3 w-24" />}
        <Skeleton className={cn("h-7", titleWidth)} />
      </div>
      {withActions && (
        <div className="flex gap-ds-2">
          <Skeleton className="h-9 w-24 rounded-[12px]" />
          <Skeleton className="h-9 w-9 rounded-[12px]" />
        </div>
      )}
    </div>
  );
}

/** A horizontal tab-strip placeholder (for pages with sub-tabs). */
export function SkeletonTabs({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-ds-3 border-b border-border-ds-subtle pb-ds-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-5 w-20" />
      ))}
    </div>
  );
}
