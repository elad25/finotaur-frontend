// src/components/MarketsSidebar.tsx
// =====================================================
// Markets sidebar — asset-aware function list
// Rendered by Sidebar.tsx when the active product is 'markets'.
// Shows only functions that have a route for the selected asset.
// =====================================================

import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAssetSelector } from '@/contexts/AssetSelectorContext';
import { getMarketsItemsForAsset } from '@/constants/markets';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

const itemBase =
  'relative group flex w-full min-h-[46px] items-center rounded-lg border-l-2 border-transparent py-2.5 text-[13px] font-medium leading-snug transition-all duration-200';
const itemExpanded  = 'gap-3 px-3';
const itemCollapsed = 'justify-center px-2';
const itemActive    = 'border-gold-bright bg-gold-primary/20 text-gold-bright shadow-[0_0_22px_rgba(201,166,70,0.22)]';
const itemInactive  = 'text-ink-secondary hover:bg-gold-primary/10 hover:text-gold-bright';
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

  // All functions available for the current asset
  const items = getMarketsItemsForAsset(selectedAsset);

  // Markets product is tier-gated (same as legacy asset domains)
  // hasBetaAccess unlocks — mirrors existing pattern in Sidebar.tsx
  const domainLocked = !hasBetaAccess;

  return (
    <>
      {items.map((fn) => {
        const route = fn.routes[selectedAsset];
        if (!route) return null; // type safety (already filtered above)

        const Icon = fn.icon;
        const active = location.pathname === route || location.pathname.startsWith(route + '/');
        const locked = domainLocked;

        return (
          <button
            key={fn.id}
            onClick={() => {
              if (locked) return;
              navigate(route);
            }}
            disabled={locked}
            title={!isExpanded ? fn.label : undefined}
            className={cn(
              itemBase,
              isExpanded ? itemExpanded : itemCollapsed,
              locked
                ? 'text-gray-500 cursor-not-allowed opacity-60'
                : active
                  ? itemActive
                  : itemInactive
            )}
          >
            <Icon className={cn(iconClass)} />

            {isExpanded && (
              <>
                <span className={labelClass}>{fn.label}</span>
                {locked && <Lock className="h-3.5 w-3.5 text-gray-500" />}
              </>
            )}

            {/* Collapsed rail hover tooltip */}
            {!isExpanded && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-base-900 border border-gray-600 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg pointer-events-none">
                {fn.label}
                {locked && <Lock className="inline h-3 w-3 ml-1 text-gray-500" />}
              </div>
            )}
          </button>
        );
      })}
    </>
  );
}

export default MarketsSidebar;
