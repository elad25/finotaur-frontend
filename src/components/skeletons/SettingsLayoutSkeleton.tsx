/**
 * SettingsLayoutSkeleton — mirrors /app/settings (SettingsLayout.tsx).
 *
 * Layout: 4 horizontal tabs (General | Subscription | Notifications | Security)
 * → tab content area (mirrors the General tab as default: profile card + timezone card
 * + optional upgrade CTA).
 *
 * The real page uses SkeletonCard internally while profile loads; we replace the
 * whole-page loading state with a faithful shell.
 */
import {
  SkeletonPage,
  SkeletonTabs,
  SkeletonCard,
  Skeleton,
} from "@/components/skeletons/shell";

export function SettingsLayoutSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-3xl">
      {/* Tab strip — General | Subscription | Notifications | Security */}
      <SkeletonTabs count={4} />

      {/* General tab content (default) */}
      {/* Section header row */}
      <div className="flex items-center justify-between pb-ds-2">
        <div className="flex items-center gap-ds-3">
          <Skeleton className="h-11 w-11 rounded-[12px]" />
          <div className="space-y-ds-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Profile card */}
      <SkeletonCard>
        <div className="flex items-center justify-between mb-ds-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-16 rounded-[8px]" />
        </div>
        <div className="space-y-ds-4">
          {/* Display Name field */}
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full max-w-md rounded-md" />
            <Skeleton className="h-3 w-48" />
          </div>
          {/* Email field */}
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full max-w-md rounded-md" />
          </div>
        </div>
      </SkeletonCard>

      {/* Timezone card */}
      <SkeletonCard>
        <div className="flex items-center justify-between mb-ds-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-16 rounded-[8px]" />
        </div>
        <div className="space-y-ds-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-full max-w-md rounded-md" />
          <Skeleton className="h-3 w-40" />
        </div>
      </SkeletonCard>
    </SkeletonPage>
  );
}
