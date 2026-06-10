/**
 * Bespoke loading skeleton for /app/journal/settings.
 *
 * Mirrors the real layout (max-w-5xl, centered):
 *   1. Header — "Journal Settings" title + subtitle
 *   2. Risk Management card — 1R value + portfolio size + 2 update buttons
 *   3. Subscription card — plan badge + billing info + upgrade/manage buttons
 *   4. Account section — display name, email, change-password row
 *   5. Commissions section — 4 asset-class fee fields
 *   6. Danger zone — export trades + delete account rows
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalSettingsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-5xl">
      {/* 1. Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-3 w-64" />
      </div>

      {/* 2. Risk Management */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-7 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Subscription */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Account */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-8 space-y-4">
        <Skeleton className="h-5 w-28" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {["Display Name", "Email", "Password"].map((label) => (
            <div key={label} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Commissions */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-8 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {["Stocks", "Futures", "Forex", "Options"].map((a) => (
            <div key={a} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* 6. Danger zone */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-8 space-y-4">
        <Skeleton className="h-5 w-28" />
        {["Export trades", "Delete account"].map((action) => (
          <div key={action} className="flex items-center justify-between py-3 border-t border-border-ds-subtle">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
