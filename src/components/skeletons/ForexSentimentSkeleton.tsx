/**
 * Bespoke skeleton for /app/forex/sentiment
 *
 * Mirrors the real layout (ForexSentiment.tsx — simple breadcrumb + title + content card):
 *   Header + one content card with placeholder lines.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function ForexSentimentSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-44" />
      <SkeletonCard lines={3} />
    </SkeletonPage>
  );
}
