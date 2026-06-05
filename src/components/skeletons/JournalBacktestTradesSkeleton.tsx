/**
 * Bespoke loading skeleton for /app/journal/backtest/trades (BacktestTrades).
 *
 * Mirrors the real layout:
 *   1. Header — "My Backtest Trades" title + Export CSV + By Session + New buttons
 *   2. KPI strip — 6 tiles (Net P&L, Trades, Win Rate, Profit Factor, Avg Win, Avg Loss)
 *   3. Filter bar — search + side filter + outcome filter + sort
 *   4. Trades table — 8 cols (Date, Symbol, Side, Entry, Exit, P&L, R, Session)
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalBacktestTradesSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-8 w-56" />
          </div>
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* 2. KPI strip — 6 tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-2"
          >
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>

      {/* 3. Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-52 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* 4. Table */}
      <div className="rounded-xl border border-border-ds-subtle overflow-hidden">
        {/* Column headers — 8 */}
        <div className="grid grid-cols-8 gap-3 bg-surface-1 px-5 py-3 border-b border-border-ds-subtle">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-3" />
          ))}
        </div>
        {/* 15 rows */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="grid grid-cols-8 gap-3 px-5 py-3 border-b border-border-ds-subtle items-center last:border-b-0">
            {Array.from({ length: 8 }).map((_, j) => (
              <Skeleton key={j} className="h-3" />
            ))}
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
