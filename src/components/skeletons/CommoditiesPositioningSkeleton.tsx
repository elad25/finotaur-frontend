/**
 * Bespoke skeleton for /app/commodities/positioning (Positioning & Supply)
 *
 * Mirrors the real layout (CommoditiesPositioning.tsx):
 *   1. Tab strip: COT Positioning | Inventories | Term Structure
 *   2. GlassCard: COT table — 4 cols (Commodity | Managed Money Net |
 *      Producer/Merchant Net | Open Interest), grouped by sector (3 sectors),
 *      ~10 commodity rows total.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTabs,
} from "@/components/skeletons/shell";

export function CommoditiesPositioningSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-52" />

      {/* 3 tabs */}
      <SkeletonTabs count={3} />

      {/* COT table card */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        {/* as-of */}
        <Skeleton className="h-3 w-32" />

        {/* Column headers */}
        <div className="grid grid-cols-4 gap-3 pb-2 border-b border-border-ds-subtle">
          {["Commodity", "Managed Money Net", "Producer / Merchant Net", "Open Interest"].map((h) => (
            <Skeleton key={h} className="h-3 w-full" />
          ))}
        </div>

        {/* Sector: Energy (3 rows) */}
        <Skeleton className="h-3 w-20" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`e${i}`} className="grid grid-cols-4 gap-3 py-1 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}

        {/* Sector: Metals (3 rows) */}
        <Skeleton className="h-3 w-16" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`m${i}`} className="grid grid-cols-4 gap-3 py-1 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}

        {/* Sector: Agriculture (4 rows) */}
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`a${i}`} className="grid grid-cols-4 gap-3 py-1 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}

        {/* Caption */}
        <Skeleton className="h-3 w-full mt-2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </SkeletonPage>
  );
}
