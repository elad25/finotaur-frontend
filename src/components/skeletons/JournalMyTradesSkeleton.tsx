/**
 * Bespoke loading skeleton for /app/journal/my-trades.
 *
 * Mirrors the real layout:
 *   1. Header — title + search + view-mode toggle + account selector + export
 *   2. Stats row — 4 KPI cards (Win Rate, P&L, Avg R, Total Trades)
 *   3. Filter / tab strip (Days / Trades toggle + period toggle)
 *   4. Trades table — 12 cols (checkbox, date, symbol, grade, side, session,
 *      entry, exit, P&L, outcome, R, strategy, actions)
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function JournalMyTradesSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-52 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* 2. Stats strip — 4 KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {["Win Rate", "Net P&L", "Avg R", "Trades"].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>

      {/* 3. Filter strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-9 w-16 rounded-lg" />
        </div>
      </div>

      {/* 4. Trades table — 12 columns */}
      <div className="rounded-xl border border-border-ds-subtle overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[32px_100px_1fr_40px_80px_100px_90px_90px_90px_80px_70px_140px_40px] gap-2 bg-surface-1 px-4 py-2.5 border-b border-border-ds-subtle">
          {Array.from({ length: 13 }).map((_, i) => (
            <Skeleton key={i} className="h-3" />
          ))}
        </div>
        {/* 15 rows */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[32px_100px_1fr_40px_80px_100px_90px_90px_90px_80px_70px_140px_40px] gap-2 px-4 py-3 border-b border-border-ds-subtle items-center"
          >
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-5 w-14 rounded-md" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-6 w-6 rounded" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
