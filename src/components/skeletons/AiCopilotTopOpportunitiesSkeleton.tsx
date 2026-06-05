/**
 * Skeleton for /app/ai/copilot/top-opportunities (CopilotTopOpportunitiesPage)
 *
 * Loaded state: CopilotPageShell (icon header + back link) +
 * personalization banner + opportunities table (9 cols × 5 rows).
 */
import {
  SkeletonPage,
  Skeleton,
  SkeletonTable,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function AiCopilotTopOpportunitiesSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* CopilotPageShell header */}
      <div className="mb-ds-4 flex flex-wrap items-center justify-between gap-ds-3">
        <div className="flex items-center gap-ds-3">
          <Skeleton className="h-11 w-11 rounded-[7px] flex-shrink-0" />
          <div className="space-y-ds-1">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
        {/* Back to Copilot */}
        <Skeleton className="h-8 w-32 rounded-[6px]" />
      </div>

      {/* Personalization banner */}
      <SkeletonCard lines={2} className="mb-ds-3" />

      {/* Opportunities table — 9 cols × 5 rows */}
      <SkeletonTable rows={5} cols={6} />

      {/* Sector calls panel */}
      <SkeletonCard lines={3} />
    </SkeletonPage>
  );
}
