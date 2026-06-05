/**
 * Bespoke skeleton for src/pages/app/crypto/Academy.tsx
 * Layout:
 *   1. Tab strip: 3 tabs (Learn | Reports | Calendar)
 *   2. Learn tab (default):
 *      - 3-col topic cards grid (9 cards)
 *      - Glossary card: 2-col term list (10 terms)
 *      - Strategies card
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonTabs,
  Skeleton,
  SkeletonCard,
} from '@/components/skeletons/shell';

export function CryptoAcademySkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-48" withEyebrow={false} />

      <SkeletonTabs count={3} />

      {/* Learn tab content */}
      <div className="space-y-4">
        {/* 9-card topic grid (3-col) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border-ds-subtle bg-surface-1 p-3 flex items-start gap-2.5">
              <Skeleton className="h-6 w-6 shrink-0 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>

        {/* Glossary card */}
        <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-3">
          <Skeleton className="h-5 w-24" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="py-1.5 border-b border-border-ds-subtle last:border-0 space-y-0.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Strategies card */}
        <SkeletonCard lines={4} />
      </div>
    </SkeletonPage>
  );
}
