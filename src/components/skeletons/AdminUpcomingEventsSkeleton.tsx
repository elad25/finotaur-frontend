/**
 * AdminUpcomingEventsSkeleton — mirrors /app/admin/upcoming-events (UpcomingEventsAdmin).
 *
 * Layout: header (title + scan button) → filter tab strip (4 tabs)
 * → events table (6 rows × 6 cols including action buttons).
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonTabs,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function AdminUpcomingEventsSkeletonPage() {
  return (
    <SkeletonPage>
      {/* Header — title + "Force Scan" button */}
      <SkeletonHeader titleWidth="w-56" withEyebrow={false} withActions />

      {/* Filter tabs: All / Today / Week / Hidden */}
      <SkeletonTabs count={4} />

      {/* Events table */}
      <SkeletonTable rows={6} cols={6} />
    </SkeletonPage>
  );
}
