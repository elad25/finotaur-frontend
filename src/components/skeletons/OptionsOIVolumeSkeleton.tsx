/**
 * Bespoke skeleton for /app/options/oi-volume (OI / Volume)
 *
 * Stub page — mirrors anticipated layout:
 *   1. Ticker search + sub-tabs: OI | Volume | OI Change
 *   2. Chart card (bar chart)
 *   3. Table: Strike | Calls OI | Puts OI | Total OI | Calls Vol | Puts Vol (6 cols), 12 rows
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTabs,
  SkeletonChart,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function OptionsOIVolumeSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-32" />

      <div className="flex gap-3">
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      <SkeletonTabs count={3} />
      <SkeletonChart height="h-56" />
      <SkeletonTable rows={12} cols={6} />
    </SkeletonPage>
  );
}
