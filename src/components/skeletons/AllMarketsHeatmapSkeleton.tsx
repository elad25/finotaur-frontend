/**
 * Bespoke loading skeleton for /app/all-markets/heatmap.
 *
 * Mirrors the real layout:
 *   - Header: title text + market status dot + action buttons (Fullscreen / Share)
 *   - Market selector: 7 asset-type pills (Stocks / Sectors / Crypto / Indices / Futures / Forex / Commodities)
 *   - Treemap container (700px tall SVG canvas replaced by shimmer block)
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function AllMarketsHeatmapSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]" className="!p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-96" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-28 rounded" />
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      </div>

      {/* Market selector pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {["Stocks", "Sectors", "Crypto", "Indices", "Futures", "Forex", "Commodities"].map((m) => (
          <Skeleton key={m} className="h-8 w-24 rounded" />
        ))}
      </div>

      {/* Treemap canvas */}
      <Skeleton className="w-full rounded" style={{ height: "700px" }} shimmer />
    </SkeletonPage>
  );
}
