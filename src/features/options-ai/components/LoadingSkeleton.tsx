// src/features/options-ai/components/LoadingSkeleton.tsx

import { memo } from 'react';
import { Skeleton, SkeletonCard } from './ui';

export const OptionsLoadingSkeleton = memo(function OptionsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1,2,3].map(i => <SkeletonCard key={i}><Skeleton className="h-3 w-24 mb-3" /><Skeleton className="h-10 w-32 mb-4" /><Skeleton className="h-4 w-full mb-1" /><Skeleton className="h-4 w-3/4" /></SkeletonCard>)}
      </div>
      <SkeletonCard><Skeleton className="h-6 w-40 mb-4" />{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl mb-3" />)}</SkeletonCard>
      <SkeletonCard><Skeleton className="h-6 w-40 mb-4" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div></SkeletonCard>
    </div>
  );
});
