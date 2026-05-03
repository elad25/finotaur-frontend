/**
 * DS Button — FINOTAUR canonical button component.
 *
 * DO NOT rebuild this — extend it. If you need a new variant, update
 * DESIGN_SYSTEM.md first, then add it here.
 *
 * Key rules:
 *  - `gold` is the PRIMARY CTA. Maximum ONE per visible viewport.
 *  - Gold button: 12px radius, gradient fill, always-on outer glow (signature).
 *  - Sentence case ONLY — never uppercase ("Try the AI", not "TRY THE AI").
 *  - Arrow icon on the right is default for gold variant (pass showArrow={false} to suppress).
 *  - Built as a standalone cva component — does NOT call shadcn's Button internally,
 *    to avoid variant string conflicts. Follows the same forwardRef + Slot + cn shape.
 *
 * @see DESIGN_SYSTEM.md §8 (Primary CTA)
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Arrow SVG — 14 px stroke arrow (identical path to spec's Button.tsx)
// ---------------------------------------------------------------------------
const Arrow = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0 pointer-events-none"
    aria-hidden="true"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// ---------------------------------------------------------------------------
// cva variants
// ---------------------------------------------------------------------------
export const dsButtonVariants = cva(
  // Base — shared by every variant
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap font-medium",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "focus-visible:outline-none",
  ],
  {
    variants: {
      variant: {
        // ---- FINOTAUR DS variants ----------------------------------------
        // Canonical gold CTA. Spec source: landing-new/Pricing.tsx (featured plan).
        // 16px radius, gradient with bright peak in center, drop-shadow + inner highlight,
        // sentence case, weight 600, scale-on-hover (no lift).
        gold: [
          "rounded-xl",                              // 16px (NOT 12px)
          "bg-gradient-gold",                        // 135deg #C9A646 → #F4D97B → #C9A646
          "text-ink-on-gold",                        // black text
          "font-semibold tracking-normal",
          "normal-case",
          "shadow-btn-gold",                         // 0 4px 20px + inset 0 1px 0 white-20
          "transition-all duration-300 ease-out",
          "hover:shadow-btn-gold-hover hover:scale-[1.02]",
          "active:scale-[0.99]",
          "focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
        ],
        goldOutline: [
          "rounded-xl",                              // 16px to match gold
          "bg-transparent",
          "text-ink-primary",
          "border-[0.5px] border-border-ds-default",
          "transition-colors duration-300 ease-out",
          "hover:border-gold-primary hover:text-gold-primary",
          "focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
        ],
        // ---- shadcn-compatible variants (pass-through when used standalone) -
        default:
          "rounded-md bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "rounded-md hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // shadcn originals
        default: "py-3 px-6 text-sm",          // Matches Pricing canonical (py-3 text-sm)
        sm: "h-9 px-3 text-sm",
        lg: "h-11 px-8 text-sm",
        icon: "h-10 w-10",
        // FINOTAUR DS additions
        xl: "py-4 px-10 text-base",            // Hero / large CTA
        compact: "py-2 px-5 text-xs",          // Navbar / inline CTA (replaces sharp uppercase)
        full: "py-3 w-full text-sm",           // Pricing-style full-width inside card
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface DSButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof dsButtonVariants> {
  asChild?: boolean;
  /** Show right-arrow icon. Defaults to true for `gold` variant, false otherwise. */
  showArrow?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const Button = React.forwardRef<HTMLButtonElement, DSButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      showArrow,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const includeArrow = showArrow ?? variant === "gold";

    return (
      <Comp
        ref={ref}
        className={cn(dsButtonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
        {includeArrow && <Arrow />}
      </Comp>
    );
  },
);
Button.displayName = "DSButton";

export { Button };
