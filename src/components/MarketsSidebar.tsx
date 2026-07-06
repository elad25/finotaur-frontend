// src/components/MarketsSidebar.tsx
// =====================================================
// Markets sidebar — asset-aware function list.
// Rendered by Sidebar.tsx when the active product is 'markets'.
//
// v3 (Options + ETF): replaced the fixed SIDEBAR_FUNCTION_ORDER
// with getMarketsItemsForAsset(selectedAsset) so each asset shows
// ONLY its own functions. No disabled clutter, no N/A items.
//
// Stocks still yields exactly the same 13 functions as before:
//   overview, screener, movers, news, watchlists, reports,
//   fundamentals, sectors, catalysts, upgrades, valuation, insider, earnings.
// (These are the MARKET_FUNCTIONS entries whose routes include 'stocks'.)
// =====================================================

import { useNavigate, useLocation } from 'react-router-dom';
import { useAssetSelector } from '@/contexts/AssetSelectorContext';
import { getMarketsItemsForAsset } from '@/constants/markets';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { GatedLockBadge } from '@/components/compliance/PriceGate';

// ---------------------------------------------------------------------------
// Style constants (unchanged)
// ---------------------------------------------------------------------------
const itemBase =
  'relative group flex w-full min-h-[46px] items-center rounded-lg border-l-2 border-transparent py-2.5 text-[13px] font-medium leading-snug transition-all duration-200';
const itemExpanded  = 'gap-3 px-3';
const itemCollapsed = 'justify-center px-2';
const itemActive    = 'border-gold-bright bg-gold-primary/20 text-gold-bright shadow-[0_0_22px_rgba(201,166,70,0.22)]';
const itemInactive  = 'text-ink-secondary hover:bg-gold-primary/10 hover:text-gold-bright';
const itemDisabled  = 'text-gray-600 cursor-not-allowed opacity-50';
const iconClass     = 'h-5 w-5 flex-shrink-0';
const labelClass    = 'flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis leading-snug';

interface MarketsSidebarProps {
  isExpanded: boolean;
}

export function MarketsSidebar({ isExpanded }: MarketsSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedAsset } = useAssetSelector();
  const { hasBetaAccess } = useAdminAuth();

  // Research Lab data is free; specific non-data items (Reports, Catalysts,
  // Macro Models, Major Events, My Portfolio) carry fn.locked = closed to public.
  // Only the functions that have a route for the selected asset.
  const items = getMarketsItemsForAsset(selectedAsset);

  return (
    <>
      {items.map((fn) => {
        const Icon = fn.icon;
        const route = fn.routes[selectedAsset]!; // always defined — getMarketsItemsForAsset filters these

        const itemLocked = fn.locked === true || (fn.lockedAssets?.includes(selectedAsset) ?? false); // closed to the public (paywall)
        const blocked = !hasBetaAccess;   // whole Markets research area is beta-only (admin/beta bypass)
        // priceGated badge: applies to all assets unless restricted to a specific set.
        // Crypto/forex/macro overview are non-Polygon → not price-gated → no lock badge.
        const itemPriceGated = fn.priceGated === true && (fn.priceGatedAssets ? fn.priceGatedAssets.includes(selectedAsset) : true);

        const active = !blocked &&
          (location.pathname === route || location.pathname.startsWith(route + '/'));

        const handleClick = () => {
          if (blocked) return;
          if (fn.newWindow) {
            // Open in a new browser tab (the page renders as a fullscreen workstation).
            window.open(route, '_blank');
            return;
          }
          navigate(route);
        };

        return (
          <button
            key={fn.id}
            onClick={handleClick}
            disabled={blocked}
            title={!isExpanded ? fn.label : undefined}
            className={cn(
              itemBase,
              isExpanded ? itemExpanded : itemCollapsed,
              blocked
                ? itemDisabled
                : active
                  ? itemActive
                  : itemInactive,
            )}
          >
            <Icon className={cn(iconClass)} />

            {isExpanded && (
              <>
                <span className={labelClass}>{fn.label}</span>
                {itemLocked && hasBetaAccess && (
                  <Lock
                    className="h-2.5 w-2.5 flex-shrink-0"
                    style={{ color: 'rgba(201,166,70,0.55)' }}
                    title="Closed to the public"
                    aria-label="Closed to the public"
                  />
                )}
                {itemPriceGated && hasBetaAccess && (
                  <GatedLockBadge />
                )}
              </>
            )}

            {/* Collapsed rail hover tooltip */}
            {!isExpanded && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-base-900 border border-gray-600 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg pointer-events-none">
                {fn.label}
                {itemLocked && hasBetaAccess && (
                  <Lock
                    className="inline h-2.5 w-2.5 ml-1 flex-shrink-0"
                    style={{ color: 'rgba(201,166,70,0.55)' }}
                    title="Closed to the public"
                  />
                )}
                {itemPriceGated && hasBetaAccess && (
                  <Lock
                    className="inline h-3.5 w-3.5 ml-1 flex-shrink-0 text-gray-500"
                    title="Price gated"
                  />
                )}
              </div>
            )}
          </button>
        );
      })}
    </>
  );
}

export default MarketsSidebar;
