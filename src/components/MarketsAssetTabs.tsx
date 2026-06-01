// src/components/MarketsAssetTabs.tsx
// =====================================================
// Markets Asset Tab Row — compact horizontal tabs
// rendered inside SubNav when the active product is Markets.
//
// Replaces the AssetSelector dropdown from the top bar.
// Clicking a tab: sets selectedAsset + navigates to that
// asset's overview page (reuses AssetSelector onSelect logic).
// SSR-safe: no window/document access.
// =====================================================

import { useNavigate } from 'react-router-dom';
import { ASSET_CLASSES } from '@/constants/markets';
import { useAssetSelector } from '@/contexts/AssetSelectorContext';
import { cn } from '@/lib/utils';

export function MarketsAssetTabs() {
  const navigate = useNavigate();
  const { selectedAsset, setSelectedAsset } = useAssetSelector();

  const handleSelect = (assetId: (typeof ASSET_CLASSES)[number]['id']) => {
    setSelectedAsset(assetId);
    navigate(`/app/${assetId}/overview`);
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
            onClick={() => handleSelect(asset.id)}
            className={cn(
              'flex-shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'text-[#C9A646] bg-[#C9A646]/05'
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
          </button>
        );
      })}
    </div>
  );
}

export default MarketsAssetTabs;
