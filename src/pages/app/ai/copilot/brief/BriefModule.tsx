/**
 * BriefModule — progressive-disclosure section wrapper for the Daily PM Brief page.
 *
 * Layout:
 *  PremiumFrame
 *  └─ Collapsible (Radix — supports both controlled + uncontrolled)
 *     ├─ CollapsibleTrigger  ← the entire glance row (full-width button)
 *     │   ├─ left:  icon? + <Eyebrow> + headline
 *     │   └─ right: <ScoreRing>? + <ToneBadge>? + ChevronDown (rotates on open)
 *     └─ CollapsibleContent
 *         ├─ children (the deep content)
 *         └─ deepLinkTo? → <Link> footer "Open full → "
 *
 * Controlled mode: pass `open` + `onOpenChange`.
 * Uncontrolled: pass `defaultOpen` (or nothing — defaults to closed).
 *
 * The root element carries `id={id}` + `scroll-mt-24` for anchor scrolling.
 */

import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Eyebrow } from '@/components/ds/Card';
import { cn } from '@/lib/utils';
import { PremiumFrame } from './PremiumFrame';
import { ScoreRing } from './ScoreRing';
import { ToneBadge } from './ToneBadge';
import type { Tone } from './ToneBadge';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BriefModuleProps {
  /** Anchor id — root gets id={id} + scroll-mt-24 */
  id: string;
  /** Uppercase section label, e.g. "MARKET PULSE" */
  eyebrow: string;
  /** Scannable one-liner shown in the collapsed glance row */
  headline: string;
  /** 0-100 → renders a <ScoreRing> on the right side of the trigger */
  score?: number;
  /** Optional pill badge in the trigger row */
  badge?: { label: string; tone: Tone };
  /** Optional Lucide icon shown left of the eyebrow */
  icon?: LucideIcon;
  /** Optional route — renders "Open full →" footer link inside the expanded content */
  deepLinkTo?: string;
  /** Uncontrolled default state (ignored when `open` is provided) */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Controlled open-change handler */
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BriefModule({
  id,
  eyebrow,
  headline,
  score,
  badge,
  icon: Icon,
  deepLinkTo,
  defaultOpen = false,
  open,
  onOpenChange,
  children,
  className,
}: BriefModuleProps) {
  // Build Collapsible props: controlled when `open` is explicitly provided,
  // uncontrolled otherwise. This avoids the React warning about switching
  // between controlled and uncontrolled.
  const collapsibleProps =
    open !== undefined
      ? { open, onOpenChange }
      : { defaultOpen };

  return (
    <div id={id} className={cn('scroll-mt-24', className)}>
      <PremiumFrame>
        <Collapsible {...collapsibleProps}>

          {/* ── Glance row (full-width trigger) ── */}
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                'w-full flex items-center justify-between gap-ds-3',
                'px-ds-4 py-ds-3',
                'text-left',
                'hover:bg-gold-primary/[0.03] transition-colors duration-base ease-out',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary/40',
              )}
            >
              {/* Left cluster: icon + eyebrow + headline */}
              <div className="flex items-center gap-ds-3 min-w-0">
                {Icon && (
                  <div className="flex-none flex h-8 w-8 items-center justify-center rounded-[6px] border border-gold-primary/20 bg-gold-primary/[0.07] text-gold-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <Eyebrow className="block">{eyebrow}</Eyebrow>
                  <p className="mt-0.5 text-sm font-medium text-ink-primary truncate">{headline}</p>
                </div>
              </div>

              {/* Right cluster: score ring + badge + chevron */}
              <div className="flex-none flex items-center gap-ds-2">
                {score !== undefined && (
                  <ScoreRing value={score} size="sm" />
                )}
                {badge && (
                  <ToneBadge tone={badge.tone}>{badge.label}</ToneBadge>
                )}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-ink-tertiary flex-none',
                    'transition-transform duration-base ease-out',
                    'group-data-[state=open]:rotate-180',
                    // Radix sets data-[state=open] on the Collapsible root;
                    // the trigger itself also gets data-state, so target both:
                    'data-[state=open]:rotate-180',
                  )}
                  // data-state forwarded by CollapsibleTrigger to its child
                  aria-hidden="true"
                />
              </div>
            </button>
          </CollapsibleTrigger>

          {/* ── Deep content ── */}
          <CollapsibleContent
            className={cn(
              'overflow-hidden',
              // Radix animates height via data-[state] — these classes provide
              // the CSS custom properties Radix uses for the height animation.
              'data-[state=open]:animate-collapsible-down',
              'data-[state=closed]:animate-collapsible-up',
            )}
          >
            {/* Separator between trigger and content */}
            <div className="mx-ds-4 h-px bg-gold-primary/10" />

            <div className="px-ds-4 py-ds-3">
              {children}
            </div>

            {/* Optional deep-link footer */}
            {deepLinkTo && (
              <div className="mx-ds-4 mb-ds-3 pt-ds-2 border-t border-gold-primary/10">
                <Link
                  to={deepLinkTo}
                  className={cn(
                    'inline-flex items-center gap-1',
                    'text-[11px] font-semibold text-gold-primary',
                    'hover:text-gold-bright transition-colors duration-base ease-out',
                  )}
                >
                  Open full →
                </Link>
              </div>
            )}
          </CollapsibleContent>

        </Collapsible>
      </PremiumFrame>
    </div>
  );
}

export default BriefModule;
