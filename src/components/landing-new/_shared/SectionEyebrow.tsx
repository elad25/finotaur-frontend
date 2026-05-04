// src/components/landing-new/_shared/SectionEyebrow.tsx
// ================================================
// SectionEyebrow — Small gold uppercase label flanked by hairlines.
// Used above section titles as a category/context label.
// ================================================

import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Props = {
  /** Text size variant. 'default' = 11px, 'lg' = 13px. Default: 'default' */
  size?: 'default' | 'lg';
  className?: string;
  children: React.ReactNode;
};

// ---------------------------------------------------------------------------
// SectionEyebrow
// ---------------------------------------------------------------------------
export function SectionEyebrow({ size = 'default', className, children }: Props) {
  return (
    <div className={cn('flex items-center justify-center gap-3 mb-8 md:mb-10', className)}>
      {/* Left hairline — fades in from the text */}
      <div
        className="w-8 h-px bg-gradient-to-r from-transparent to-gold-eyebrow-hairline"
        aria-hidden="true"
      />

      <p
        className={cn(
          'font-sans font-normal tracking-[0.3em] uppercase text-gold-eyebrow',
          size === 'lg' ? 'text-[13px]' : 'text-[11px]',
        )}
      >
        {children}
      </p>

      {/* Right hairline — fades out away from the text */}
      <div
        className="w-8 h-px bg-gradient-to-l from-transparent to-gold-eyebrow-hairline"
        aria-hidden="true"
      />
    </div>
  );
}
