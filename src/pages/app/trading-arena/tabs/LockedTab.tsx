/**
 * Trading Arena — Locked tab placeholder
 *
 * Shown for tabs that are not yet available (Options, Futures, Forex).
 * Centered "Coming soon" panel with a lock icon.
 */

import { Lock } from 'lucide-react';

interface LockedTabProps {
  label: string;
}

export function LockedTab({ label }: LockedTabProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 min-h-0">
      {/* Glow ring */}
      <div className="relative">
        <div
          className="absolute inset-0 blur-2xl opacity-20 rounded-full"
          style={{ background: 'radial-gradient(circle, #C9A646 0%, transparent 70%)' }}
          aria-hidden="true"
        />
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.04) 100%)',
            border: '1.5px solid rgba(201,166,70,0.28)',
          }}
        >
          <Lock
            className="h-9 w-9"
            style={{ color: '#C9A646', filter: 'drop-shadow(0 0 6px rgba(201,166,70,0.45))' }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="text-center">
        <p
          className="text-xl font-semibold mb-1"
          style={{
            background: 'linear-gradient(135deg, #C9A646 0%, #F4D87C 50%, #C9A646 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {label}
        </p>
        <p className="text-sm text-[#606060]">Coming soon</p>
      </div>
    </div>
  );
}
