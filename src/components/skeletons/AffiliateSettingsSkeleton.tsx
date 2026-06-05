/**
 * AffiliateSettingsSkeleton — mirrors src/features/affiliate/pages/Affiliatesettings.tsx.
 *
 * Layout: header → affiliate-code section card → profile section card
 * → payment method section card → tier/stats info card.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonCard,
  Skeleton,
} from "@/components/skeletons/shell";

function FormField({ labelWidth = "w-24" }: { labelWidth?: string }) {
  return (
    <div className="space-y-ds-1">
      <Skeleton className={`h-3 ${labelWidth}`} />
      <Skeleton className="h-10 w-full rounded-[8px]" />
    </div>
  );
}

export function AffiliateSettingsSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-3xl">
      {/* Header */}
      <SkeletonHeader titleWidth="w-48" withEyebrow={false} />

      {/* Affiliate code card */}
      <SkeletonCard>
        <Skeleton className="h-4 w-32 mb-ds-3" />
        <div className="flex gap-ds-3">
          <Skeleton className="h-10 flex-1 rounded-[8px]" />
          <Skeleton className="h-10 w-10 rounded-[8px]" />
        </div>
      </SkeletonCard>

      {/* Profile info card */}
      <SkeletonCard>
        <Skeleton className="h-4 w-24 mb-ds-4" />
        <div className="space-y-ds-3">
          <FormField labelWidth="w-28" />
          <FormField labelWidth="w-24" />
          <FormField labelWidth="w-16" />
          <FormField labelWidth="w-20" />
        </div>
      </SkeletonCard>

      {/* Payment method card */}
      <SkeletonCard>
        <Skeleton className="h-4 w-36 mb-ds-4" />
        <div className="space-y-ds-3">
          <FormField labelWidth="w-28" />
          {/* Save button */}
          <Skeleton className="h-10 w-24 rounded-[12px]" />
        </div>
      </SkeletonCard>

      {/* Tier info card (read-only) */}
      <SkeletonCard>
        <div className="flex items-center justify-between">
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </SkeletonCard>
    </SkeletonPage>
  );
}
