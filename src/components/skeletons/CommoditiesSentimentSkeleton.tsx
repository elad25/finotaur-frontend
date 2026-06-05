/**
 * Bespoke skeleton for /app/commodities/sentiment (stub breadcrumb page)
 *
 * Stub page: header + one content card.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function CommoditiesSentimentSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-52" />
      <SkeletonCard lines={3} />
    </SkeletonPage>
  );
}
