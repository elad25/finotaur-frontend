/**
 * FundingTransactionsSkeleton — mirrors /app/funding/transactions (FundingTransactions).
 *
 * Real page is a PageTemplate stub: title + description.
 * The anticipated full layout would include a transaction history table,
 * so we show header + table to be forward-compatible.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function FundingTransactionsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-36" withEyebrow />
      <Skeleton className="h-4 w-80" />
      <SkeletonTable rows={6} cols={4} />
    </SkeletonPage>
  );
}
