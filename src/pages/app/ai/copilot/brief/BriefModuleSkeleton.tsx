/**
 * BriefModuleSkeleton — glance-row pulse placeholder while a BriefModule loads.
 *
 * Mirrors the trigger row shape of BriefModule:
 *  left:  icon stub + eyebrow bar + headline bar
 *  right: circle stub (score ring placeholder)
 *
 * Uses the same animate-pulse / bg-white/[0.0x] pattern from
 * SynthesisBriefNarrative SkeletonBlock.
 */

import { cn } from '@/lib/utils';
import { PremiumFrame } from './PremiumFrame';

interface BriefModuleSkeletonProps {
  className?: string;
}

export function BriefModuleSkeleton({ className }: BriefModuleSkeletonProps) {
  return (
    <PremiumFrame className={cn(className)}>
      <div className="animate-pulse flex items-center justify-between gap-ds-3 px-ds-4 py-ds-3">

        {/* Left cluster skeleton */}
        <div className="flex items-center gap-ds-3 min-w-0 flex-1">
          {/* Icon stub */}
          <div className="flex-none h-8 w-8 rounded-[6px] bg-white/[0.07]" />

          {/* Text bars */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Eyebrow bar — narrow */}
            <div className="h-2 w-1/5 rounded bg-white/[0.07]" />
            {/* Headline bar — wider */}
            <div className="h-3 w-2/3 rounded bg-white/[0.05]" />
          </div>
        </div>

        {/* Right cluster skeleton: score ring circle + chevron placeholder */}
        <div className="flex-none flex items-center gap-ds-2">
          <div className="h-10 w-10 rounded-full bg-white/[0.07]" />
          <div className="h-4 w-4 rounded bg-white/[0.05]" />
        </div>

      </div>
    </PremiumFrame>
  );
}

export default BriefModuleSkeleton;
