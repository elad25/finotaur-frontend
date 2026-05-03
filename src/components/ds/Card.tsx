/**
 * DS Card — FINOTAUR canonical card container.
 *
 * DO NOT rebuild this — extend it. If you need a new variant, update
 * DESIGN_SYSTEM.md first, then add it here.
 *
 * Variants:
 *  - default:  subtle dark surface, subtle border, hover brightens border.
 *  - glass:    glassmorphism panel — use sparingly (GPU-expensive, hero sections only).
 *  - featured: gold-accented border for highlighted/flagship items.
 *
 * Padding scale follows the 8px DS grid (ds-spacing plugin):
 *  compact=16px  |  default=24px  |  spacious=32px
 *
 * @see DESIGN_SYSTEM.md §5 (Card anatomy), §3 (spacing scale)
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// cva variants
// ---------------------------------------------------------------------------
const cardVariants = cva(
  // Base
  "rounded-[12px]",
  {
    variants: {
      variant: {
        default: [
          "bg-surface-1",
          "border-[0.5px] border-border-ds-subtle",
          "transition-colors duration-base ease-out",
          "hover:border-border-ds-default",
        ],
        glass: [
          "bg-surface-glass",
          "backdrop-blur-glass backdrop-saturate-[140%]",
          "border-[0.5px] border-border-ds-subtle",
        ],
        featured: [
          "bg-surface-1",
          "border-[0.5px] border-gold-border",
          "relative",
          "transition-colors duration-base ease-out",
          "hover:border-gold-primary",
        ],
      },
      padding: {
        compact: "p-ds-4",   // 16px
        default: "p-ds-5",   // 24px
        spacious: "p-ds-6",  // 32px
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

// ---------------------------------------------------------------------------
// Card component
// ---------------------------------------------------------------------------
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  ),
);
Card.displayName = "DSCard";

// ---------------------------------------------------------------------------
// Eyebrow — small uppercase label used inside cards (e.g. "FLAGSHIP")
// Composes freely: add extra className to override color or tracking.
// ---------------------------------------------------------------------------
interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

const Eyebrow = React.forwardRef<HTMLSpanElement, EyebrowProps>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-block",
        "font-sans text-[11px] font-medium tracking-[1.5px] uppercase",
        "text-gold-muted",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  ),
);
Eyebrow.displayName = "DSEyebrow";

export { Card, Eyebrow };
