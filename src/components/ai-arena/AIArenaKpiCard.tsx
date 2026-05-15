// src/components/ai-arena/AIArenaKpiCard.tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, Eyebrow } from '@/components/ds/Card';

export interface AIArenaKpiCardProps {
  id: string;
  label: string;
  value: ReactNode;
  change?: ReactNode;
  hint?: string;
  highlight?: boolean;
  className?: string;
}

export function AIArenaKpiCard({ label, value, change, hint, highlight, className }: AIArenaKpiCardProps) {
  return (
    <Card
      variant="glass"
      padding="compact"
      className={cn(
        'group relative transition-colors duration-base ease-out',
        'hover:border-gold-border',
        highlight && 'border-gold-border',
        className,
      )}
    >
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-ds-2 font-mono tabular-nums text-num-large text-num-neutral leading-tight">
        {value}
      </div>
      {change && <div className="mt-ds-1">{change}</div>}
      {hint && (
        <p className="mt-ds-1 text-[11px] text-ink-tertiary">{hint}</p>
      )}
    </Card>
  );
}
