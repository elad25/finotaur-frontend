/**
 * FundingBrokersSkeleton — mirrors /app/funding/brokers (FundingBrokers).
 *
 * Real page is a PageTemplate stub: title + description.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

export function FundingBrokersSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-32" withEyebrow />
      <Skeleton className="h-4 w-72" />
    </SkeletonPage>
  );
}
