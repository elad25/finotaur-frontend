/**
 * Bespoke loading skeleton for /app/all-markets/movers.
 *
 * Mirrors the real layout:
 *   - Page header: "Top Movers" title + refresh icon
 *   - 4 asset sections in order: Stocks / Crypto / Commodities / Forex
 *     Each section has:
 *       - Section header: "Gainers" + "Losers" side-by-side cards
 *       Each card:
 *         - Asset type pill + view-all link
 *         - Table header row (Symbol / Price / Chg%)
 *         - 8 (Stocks) or 4 rows
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

function MoversSection({
  title,
  rows,
}: {
  title: string;
  rows: number;
}) {
  const RowBlock = () => (
    <div className="space-y-0">
      {/* Column header */}
      <div className="flex items-center px-4 py-2 gap-2 border-b border-border-ds-subtle">
        <Skeleton className="flex-1 h-3" />
        <Skeleton className="w-16 h-3" />
        <Skeleton className="w-14 h-3" />
        <Skeleton className="w-16 h-3" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center px-4 py-2.5 gap-2 border-b border-border-ds-subtle"
        >
          <div className="flex-1 flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <Skeleton className="w-16 h-3" />
          <Skeleton className="w-10 h-3" />
          <Skeleton className="w-14 h-4 rounded" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-3 w-24 ml-auto" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Gainers card */}
        <div className="rounded-xl border border-border-ds-subtle overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-20" />
          </div>
          <RowBlock />
        </div>
        {/* Losers card */}
        <div className="rounded-xl border border-border-ds-subtle overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-ds-subtle">
            <Skeleton className="h-4 w-20" />
          </div>
          <RowBlock />
        </div>
      </div>
    </div>
  );
}

export function AllMarketsMoversSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]" className="!p-0 !space-y-0">
      {/* Page header */}
      <div className="px-6 py-5 border-b border-border-ds-subtle">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* 4 asset sections */}
      <MoversSection title="Stocks" rows={8} />
      <div className="border-t border-border-ds-subtle" />
      <MoversSection title="Crypto" rows={4} />
      <div className="border-t border-border-ds-subtle" />
      <MoversSection title="Commodities" rows={4} />
      <div className="border-t border-border-ds-subtle" />
      <MoversSection title="Forex" rows={3} />
    </SkeletonPage>
  );
}
