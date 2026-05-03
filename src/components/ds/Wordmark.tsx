/**
 * Wordmark — FINOTAUR brand wordmark.
 *
 * LOCKED brand rules:
 *  - "FINO" = gold (gradient for premium dimensional feel)
 *  - "TAUR" = white (`--text-primary`)
 *  - Order is fixed; never invert.
 *  - Uses Outfit (`font-wordmark`) for consistent geometric character across sizes.
 *  - Subtle gold glow on hover when wrapped in a hoverable parent (e.g. nav link).
 *
 * DO NOT inline-render `<span>FINO</span><span>TAUR</span>` anywhere in the app.
 * Always use this component. If a new size or treatment is needed, add a variant here
 * and update DESIGN_SYSTEM.md.
 *
 * @see DESIGN_SYSTEM.md §11 (Wordmark)
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type WordmarkSize = "compact" | "default" | "large" | "display" | "nav";
type WordmarkTone = "gradient" | "solid" | "vertical-lit";

interface WordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** compact = navbar/footer, default = body/login, large = hero, display = splash */
  size?: WordmarkSize;
  /** gradient = premium dimensional gold (default), solid = flat gold for tiny sizes */
  tone?: WordmarkTone;
  /** Add hover glow effect (use when wordmark is interactive, e.g. nav link) */
  interactive?: boolean;
}

const sizeMap: Record<WordmarkSize, string> = {
  compact: "text-base tracking-[-0.01em] font-bold",         // ~16px — legacy compact
  default: "text-2xl tracking-[-0.015em] font-bold",         // ~24px — login/footer
  large: "text-4xl tracking-[-0.02em] font-bold",            // ~36px — hero secondary
  display: "text-6xl md:text-7xl tracking-[-0.025em] font-bold", // ~60-72px — splash hero
  nav: "text-[22px] tracking-[-0.015em] font-medium",        // ~22px — global Navbar only
};

export const Wordmark = React.forwardRef<HTMLSpanElement, WordmarkProps>(
  ({ size = "default", tone, interactive = false, className, ...props }, ref) => {
    // When size="nav" and no explicit tone is given, default to "vertical-lit"
    const resolvedTone = tone ?? (size === "nav" ? "vertical-lit" : "gradient");

    const finoClass =
      resolvedTone === "gradient"
        ? "bg-gradient-gold bg-clip-text text-transparent"
        : resolvedTone === "vertical-lit"
        ? "bg-gradient-gold-vertical bg-clip-text text-transparent"
        : "text-gold-primary";

    return (
      <span
        ref={ref}
        className={cn(
          "font-wordmark inline-flex items-baseline whitespace-nowrap select-none",
          "transition-[filter,text-shadow] duration-300 ease-out",
          interactive && "hover:[filter:drop-shadow(0_0_8px_rgba(201,166,70,0.5))]",
          sizeMap[size],
          className,
        )}
        {...props}
      >
        <span className={finoClass}>FINO</span>
        <span className="text-ink-primary">TAUR</span>
      </span>
    );
  },
);
Wordmark.displayName = "Wordmark";
