/**
 * FundingOverviewSkeleton — mirrors /app/funding (FundingOverview).
 *
 * The real page is a PlanGate + PageTemplate stub, so the skeleton is
 * a minimal title + description placeholder to match that shell.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function FundingOverviewSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-48" withEyebrow />
      <Skeleton className="h-4 w-80" />
    </SkeletonPage>
  );
}
