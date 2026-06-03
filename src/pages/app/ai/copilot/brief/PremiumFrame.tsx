/**
 * PremiumFrame — gold-bordered card used throughout COPILOT surfaces.
 *
 * Extracted verbatim from FinotaurCopilotDashboard.tsx so downstream pages
 * (Daily PM Brief, etc.) can share the same visual standard without
 * duplicating markup. FinotaurCopilotDashboard will swap its inline version
 * for this import in a subsequent task.
 *
 * Anatomy:
 *  - Near-black `#070604/92` base with heavy box-shadow
 *  - `border-gold-primary/20` rounded-[7px] perimeter
 *  - 1px horizontal gold hairline along the top edge (via-gold-primary/65)
 *  - Subtle 135deg radial gold sheen overlay (pointer-events-none)
 *  - `relative h-full` inner wrapper so children can use absolute positioning
 */

import type { ReactNode } from 'react';

interface PremiumFrameProps {
  children: ReactNode;
  className?: string;
}

export function PremiumFrame({ children, className = '' }: PremiumFrameProps) {
  return (
    <section className={`relative overflow-hidden rounded-[7px] border border-gold-primary/20 bg-[#070604]/92 shadow-[0_24px_70px_rgba(0,0,0,0.48)] ${className}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/65 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(244,217,123,0.075),transparent_30%,rgba(201,166,70,0.025))]" />
      <div className="relative h-full">{children}</div>
    </section>
  );
}

export default PremiumFrame;
