// src/pages/app/crypto/whales/components/SizeBar.tsx
// Horizontal fill bar showing trade size relative to max in the current list.

import { memo } from 'react';
import { clamp } from '../../_shared/formatters';

interface SizeBarProps {
  value: number;
  max: number;
  side: 'buy' | 'sell';
}

export const SizeBar = memo(function SizeBar({ value, max, side }: SizeBarProps) {
  const pct = clamp(max > 0 ? (value / max) * 100 : 0, 0, 100);
  const fillCls = side === 'buy'
    ? 'bg-emerald-400/70'
    : 'bg-red-400/70';

  return (
    <div className="h-1.5 w-16 rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${fillCls}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
});
