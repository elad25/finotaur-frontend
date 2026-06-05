/**
 * Bespoke loading skeleton for /app/journal/new (New Trade form).
 *
 * Mirrors the real form layout (max-w-3xl centered):
 *   1. Header — "New Trade" title + asset-class pills (Stocks/Futures/Forex/Options)
 *   2. Two-column grid of form fields:
 *      Row 1: Symbol + Side toggle
 *      Row 2: Entry Price + Quantity
 *      Row 3: Stop Loss + Take Profit
 *      Row 4: Exit Price + Fees (auto)
 *   3. Date/time row — Open At + Close At
 *   4. Strategy + Session selects
 *   5. Risk preview card
 *   6. Notes textarea
 *   7. Submit button
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalNewTradeSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-3xl">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-44" />
        </div>
        {/* Asset class pills */}
        <div className="flex gap-2">
          {["Stocks", "Futures", "Forex", "Options"].map((cls) => (
            <Skeleton key={cls} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
      </div>

      {/* 2. Form fields grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Symbol + Side */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-10" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 flex-1 rounded-lg" />
          </div>
        </div>

        {/* Entry + Quantity */}
        {["Entry Price", "Quantity"].map((label) => (
          <div key={label} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}

        {/* Stop Loss + Take Profit */}
        {["Stop Loss", "Take Profit"].map((label) => (
          <div key={label} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}

        {/* Exit Price + Fees */}
        {["Exit Price", "Fees (auto)"].map((label) => (
          <div key={label} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* 3. Date/time row */}
      <div className="grid grid-cols-2 gap-4">
        {["Opened At", "Closed At"].map((label) => (
          <div key={label} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* 4. Strategy + Session */}
      <div className="grid grid-cols-2 gap-4">
        {["Strategy", "Session"].map((label) => (
          <div key={label} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* 5. Risk preview card */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4">
        <div className="grid grid-cols-4 gap-4">
          {["Risk $", "Reward $", "R:R", "Expectancy"].map((metric) => (
            <div key={metric} className="space-y-1.5 text-center">
              <Skeleton className="h-2.5 w-16 mx-auto" />
              <Skeleton className="h-6 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* 6. Notes */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>

      {/* 7. Submit */}
      <div className="flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 w-32 rounded-xl" />
      </div>
    </SkeletonPage>
  );
}
