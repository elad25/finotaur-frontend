// src/features/floor/components/VerifiedTradesNotice.tsx
// =====================================================
// Shared "verified trades" integrity banner.
// Same styling + blue verified badge used on the Floor
// Feed and Leaderboard. Body copy is passed per-surface
// via children so each context reads correctly.
// =====================================================

import type { ReactNode } from 'react';

export function VerifiedTradesNotice({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-[12px]"
      style={{
        background: 'rgba(201,166,70,0.06)',
        border: '1px solid rgba(201,166,70,0.22)',
      }}
    >
      {/* Verified badge — blue seal + white check (recognizable "verified" mark) */}
      <svg
        viewBox="0 0 24 24"
        className="h-[19px] w-[19px] flex-shrink-0 mt-[1px]"
        aria-hidden="true"
      >
        <path
          fill="#1d9bf0"
          d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.68.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.66-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.66 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.66 2.19-1.91 2.19-3.34z"
        />
        <path
          fill="#fff"
          d="M10.54 16.2 6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
        />
      </svg>
      <p className="font-sans text-[12.5px] leading-relaxed text-ink-secondary">
        {children}
      </p>
    </div>
  );
}
