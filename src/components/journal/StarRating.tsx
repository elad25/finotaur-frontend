/**
 * StarRating — reusable 1–5 star rating input/display.
 *
 * Interactive mode: hover previews rating, click sets it.
 * Read-only mode: static filled/empty stars, no interaction.
 * Accessible: role="radiogroup" on the container; each star is a
 * focusable button with an aria-label. Arrow-key navigation is not
 * implemented (overkill for a 5-option input), but Tab + Enter/Space work.
 */

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StarRatingProps {
  /** 0 / null / undefined = unrated */
  value: number | null | undefined;
  /** Omit to make the component read-only */
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Optional caption rendered to the right of the stars */
  label?: string;
  /** Clicking the currently active star again fires onChange(0). Default true. */
  allowClear?: boolean;
}

// ---------------------------------------------------------------------------
// Size maps
// ---------------------------------------------------------------------------

const ICON_SIZE: Record<'sm' | 'md' | 'lg', number> = {
  sm: 14,
  md: 18,
  lg: 24,
};

const LABEL_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-[11px]',
  md: 'text-xs',
  lg: 'text-sm',
};

const GAP_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'gap-0.5',
  md: 'gap-1',
  lg: 'gap-1.5',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  label,
  allowClear = true,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const isInteractive = !readOnly && typeof onChange === 'function';
  /** The displayed fill level: hover preview takes priority when interactive */
  const displayValue = isInteractive && hovered !== null ? hovered : (value ?? 0);
  const iconPx = ICON_SIZE[size];

  function handleClick(star: number) {
    if (!isInteractive) return;
    if (allowClear && star === (value ?? 0)) {
      onChange!(0);
    } else {
      onChange!(star);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <div
        role={isInteractive ? 'radiogroup' : undefined}
        aria-label={isInteractive ? 'Star rating' : undefined}
        className={cn('inline-flex items-center', GAP_CLASS[size])}
        onMouseLeave={() => isInteractive && setHovered(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= displayValue;

          if (!isInteractive) {
            // Read-only: plain span, no hover/focus
            return (
              <span
                key={star}
                aria-hidden="true"
                className="inline-flex shrink-0"
              >
                <Star
                  width={iconPx}
                  height={iconPx}
                  className={cn(
                    'shrink-0 transition-colors duration-100',
                    filled
                      ? 'fill-gold-primary text-gold-primary'
                      : 'fill-transparent text-white/20',
                  )}
                />
              </span>
            );
          }

          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === (value ?? 0)}
              aria-label={`Rate ${star} of 5`}
              onClick={() => handleClick(star)}
              onMouseEnter={() => setHovered(star)}
              className={cn(
                'inline-flex shrink-0 cursor-pointer rounded-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/60',
                'transition-transform duration-100 hover:scale-110 active:scale-95',
              )}
            >
              <Star
                width={iconPx}
                height={iconPx}
                className={cn(
                  'shrink-0 transition-colors duration-100',
                  filled
                    ? 'fill-gold-primary text-gold-primary'
                    : 'fill-transparent text-white/20 hover:text-gold-primary/40',
                )}
              />
            </button>
          );
        })}
      </div>

      {label && (
        <span
          className={cn(
            'select-none font-medium text-ink-tertiary',
            LABEL_CLASS[size],
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export default StarRating;
