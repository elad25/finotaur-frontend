// src/components/stock-analyzer/LockedOverlay.tsx
// =====================================================
// 🔒 LOCKED OVERLAY — "Unlocking soon" premium gate
// Used to block tabs / metric cells that depend on
// proprietary data not yet commercially licensed.
// =====================================================

import { type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockedOverlayProps {
  /** Optional heading — defaults to "Unlocking soon" */
  title?: string;
  /** Optional supporting line below the heading */
  subtitle?: string;
  /**
   * Content rendered beneath the overlay (blurred/dimmed).
   * Pass a decorative placeholder when calling from a full-tab context.
   */
  children?: ReactNode;
  /** Additional class names on the outer wrapper */
  className?: string;
  /** Controls whether to blur the children or render them dimmed */
  blurChildren?: boolean;
  /** Compact mode — smaller padding, smaller icon, for inline metric cells */
  compact?: boolean;
}

/**
 * LockedOverlay
 *
 * Renders an intentional, premium-looking "locked" state.
 *
 * Full-tab usage:
 *   <LockedOverlay title="Unlocking soon" subtitle="Premium data — coming soon">
 *     <PlaceholderSkeletons />
 *   </LockedOverlay>
 *
 * Inline usage (compact):
 *   <LockedOverlay compact subtitle="Forward estimates" />
 */
export function LockedOverlay({
  title = 'Unlocking soon',
  subtitle,
  children,
  className,
  blurChildren = true,
  compact = false,
}: LockedOverlayProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      {/* ── Blurred / dimmed content beneath the lock ── */}
      {children && (
        <div
          className={cn(
            'pointer-events-none select-none',
            blurChildren ? 'blur-sm opacity-30' : 'opacity-20',
          )}
          aria-hidden="true"
        >
          {children}
        </div>
      )}

      {/* ── Lock badge — floats centered over the content ── */}
      <div
        className={cn(
          'inset-0 flex flex-col items-center justify-center',
          children ? 'absolute' : 'relative',
          compact ? 'py-4 px-3' : 'py-12 px-6',
        )}
      >
        {/* Gold shimmer border panel */}
        <div
          className={cn(
            'flex flex-col items-center gap-3 rounded-2xl',
            compact ? 'px-4 py-3' : 'px-8 py-6',
          )}
          style={{
            background:
              'linear-gradient(135deg, rgba(201,166,70,0.10) 0%, rgba(201,166,70,0.04) 100%)',
            border: '1px solid rgba(201,166,70,0.25)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 4px 32px rgba(201,166,70,0.08)',
          }}
        >
          {/* Lock icon in a gold circle */}
          <div
            className={cn(
              'rounded-full flex items-center justify-center',
              compact ? 'w-8 h-8' : 'w-12 h-12',
            )}
            style={{
              background:
                'linear-gradient(135deg, rgba(201,166,70,0.18) 0%, rgba(201,166,70,0.06) 100%)',
              border: '1px solid rgba(201,166,70,0.35)',
            }}
          >
            <Lock
              className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')}
              style={{ color: '#C9A646' }}
            />
          </div>

          {/* Headline */}
          <p
            className={cn(
              'font-bold text-center leading-tight',
              compact ? 'text-xs' : 'text-sm',
            )}
            style={{ color: '#C9A646' }}
          >
            {title}
          </p>

          {/* Optional subtitle */}
          {subtitle && (
            <p
              className={cn(
                'text-center leading-relaxed',
                compact ? 'text-[10px]' : 'text-xs',
              )}
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
