/**
 * FundingAdvanceSkeleton — mirrors /app/funding/advance (FundingAdvance).
 *
 * Real page is a PageTemplate stub: title + description.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function FundingAdvanceSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-40" withEyebrow />
      <Skeleton className="h-4 w-80" />
    </SkeletonPage>
  );
}
