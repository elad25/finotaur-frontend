/**
 * JournalOverviewSkeleton — mirrors /app/journal/overview (Dashboard).
 *
 * Real loaded layout (max-w-[1360px]):
 *   1. Header row — greeting/date + date-picker + account filter +
 *        Connect Broker + refresh icon + Import Trades button
 *   2. 5-KPI card grid — sm:2-col, lg:5-col
 *        (Net P&L, Win Rate, Profit Factor, Avg Win/Loss, Expectancy)
 *        Each card: label, value (large), hint, right visual (icon/gauge/sparkline)
 *   3. Chart row — xl:[0.9fr_1fr] split:
 *        EquityChart (h-[380px]) + DailyPnLChart (h-[380px])
 *   4. Trade Performance panel — rounded panel, header (title + trade count),
 *        2-col inner grid: ByTime scatter (h-[168px]) + ByDuration scatter (h-[168px])
 *   5. BreakdownPanel — full-width chart-height panel (lazy, same shell as ChartSkeleton)
 *   6. AI Insight banner — icon + label + insight text + "View Full Report" button
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonChart,
} from "@/components/skeletons/shell";

export function JournalOverviewSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1360px]">
      {/* 1. Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          {/* Personalized greeting */}
          <Skeleton className="h-5 w-52" />
          {/* Date sub-label */}
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date-picker button */}
          <Skeleton className="h-10 w-32 rounded-[12px]" />
          {/* Account filter dropdown */}
          <Skeleton className="h-10 w-36 rounded-[12px]" />
          {/* Connect Broker button */}
          <Skeleton className="h-10 w-36 rounded-[12px]" />
          {/* Refresh icon button */}
          <Skeleton className="h-10 w-10 rounded-[12px]" />
          {/* Import Trades button */}
          <Skeleton className="h-10 w-32 rounded-[12px]" />
        </div>
      </div>

      {/* 2. KPI cards — 5-col on lg */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-surface-1 min-h-[94px] px-4 py-3"
          >
            <div className="grid h-full grid-cols-[minmax(0,1fr)_66px] items-center gap-3">
              <div className="space-y-2">
                {/* Label */}
                <Skeleton className="h-2.5 w-20" />
                {/* Value (large) */}
                <Skeleton className="h-7 w-28" />
                {/* Hint */}
                <Skeleton className="h-2.5 w-16" />
              </div>
              {/* Right visual (icon / gauge / sparkline placeholder) */}
              <Skeleton className="h-12 w-12 rounded-full ml-auto" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Chart row — Equity + Daily PnL */}
      <div className="grid gap-3 xl:grid-cols-[0.9fr_1fr]">
        <SkeletonChart height="h-[380px]" />
        <SkeletonChart height="h-[380px]" />
      </div>

      {/* 4. Trade Performance panel */}
      <div className="rounded-[12px] border border-white/[0.08] bg-surface-1 p-4">
        {/* Panel header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3.5 w-3.5 rounded" />
          </div>
          {/* Trade count */}
          <Skeleton className="h-3 w-16" />
        </div>
        {/* 2-col scatter charts */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* By Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-[168px] w-full rounded-[12px]" />
          </div>
          {/* By Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-[168px] w-full rounded-[12px]" />
          </div>
        </div>
      </div>

      {/* 5. BreakdownPanel (Symbol / Strategy / Session) — lazy, same silhouette */}
      <SkeletonChart height="h-[380px]" />

      {/* 6. AI Insight banner */}
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 px-6 py-4">
        <div className="flex flex-wrap items-center gap-5">
          {/* Sparkles icon */}
          <Skeleton className="h-11 w-11 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          {/* "View Full Report" button */}
          <Skeleton className="h-10 w-44 rounded-[12px] shrink-0" />
        </div>
      </div>
    </SkeletonPage>
  );
}
