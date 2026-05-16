// src/components/ai-arena/AIArenaTabNav.tsx
import type { ElementType } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AIArenaTab {
  id: string;
  label: string;
  icon?: ElementType;
  isNew?: boolean;
  isLocked?: boolean;
  lockedReason?: string;
}

export interface AIArenaTabNavProps {
  items: AIArenaTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function AIArenaTabNav({ items, activeId, onChange, className }: AIArenaTabNavProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute bottom-0 inset-x-0 h-px bg-border-ds-subtle" aria-hidden="true" />
      <div
        role="tablist"
        className="flex items-center gap-1 overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((t) => {
          const Icon = t.icon;
          const active = t.id === activeId;
          const locked = !!t.isLocked;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              aria-disabled={locked}
              disabled={locked}
              onClick={() => !locked && onChange(t.id)}
              title={locked ? t.lockedReason : undefined}
              className={cn(
                'group relative snap-start shrink-0',
                'flex items-center gap-ds-2 px-ds-4 py-ds-3',
                'text-[13px] font-medium tracking-[0.04em]',
                'transition-colors duration-base ease-out',
                'bg-transparent',
                active
                  ? 'text-ink-primary font-semibold'
                  : locked
                    ? 'text-ink-muted cursor-not-allowed'
                    : 'text-ink-secondary hover:text-gold-primary',
              )}
            >
              {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
              <span>{t.label}</span>
              {t.isNew && !active && (
                <span
                  className="ml-ds-1 rounded-[4px] px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.1em] uppercase
                             text-gold-primary bg-gold-primary/10 border border-gold-border"
                >
                  NEW
                </span>
              )}
              {locked && <Lock className="ml-ds-1 h-3 w-3" aria-hidden="true" />}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent 0%, #C9A646 20%, #F4D97B 50%, #C9A646 80%, transparent 100%)',
                    boxShadow: '0 0 12px rgba(201,166,70,0.4)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
