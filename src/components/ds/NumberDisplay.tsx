/**
 * DS NumberDisplay — FINOTAUR canonical number renderer.
 *
 * DO NOT rebuild this — extend it. If you need a new format or size,
 * update DESIGN_SYSTEM.md first, then add it here.
 *
 * Enforced invariants (LOCKED — do not change without design approval):
 *  - JetBrains Mono with `tabular-nums` for column alignment.
 *  - U+2212 (−) minus sign, NOT hyphen-minus (-).
 *  - White for values (`text-num-neutral`), red for negative changes only
 *    (`text-num-negative`). Color NEVER goes on the price itself.
 *  - Correct sign formatting: +1.34% / −1.34%.
 *
 * Exports: Price, Change, Quote
 *
 * @see DESIGN_SYSTEM.md §7 (Number display), §4 (Color — semantic)
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type NumberSize = "small" | "default" | "large" | "display";
type NumberFormat = "currency" | "percent" | "plain";

// ---------------------------------------------------------------------------
// Tailwind class maps
// ---------------------------------------------------------------------------
const sizeClassMap: Record<NumberSize, string> = {
  small: "text-num-small",
  default: "text-num-default",
  large: "text-num-large",
  display: "text-num-display",
};

// ---------------------------------------------------------------------------
// formatNumber
//
// Formats a number with locale-appropriate separators and the U+2212 minus sign.
// Replaces JS's hyphen-minus (-) with the proper mathematical minus (−) so it
// visually aligns with + in tabular layouts.
// ---------------------------------------------------------------------------
function formatNumber(
  value: number,
  format: NumberFormat,
  decimals: number,
  prefix?: string,
  showSign: boolean = false,
): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  let result = formatted;

  if (format === "currency") {
    result = `${prefix ?? "$"}${formatted}`;
  } else if (format === "percent") {
    result = `${formatted}%`;
  } else if (prefix) {
    result = `${prefix}${formatted}`;
  }

  if (value < 0) {
    result = `−${result}`; // U+2212 mathematical minus sign
  } else if (showSign && value > 0) {
    result = `+${result}`;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Price
//
// The asset value itself. Always white (`text-num-neutral`), regardless of
// direction. Color goes on the change, NEVER on the price.
// ---------------------------------------------------------------------------
interface PriceProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  size?: NumberSize;
  format?: NumberFormat;
  /** e.g. "$" — overrides format prefix defaults */
  prefix?: string;
  /** Default: 2 for currency/percent, 0 for plain */
  decimals?: number;
}

const Price = React.forwardRef<HTMLSpanElement, PriceProps>(
  (
    {
      value,
      size = "default",
      format = "currency",
      prefix,
      decimals = format === "plain" ? 0 : 2,
      className,
      ...props
    },
    ref,
  ) => {
    const text = formatNumber(value, format, decimals, prefix, false);
    const isSmall = size === "small";

    return (
      <span
        ref={ref}
        className={cn(
          "font-mono tabular-nums",
          "text-num-neutral",
          "leading-[1.2]",
          sizeClassMap[size],
          // tracking only for larger sizes — small is dense enough
          !isSmall && "tracking-[-0.5px]",
          className,
        )}
        {...props}
      >
        {text}
      </span>
    );
  },
);
Price.displayName = "DSPrice";

// ---------------------------------------------------------------------------
// Change
//
// The delta value. White for ≥ 0, red for < 0.
// Always shows sign (+/−) by default.
// ---------------------------------------------------------------------------
interface ChangeProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  format?: NumberFormat;
  decimals?: number;
  /** Default: true */
  showSign?: boolean;
}

const Change = React.forwardRef<HTMLSpanElement, ChangeProps>(
  (
    {
      value,
      format = "percent",
      decimals = 2,
      showSign = true,
      className,
      ...props
    },
    ref,
  ) => {
    const text = formatNumber(value, format, decimals, undefined, showSign);
    const isNegative = value < 0;

    return (
      <span
        ref={ref}
        className={cn(
          "font-mono tabular-nums",
          "text-num-small",
          isNegative ? "text-num-negative" : "text-num-positive",
          className,
        )}
        {...props}
      >
        {text}
      </span>
    );
  },
);
Change.displayName = "DSChange";

// ---------------------------------------------------------------------------
// Quote
//
// Canonical layout for a single ticker: symbol → price → (abs change + % change).
// This is the reference component; use it whenever displaying a ticker quote.
// ---------------------------------------------------------------------------
interface QuoteProps extends React.HTMLAttributes<HTMLDivElement> {
  symbol?: string;
  price: number;
  change: number;
  changePercent: number;
  size?: NumberSize;
}

const Quote = React.forwardRef<HTMLDivElement, QuoteProps>(
  (
    { symbol, price, change, changePercent, size = "default", className, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-ds-1", className)}
      {...props}
    >
      {symbol && (
        <span className="font-sans text-[11px] tracking-[1px] uppercase text-ink-tertiary">
          {symbol}
        </span>
      )}
      <Price value={price} size={size} format="currency" />
      <div className="flex gap-ds-2">
        <Change value={change} format="plain" decimals={2} />
        <Change value={changePercent} format="percent" decimals={2} />
      </div>
    </div>
  ),
);
Quote.displayName = "DSQuote";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export { Price, Change, Quote };
export type { PriceProps, ChangeProps, QuoteProps };
