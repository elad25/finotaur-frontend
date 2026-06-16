// src/components/MarketsAssetTabs.tsx
// =====================================================
// Markets Asset Tab Row — compact horizontal tabs
// rendered inside SubNav when the active product is Markets.
//
// Replaces the AssetSelector dropdown from the top bar.
// Clicking a tab: sets selectedAsset + navigates to the FIRST
// available function route for that asset (getMarketsItemsForAsset).
// Tabs with comingSoon=true show a subtle "Soon" badge.
// SSR-safe: no window/document access.
// =====================================================

import { useNavigate } from 'react-router-dom';
import { ASSET_CLASSES, getMarketsItemsForAsset } from '@/constants/markets';
import { useAssetSelector } from '@/contexts/AssetSelectorContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

export function MarketsAssetTabs() {
  const navigate = useNavigate();
  const { selectedAsset, setSelectedAsset } = useAssetSelector();
  const { hasBetaAccess } = useAdminAuth();

  const handleSelect = (assetId: (typeof ASSET_CLASSES)[number]['id']) => {
    setSelectedAsset(assetId);
    // Per-asset landing override: some assets' first function (Overview) is
    // Early-Access-gated, so we send the user to an open page instead.
    const ASSET_LANDING_OVERRIDE: Partial<Record<typeof assetId, string>> = {
      stocks: '/app/stocks/reports',   // Overview is gated → land on Reports (Company Research Center).
    };
    // Navigate to the override, else the first function route available for the
    // chosen asset. Falls back to /app/<asset>/overview if none mapped yet.
    const items = getMarketsItemsForAsset(assetId);
    const firstRoute =
      ASSET_LANDING_OVERRIDE[assetId] ??
      items[0]?.routes[assetId] ??
      `/app/${assetId}/overview`;
    navigate(firstRoute);
  };

  return (
    <div
      className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide"
      role="tablist"
      aria-label="Asset class"
    >
      {ASSET_CLASSES.map((asset) => {
        const Icon = asset.icon;
        const isActive = asset.id === selectedAsset;

        return (
          <button
            key={asset.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => { if (asset.comingSoon) return; handleSelect(asset.id); }}
            className={cn(
              'flex-shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'text-[#C9A646] bg-[#C9A646]/05'
                : asset.comingSoon
                  ? 'text-[#A0A0A0] opacity-50 cursor-not-allowed'
                  : 'text-[#A0A0A0] hover:bg-[#141414] hover:text-[#F4F4F4]',
            )}
            style={
              isActive
                ? {
                    borderBottom: '2px solid #C9A646',
                    boxShadow: '0 0 6px rgba(201,166,70,0.08)',
                  }
                : {}
            }
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span>{asset.label}</span>
            {asset.comingSoon && hasBetaAccess && (
              <>
                <Lock
                  className="h-2.5 w-2.5 flex-shrink-0"
                  style={{ color: 'rgba(201,166,70,0.55)' }}
                  aria-label="Coming soon"
                  title="Coming soon"
                />
                <span
                  className="ml-0.5 rounded px-1 py-px text-[9px] font-semibold leading-none tracking-wide"
                  style={{
                    color: 'rgba(201,166,70,0.65)',
                    background: 'rgba(201,166,70,0.08)',
                    border: '1px solid rgba(201,166,70,0.18)',
                  }}
                >
                  Soon
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default MarketsAssetTabs;
