/**
 * Bespoke loading skeleton for /app/journal/backtest/builder (Strategy Builder).
 *
 * Mirrors the real layout (two-column: form on left, preview on right):
 *   1. Header — "Strategy Builder" title + New/Save buttons
 *   2. Two-column layout:
 *      Left (form): Strategy name + asset-class picker + condition blocks
 *      Right (preview): code/rule summary panel
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalBacktestBuilderSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* 2. Two-column layout */}
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Left: Form */}
        <div className="space-y-4">
          {/* Strategy name */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>

          {/* Asset class + timeframe */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
            <Skeleton className="h-4 w-40" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>

          {/* Entry conditions */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-3 items-center">
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            ))}
          </div>

          {/* Exit rules */}
          <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-2 gap-3">
              {["Stop Loss", "Take Profit", "Trailing Stop", "Time Exit"].map((r) => (
                <div key={r} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className={`h-3 ${i % 3 === 2 ? "w-1/2" : i % 3 === 1 ? "w-3/4" : "w-full"}`} />
            ))}
          </div>
          <div className="pt-4">
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
