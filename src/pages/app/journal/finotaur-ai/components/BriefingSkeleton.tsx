// src/pages/app/journal/finotaur-ai/components/BriefingSkeleton.tsx
// 3-card pulse placeholder shown while briefing loads.

import * as React from 'react';
import { Card } from '@/components/ds/Card';

function SkeletonCard() {
  return (
    <Card>
      <div className="flex flex-col gap-ds-3">
        {/* Badge placeholder */}
        <div className="h-[18px] w-[72px] rounded-[4px] bg-white/5 animate-pulse" />
        {/* Title placeholder */}
        <div className="h-[20px] w-4/5 rounded-[4px] bg-white/5 animate-pulse" />
        {/* Body lines */}
        <div className="flex flex-col gap-ds-2">
          <div className="h-[14px] w-full rounded-[4px] bg-white/5 animate-pulse" />
          <div className="h-[14px] w-3/4 rounded-[4px] bg-white/5 animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

export function BriefingSkeleton() {
  return (
    <section className="flex flex-col gap-ds-4">
      {/* Header row placeholder */}
      <div className="flex items-end justify-between">
        <div className="h-[11px] w-[140px] rounded-[4px] bg-white/5 animate-pulse" />
        <div className="h-[11px] w-[80px] rounded-[4px] bg-white/5 animate-pulse" />
      </div>
      {/* Card grid */}
      <div className="grid grid-cols-1 gap-ds-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2 xl:col-span-2">
          <SkeletonCard />
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </section>
  );
}
