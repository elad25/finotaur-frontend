// src/components/stock-analyzer/v2/StockEmptyState.tsx
import { Card, Eyebrow } from '@/components/ds/Card';
import { cn } from '@/lib/utils';
import type { StockSuggestion } from '@/types/stock-analyzer.types';

interface StockEmptyStateProps {
  suggestedTickers: StockSuggestion[];
  onSelect: (ticker: string) => void;
  className?: string;
}

export function StockEmptyState({ suggestedTickers, onSelect, className }: StockEmptyStateProps) {
  return (
    <Card variant="featured" padding="spacious" className={cn('text-center max-w-3xl mx-auto', className)}>
      <Eyebrow>START WHERE INSTITUTIONS LOOK</Eyebrow>
      <h2 className="mt-ds-3 font-sans font-bold text-[32px] md:text-[44px] text-ink-primary leading-[1.1] tracking-[-0.02em]">
        Pick a ticker. We'll do the rest.
      </h2>
      <p className="mt-ds-3 max-w-xl mx-auto text-body text-ink-secondary leading-[1.6]">
        Institutional-grade research, AI-narrated, in under 8 seconds. Choose a popular ticker below — or use the search above.
      </p>
      <div className="mt-ds-6 flex flex-wrap justify-center gap-ds-2">
        {suggestedTickers.slice(0, 8).map((s) => (
          <button
            key={s.ticker}
            type="button"
            onClick={() => onSelect(s.ticker)}
            className={cn(
              'rounded-[8px] px-ds-3 py-ds-2',
              'font-mono tabular-nums text-small',
              'bg-surface-1 border-[0.5px] border-border-ds-subtle text-ink-secondary',
              'transition-colors duration-base ease-out',
              'hover:border-gold-border hover:text-gold-primary',
              'focus-visible:outline-none focus-visible:border-gold-primary',
            )}
            title={s.name}
          >
            {s.ticker}
          </button>
        ))}
      </div>
    </Card>
  );
}
