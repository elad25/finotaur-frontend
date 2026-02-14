// src/components/stock-analyzer/StockLoadingSkeleton.tsx
// =====================================================
// 📊 STOCK ANALYZER — Loading Skeleton
// =====================================================

import { memo } from 'react';
import { Skeleton } from './ui';
import { cardStyle } from '@/constants/stock-analyzer.constants';

export const StockLoadingSkeleton = memo(() => (
  <div className="mt-8 space-y-6 animate-in fade-in duration-300">
    {/* Price Header Skeleton */}
    <div className="rounded-2xl p-6 md:p-8" style={cardStyle()}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-2xl" />
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48 mb-1" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <div className="text-right">
          <Skeleton className="h-12 w-40 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-8 pt-6 border-t border-[#C9A646]/10">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i}>
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>

    {/* Tab Nav Skeleton */}
    <div className="flex justify-center">
      <div className="flex gap-2 p-1.5 rounded-xl" style={cardStyle()}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-11 w-24 rounded-lg" />
        ))}
      </div>
    </div>

    {/* Content Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl p-6" style={cardStyle()}>
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="p-3 rounded-xl bg-white/[0.03]">
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
));

StockLoadingSkeleton.displayName = 'StockLoadingSkeleton';
