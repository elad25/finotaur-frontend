/**
 * Bespoke loading skeleton for /app/journal/mentor.
 *
 * The page has two modes driven by the user's role:
 *   - Student view: "My Mentors" — list of mentor cards + "Find Mentor" CTA
 *   - Mentor view: "My Students" — pending requests table + students list
 *
 * The skeleton covers the shared header + both content areas (students/mentors
 * sections are both rendered during initial load before role resolves).
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function JournalMentorSkeletonPage() {
  return (
    <SkeletonPage>
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-56" />
      </div>

      {/* Tab strip (student/mentor toggle) */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Pending requests / mentor invite section */}
      <div className="rounded-2xl border border-border-ds-subtle bg-surface-1 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-border-ds-subtle bg-surface-base p-4"
          >
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Students / Mentors list */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-border-ds-subtle pt-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-1 text-center">
                    <Skeleton className="h-2.5 w-14 mx-auto" />
                    <Skeleton className="h-5 w-10 mx-auto" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
