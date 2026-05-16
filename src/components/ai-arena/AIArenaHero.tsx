// src/components/ai-arena/AIArenaHero.tsx
import type { ReactNode } from 'react';

export interface AIArenaHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AIArenaHero({ eyebrow, title, subtitle, actions }: AIArenaHeroProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-ds-5">
      <div>
        <p
          className="font-sans text-[11px] font-medium uppercase mb-ds-3"
          style={{
            letterSpacing: '0.2em',
            color: 'var(--gold-eyebrow)',
          }}
        >
          {eyebrow}
        </p>
        <h1 className="font-sans text-[32px] md:text-[40px] font-medium leading-[1.15] text-ink-primary tracking-[-0.01em]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-ds-3 max-w-2xl text-body text-ink-secondary leading-[1.6]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-ds-3">{actions}</div>}
    </div>
  );
}
