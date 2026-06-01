// src/components/MarketsSidebar.tsx
// =====================================================
// Markets sidebar — FIXED function list, asset-aware routing.
// Rendered by Sidebar.tsx when the active product is 'markets'.
//
// v2 (nav redesign): always shows the FULL ordered function list.
// Functions with no route for the currently selected asset are
// rendered DISABLED (greyed, non-clickable) rather than hidden —
// so the list stays stable as the user switches assets.
// =====================================================

import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAssetSelector } from '@/contexts/AssetSelectorContext';
import { MARKET_FUNCTIONS, type MarketFunction } from '@/constants/markets';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

// ---------------------------------------------------------------------------
// The canonical ordered list of sidebar functions (per spec).
// Only IDs that exist in MARKET_FUNCTIONS are listed here.
// ---------------------------------------------------------------------------
const SIDEBAR_FUNCTION_ORDER: MarketFunction[] = [
  'overview',
  'screener',
  'movers',
  'news',
  'watchlists',
  'reports',
  'fundamentals',
  'sectors',
  'catalysts',
  'upgrades',
  'valuation',
  'insider',
  'earnings',
];

// ---------------------------------------------------------------------------
// Style constants (unchanged from v1)
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
  const { hasBetaAccess } = useAdminAuth();
  const { selectedAsset } = useAssetSelector();

  // Markets product is tier-gated; hasBetaAccess unlocks
  const domainLocked = !hasBetaAccess;

  // Build a lookup map from MARKET_FUNCTIONS by id for O(1) access
  const fnMap = new Map(MARKET_FUNCTIONS.map((fn) => [fn.id, fn]));

  return (
    <>
      {SIDEBAR_FUNCTION_ORDER.map((fnId) => {
        const fn = fnMap.get(fnId);
        if (!fn) return null;

        const Icon = fn.icon;
        const route = fn.routes[selectedAsset];

        // No route for this asset+function combo → render disabled
        const noRoute = route === undefined;
        const locked  = domainLocked || noRoute;

        const active = !noRoute && !domainLocked &&
          (location.pathname === route || location.pathname.startsWith(route + '/'));

        return (
          <button
            key={fn.id}
            onClick={() => {
              if (locked) return;
              navigate(route!);
            }}
            disabled={locked}
            title={!isExpanded ? fn.label : undefined}
            className={cn(
              itemBase,
              isExpanded ? itemExpanded : itemCollapsed,
              locked
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
                {domainLocked && <Lock className="h-3.5 w-3.5 text-gray-500" />}
                {!domainLocked && noRoute && (
                  <span className="ml-auto text-[10px] font-medium text-gray-600 tracking-wide">
                    N/A
                  </span>
                )}
              </>
            )}

            {/* Collapsed rail hover tooltip */}
            {!isExpanded && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-base-900 border border-gray-600 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg pointer-events-none">
                {fn.label}
                {domainLocked && <Lock className="inline h-3 w-3 ml-1 text-gray-500" />}
                {!domainLocked && noRoute && (
                  <span className="ml-1 text-gray-600">(N/A)</span>
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
