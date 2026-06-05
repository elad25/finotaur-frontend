/**
 * Bespoke loading skeleton for /app/all-markets/chart.
 *
 * Mirrors the real layout:
 *   Outer: full-width flex gap-4 p-4
 *   Left (flex-1): dark chart card
 *     - Header bar: symbol input + stock name + price badge
 *     - Toolbar bar: indicator/draw buttons + D/W/M timeframe pills
 *     - OHLC bar: O H L C Vol values
 *     - Chart canvas (h-500)
 *     - Data table (Fundamental/Analytical/Technical tabs, 8-col grid)
 *   Right: watchlist sidebar (10 rows) + stock info
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function AllMarketsChartSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]" className="!p-4 !space-y-0">
      <div className="flex gap-4 w-full min-h-screen">
        {/* ── Left: main chart card ── */}
        <div className="flex-1 flex flex-col rounded-lg border border-border-ds-subtle overflow-hidden">
          {/* Header: symbol + name + price */}
          <div className="flex items-start justify-between px-4 py-3 border-b border-border-ds-subtle">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-7 w-28" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>

          {/* Toolbar: indicator + draw + timeframe */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-ds-subtle">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded" />
              <Skeleton className="h-6 w-14 rounded" />
              <Skeleton className="h-4 w-px" />
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-5 rounded" />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {["Daily", "Weekly", "Monthly"].map((tf) => (
                <Skeleton key={tf} className="h-6 w-16 rounded" />
              ))}
            </div>
          </div>

          {/* OHLC bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-border-ds-subtle">
            <div className="flex items-center gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-20" />
              ))}
            </div>
            <Skeleton className="h-3 w-40" />
          </div>

          {/* Chart canvas */}
          <Skeleton className="w-full" style={{ height: "500px" }} shimmer />

          {/* Data table: tab bar + 8-col grid */}
          <div className="border-t border-border-ds-subtle">
            <div className="flex items-center border-b border-border-ds-subtle">
              {["Fundamental", "Analytical", "Technical"].map((t) => (
                <Skeleton key={t} className="h-8 w-28 m-1 rounded" />
              ))}
            </div>
            <div className="p-2 grid grid-cols-8 gap-0">
              {Array.from({ length: 8 }).map((_, col) => (
                <div key={col} className="border-r border-border-ds-subtle last:border-r-0">
                  {Array.from({ length: 7 }).map((_, row) => (
                    <div
                      key={row}
                      className="flex justify-between py-1 px-2 border-b border-border-ds-subtle"
                    >
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: watchlist sidebar ── */}
        <div className="w-[200px] flex flex-col rounded-lg border border-border-ds-subtle overflow-hidden shrink-0">
          {/* Search */}
          <div className="px-3 py-2 border-b border-border-ds-subtle">
            <Skeleton className="h-7 w-full rounded" />
          </div>
          {/* Watchlist rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col px-3 py-2 border-b border-border-ds-subtle gap-1"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
