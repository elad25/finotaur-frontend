// src/components/landing-new/_shared/SectionTitle.tsx
// ================================================
// SectionTitle — Big section heading in font-wordmark.
// Supports multiple size variants, gradient treatments, and polymorphic 'as' prop.
// ================================================

import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type HeadingTag = 'h1' | 'h2' | 'h3';

type GradientVariant = 'vertical-lit' | 'horizontal-gold' | 'white' | 'split';

type SizeVariant = 'default' | 'large' | 'display';

type Props = {
  /** HTML heading element to render. Default: 'h2' */
  as?: HeadingTag;
  /** Font-size scale. Default: 'default' */
  size?: SizeVariant;
  /**
   * Colour/gradient treatment.
   * - 'vertical-lit': top-lit gold gradient (matches Hero wordmark)
   * - 'horizontal-gold': diagonal gold gradient
   * - 'white': solid white (ink-primary)
   * - 'split': solid white with child <span className="text-gold-primary"> for accent word
   * Default: 'vertical-lit'
   */
  gradient?: GradientVariant;
  className?: string;
  children: React.ReactNode;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sizeClasses: Record<SizeVariant, string> = {
  default: 'text-4xl md:text-6xl tracking-[-0.02em]',
  large:   'text-4xl sm:text-5xl md:text-7xl tracking-[-0.03em]',
  display: 'text-6xl md:text-8xl tracking-[-0.04em]',
};

const gradientClasses: Record<GradientVariant, string> = {
  'vertical-lit':    'bg-gradient-gold-vertical bg-clip-text text-transparent',
  'horizontal-gold': 'bg-gradient-gold bg-clip-text text-transparent',
  'white':           'text-ink-primary',
  'split':           'text-ink-primary',
};

// ---------------------------------------------------------------------------
// SectionTitle
// ---------------------------------------------------------------------------
export function SectionTitle({
  as: Component = 'h2',
  size = 'default',
  gradient = 'vertical-lit',
  className,
  children,
}: Props) {
  return (
    <Component
      className={cn(
        // Base
        'font-wordmark font-medium text-center mb-6 md:mb-8',
        // Size + tracking
        sizeClasses[size],
        // Gradient / colour
        gradientClasses[gradient],
        className,
      )}
    >
      {children}
    </Component>
  );
}
