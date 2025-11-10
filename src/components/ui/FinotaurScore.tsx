// src/components/ui/FinotaurScore.tsx
import React from "react";

/**
 * FINOTAUR Score ring styled with gold accent (#D4AF37)
 * No layout changes, only color/styling tweaks.
 */
export function FinotaurScore({ score, tagline }: { score: number; tagline: string }) {
  const pct = Math.max(0, Math.min(100, score));
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="flex items-center gap-3">
      <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0">
        <circle cx="30" cy="30" r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="6" fill="none" />
        <circle
          cx="30"
          cy="30"
          r={radius}
          stroke="#D4AF37"            /* gold accent */
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
        <text x="30" y="34" textAnchor="middle" fontSize="14" fontWeight={700} fill="#D4AF37">{pct}</text>
      </svg>
      <div className="flex flex-col">
        <div className="text-sm font-semibold" style={{ color: '#D4AF37' }}>FINOTAUR Score</div>
        <div className="text-xs opacity-80">{tagline}</div>
      </div>
    </div>
  );
}
