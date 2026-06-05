/**
 * Bespoke loading skeleton for /app/journal/scenarios (Gameplan).
 *
 * Mirrors the real layout:
 *   1. Header — "Gameplan" title + subtitle + Save button
 *   2. AI insight bar (purple toned)
 *   3. Mini stats — 3 small KPI cards (Scenarios, Win Rate, Streak)
 *   4. Scenario overview card — title input + description textarea
 *   5. Scenario builder — Bullish/Bearish/Neutral tab strip + trade logic
 *      form fields (If/Then/Else areas)
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalScenariosSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-3 w-44" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* 2. AI insight bar */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded shrink-0" />
          <Skeleton className="h-3 flex-1" />
        </div>
      </div>

      {/* 3. Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border-ds-subtle bg-surface-1 p-3 space-y-1.5"
          >
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>

      {/* 4. Scenario overview */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>

      {/* 5. Scenario builder — tabs + form */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 overflow-hidden">
        {/* 3 tabs */}
        <div className="flex border-b border-border-ds-subtle">
          {["Bullish", "Bearish", "Neutral"].map((t) => (
            <div key={t} className="flex-1 flex items-center justify-center gap-2 py-3 px-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </div>

        {/* Trade logic fields */}
        <div className="p-5 space-y-5">
          {["If...", "Then...", "Else...", "Risk notes"].map((field) => (
            <div key={field} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-[72px] w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
