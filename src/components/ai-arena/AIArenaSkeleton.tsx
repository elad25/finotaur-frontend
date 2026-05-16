// src/components/ai-arena/AIArenaSkeleton.tsx
import { cn } from '@/lib/utils';

export type AIArenaSkeletonVariant = 'card' | 'table' | 'chart' | 'number' | 'text';

interface AIArenaSkeletonProps {
  variant: AIArenaSkeletonVariant;
  count?: number;
  className?: string;
}

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[4px] animate-pulse',
        className,
      )}
      style={{
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(201,166,70,0.10) 50%, rgba(255,255,255,0.04) 100%)',
        backgroundSize: '200% 100%',
      }}
      aria-hidden="true"
    />
  );
}

export function AIArenaSkeleton({ variant, count = 1, className }: AIArenaSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={cn('rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5', className)}>
        <ShimmerBlock className="h-5 w-40 mb-ds-4" />
        <ShimmerBlock className="h-4 w-full mb-ds-2" />
        <ShimmerBlock className="h-4 w-3/4 mb-ds-4" />
        <div className="grid grid-cols-2 gap-ds-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-[8px] bg-surface-2 p-ds-3">
              <ShimmerBlock className="h-3 w-16 mb-ds-1" />
              <ShimmerBlock className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5', className)}>
        <div className="grid grid-cols-5 gap-ds-3 pb-ds-3 mb-ds-3 border-b border-border-ds-subtle">
          {[0, 1, 2, 3, 4].map((i) => <ShimmerBlock key={i} className="h-3 w-full" />)}
        </div>
        {Array.from({ length: count }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-5 gap-ds-3 py-ds-2">
            {[0, 1, 2, 3, 4].map((i) => <ShimmerBlock key={i} className="h-4 w-full" />)}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={cn('rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5', className)}>
        <ShimmerBlock className="h-5 w-32 mb-ds-4" />
        <ShimmerBlock className="h-48 w-full" />
        <div className="mt-ds-3 flex justify-between gap-ds-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <ShimmerBlock key={i} className="h-3 w-12" />)}
        </div>
      </div>
    );
  }

  if (variant === 'number') {
    return <ShimmerBlock className={cn('h-[28px] w-32', className)} />;
  }

  // 'text'
  return (
    <div className={cn('space-y-2', className)}>
      <ShimmerBlock className="h-4 w-full" />
      <ShimmerBlock className="h-4 w-11/12" />
      <ShimmerBlock className="h-4 w-2/3" />
    </div>
  );
}
