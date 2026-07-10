/**
 * KeyTakeaway — the gold-tinted "Key Takeaway" box at the bottom of every
 * report slide. Renders the AI-written sentence when it arrives; while it's
 * loading it shows a shimmering skeleton line; if the AI layer never
 * responds (fetchTakeaways returned null, or this slide's key was missing
 * from the response) it falls back to a deterministic, always-true sentence
 * computed client-side — the report must be complete without the AI layer.
 *
 * @see DESIGN_SYSTEM.md (Loaders — Skeleton vs Spinner)
 */
import { BookOpen, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ds/Skeleton';
import { cn } from '@/lib/utils';

export interface KeyTakeawayProps {
  text?: string | null;
  loading?: boolean;
  fallback: string;
  className?: string;
}

export function KeyTakeaway({ text, loading = false, fallback, className }: KeyTakeawayProps) {
  const body = text?.trim() || fallback;

  return (
    <div
      className={cn(
        'rounded-[12px] border-[0.5px] border-gold-border bg-gold-primary/[0.06] p-ds-4',
        'flex items-start gap-ds-3',
        className,
      )}
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-surface-base border border-gold-border text-gold-primary">
        <BookOpen className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-ds-1">
          <Sparkles className="h-3 w-3 text-gold-primary" aria-hidden="true" />
          <span className="font-sans text-[11px] font-medium tracking-[1px] uppercase text-gold-muted">
            Key Takeaway
          </span>
        </div>
        {loading ? (
          <div className="space-y-ds-1 pt-0.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        ) : (
          <p className="font-sans text-sm italic leading-[1.6] text-ink-secondary">{body}</p>
        )}
      </div>
    </div>
  );
}

export default KeyTakeaway;
