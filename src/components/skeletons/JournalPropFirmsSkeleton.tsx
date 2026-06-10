/**
 * Bespoke loading skeleton for /app/journal/prop-firms.
 *
 * Mirrors the real layout:
 *   1. Header — icon + "Prop Firms" title + subtitle
 *   2. Info banner
 *   3. Tab strip — All / Forex / Stocks / Futures / Crypto / Commodities
 *   4. Grid of prop-firm cards (1→2→3 cols) — each has header, desc,
 *      quick stats (2 cells), challenge rules, CTA button
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalPropFirmsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-7xl">
      {/* 1. Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-3 w-52" />
        </div>
      </div>

      {/* 2. Info banner */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 flex items-start gap-3">
        <Skeleton className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>

      {/* 3. Tab strip */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {["All", "Forex", "Stocks", "Futures", "Crypto", "Commodities"].map((t) => (
            <Skeleton key={t} className="h-8 w-20 rounded-lg shrink-0" />
          ))}
        </div>
      </div>

      {/* 4. Firm cards grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-ds-subtle bg-surface-1 p-6 space-y-4"
          >
            {/* Card header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              {["Profit Split", "Evaluation Cost"].map((s) => (
                <div key={s} className="rounded-lg border border-border-ds-subtle bg-surface-base p-3 space-y-1.5">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>

            {/* Rules */}
            <div className="rounded-lg border border-border-ds-subtle bg-surface-base p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>

            {/* CTA */}
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
