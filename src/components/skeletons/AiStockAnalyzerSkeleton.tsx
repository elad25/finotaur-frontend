/**
 * Skeleton for /app/ai/stock-analyzer
 *
 * Loaded state: AIArenaShell with a centered title + search bar (landing),
 * or a usage-badge + search bar + 7-tab nav + content area (result loaded).
 * The skeleton mirrors the LANDING state — search bar hero + popular tickers row.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function AiStockAnalyzerSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1240px]">
      {/* Title block (AIArenaShell heading) */}
      <SkeletonHeader titleWidth="w-56" withEyebrow={false} />

      {/* Sub-title line */}
      <Skeleton className="h-4 w-80 mx-auto" />

      {/* Search bar hero */}
      <div className="w-full rounded-[16px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-4 flex items-center gap-ds-3 mt-ds-4">
        <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-9 w-28 rounded-[12px] flex-shrink-0" />
      </div>

      {/* Popular tickers row */}
      <div className="flex flex-wrap gap-ds-2 justify-center mt-ds-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-[8px]" />
        ))}
      </div>

      {/* Tab strip placeholder */}
      <div className="flex gap-ds-2 overflow-x-auto border-b border-border-ds-subtle pb-ds-3 mt-ds-6">
        {["Overview", "Business", "Financials", "Valuation", "Wall St", "Earnings", "Options"].map(
          (_, i) => (
            <Skeleton key={i} className="h-5 w-20 flex-shrink-0" />
          ),
        )}
      </div>

      {/* Content area placeholder */}
      <div className="grid grid-cols-1 gap-ds-5 md:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-[12px]" />
        <Skeleton className="h-48 w-full rounded-[12px]" />
      </div>
      <Skeleton className="h-64 w-full rounded-[12px]" />
    </SkeletonPage>
  );
}
