// src/components/compliance/PriceGate.tsx
// =====================================================
// COMPLIANCE PRICE-GATE — convenience wrapper
// =====================================================
// This is a thin ergonomic wrapper around the CANONICAL market-data gate
// (`useMarketGate` + the `MARKET_DATA_LICENSED` flag in constants/nav).
// It exists ONLY to make it easy to wrap a JSX subtree. There is exactly one
// source of truth for the gate decision: MARKET_DATA_LICENSED.
//
// Provides:
//   usePriceGate()  — re-export of the canonical gate decision { gated, isAdmin }
//   PriceGate       — wraps content; non-admin sees the canonical
//                     LicensedDataPlaceholder, admin sees content + AdminGateBadge
//   GatedLockBadge  — tiny inline lock icon for nav / sidebar indicators
//
// To turn the whole gate OFF (e.g. once a redistribution license is in place),
// flip MARKET_DATA_LICENSED to true in src/constants/nav.ts — nothing here.
// =====================================================

import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useMarketGate, type MarketGateResult } from '@/hooks/useMarketGate';
import { LicensedDataPlaceholder } from '@/components/markets/LicensedDataPlaceholder';
import { AdminGateBadge } from '@/components/markets/AdminGateBadge';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Hook — delegates to the canonical market gate
// ---------------------------------------------------------------------------

/**
 * Returns the canonical gate decision { gated, isAdmin }.
 *   gated  = MARKET_DATA_LICENSED is false AND the user is not admin.
 *   isAdmin = current user has admin access (always sees the data).
 */
export function usePriceGate(): MarketGateResult {
  return useMarketGate();
}

// ---------------------------------------------------------------------------
// PriceGate component
// ---------------------------------------------------------------------------

interface PriceGateProps {
  children: ReactNode;
  /**
   * Optional min-height so the placeholder fills the same space as the gated
   * widget (avoids layout jump).
   */
  minHeight?: number | string;
  className?: string;
  /**
   * @deprecated Kept for call-site compatibility. The canonical placeholder
   * copy ("Live market data & charts coming soon") is always used so the gate
   * looks consistent across the app.
   */
  title?: string;
  /** @deprecated Kept for call-site compatibility. See `title`. */
  description?: string;
}

/**
 * Wraps raw-Polygon-price content.
 *
 * - gated (non-admin, unlicensed) → renders the canonical LicensedDataPlaceholder.
 * - admin / licensed              → renders children; when still gated for the
 *   public (i.e. admin bypass), overlays the canonical AdminGateBadge
 *   ("Hidden from public") so the admin can tell at a glance.
 */
export function PriceGate({ children, minHeight, className }: PriceGateProps) {
  const { gated, isAdmin } = useMarketGate();

  // Non-admin + unlicensed → canonical placeholder
  if (gated) {
    return <LicensedDataPlaceholder minHeight={minHeight} />;
  }

  // Admin sees the data but with a "hidden from public" indicator.
  return (
    <div className={cn('relative', className)}>
      {isAdmin && <AdminGateBadge />}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GatedLockBadge — tiny inline lock for nav / sidebar use
// ---------------------------------------------------------------------------

interface GatedLockBadgeProps {
  className?: string;
}

/**
 * A small inline lock icon indicating a nav item is price-gated.
 * Matches the h-3.5 w-3.5 text-gray-500 styling used by the Sidebar for
 * locked items.
 */
export function GatedLockBadge({ className }: GatedLockBadgeProps) {
  return (
    <Lock
      className={cn('h-3.5 w-3.5 text-gray-500', className)}
      aria-label="Price gated"
      title="Price gated"
    />
  );
}
