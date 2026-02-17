// src/components/access/UsageBadge.tsx

import { Zap } from 'lucide-react';

interface UsageBadgeProps {
  used: number;
  limit: number;
  label?: string;
  isLifetime?: boolean;
}

export function UsageBadge({ used, limit, label = 'analyses today', isLifetime = false }: UsageBadgeProps) {
  const remaining = Math.max(0, limit - used);
  const isLow = remaining <= 1;
  const isOut = remaining === 0;

  // 🔥 v8.5.0: Adjust label for lifetime trades
  const displayLabel = isLifetime ? 'lifetime trades remaining' : label;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
      style={{
        background: isOut
          ? 'rgba(239,68,68,0.1)'
          : isLow
            ? 'rgba(245,158,11,0.1)'
            : 'rgba(201,166,70,0.1)',
        border: `1px solid ${
          isOut ? 'rgba(239,68,68,0.3)' : isLow ? 'rgba(245,158,11,0.3)' : 'rgba(201,166,70,0.2)'
        }`,
      }}
    >
      <Zap
        className="w-3 h-3"
        style={{ color: isOut ? '#EF4444' : isLow ? '#F59E0B' : '#C9A646' }}
      />
      <span style={{ color: isOut ? '#EF4444' : isLow ? '#F59E0B' : '#C9A646' }}>
        {remaining}/{limit} {displayLabel}
      </span>
    </div>
  );
}