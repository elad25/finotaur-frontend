// src/components/AssetSelector.tsx
// =====================================================
// Markets Asset Selector — Top Bar control
// Only rendered when the active product is Markets.
// =====================================================

import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { ASSET_CLASSES } from '@/constants/markets';
import { useAssetSelector } from '@/contexts/AssetSelectorContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AssetSelector() {
  const navigate = useNavigate();
  const { selectedAsset, setSelectedAsset } = useAssetSelector();

  const currentMeta = ASSET_CLASSES.find((a) => a.id === selectedAsset) ?? ASSET_CLASSES[0];
  const Icon = currentMeta.icon;

  const handleSelect = (assetId: (typeof ASSET_CLASSES)[number]['id']) => {
    setSelectedAsset(assetId);
    // Navigate to the Overview page for the chosen asset so the URL stays
    // consistent with the selection.
    navigate(`/app/${assetId}/overview`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A646]/40"
          style={{ color: '#C9A646', border: '1px solid rgba(201,166,70,0.25)' }}
          aria-label={`Selected asset: ${currentMeta.label}. Click to change.`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{currentMeta.label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-44 bg-[#0F0F0F] border border-[#C9A646]/20 z-[150]"
      >
        {ASSET_CLASSES.map((asset) => {
          const AssetIcon = asset.icon;
          const active = asset.id === selectedAsset;
          return (
            <DropdownMenuItem
              key={asset.id}
              onClick={() => handleSelect(asset.id)}
              className={`flex items-center gap-2 cursor-pointer ${
                active
                  ? 'bg-[#C9A646]/10 text-[#C9A646] focus:bg-[#C9A646]/10 focus:text-[#C9A646]'
                  : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-[#F4F4F4] focus:bg-[#1A1A1A] focus:text-[#F4F4F4]'
              }`}
            >
              <AssetIcon className="h-4 w-4 shrink-0" />
              <span>{asset.label}</span>
              {active && (
                <span
                  className="ml-auto h-1.5 w-1.5 rounded-full"
                  style={{ background: '#C9A646' }}
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AssetSelector;
