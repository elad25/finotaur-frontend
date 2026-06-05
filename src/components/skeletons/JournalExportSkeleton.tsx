/**
 * Bespoke loading skeleton for /app/journal/export.
 *
 * Mirrors the real layout (max-w-3xl):
 *   1. Header — "Export Trades" title + subtitle
 *   2. Filters card — From date / To date / Outcome select
 *   3. Summary stats row — 4 stat values (Count, Net P&L, Earliest, Latest)
 *   4. Export button (full-width)
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalExportSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-3xl">
      {/* 1. Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-3 w-64" />
      </div>

      {/* 2. Filters card */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-4">
        <Skeleton className="h-3.5 w-16 uppercase tracking-wider" />
        <div className="grid gap-4 sm:grid-cols-3">
          {["From", "To", "Outcome"].map((f) => (
            <div key={f} className="space-y-2">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Summary stats */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {["Trades", "Net P&L", "Earliest", "Latest"].map((label) => (
            <div key={label} className="space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-7 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Export button */}
      <Skeleton className="h-12 w-full rounded-xl" />
    </SkeletonPage>
  );
}
