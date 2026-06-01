// src/contexts/AssetSelectorContext.tsx
// =====================================================
// Asset Selector — persists the selected Markets asset class
// across route changes within the Markets product.
// =====================================================
// Storage: localStorage key 'finotaur-markets-asset'
// Precedence: URL wins over stored value when entering Markets from a
//             per-asset URL (e.g. /app/stocks/*  → select 'stocks').
// =====================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { type AssetClass, assetFromPathname, isMarketsPath } from '@/constants/markets';

const STORAGE_KEY = 'finotaur-markets-asset';
const DEFAULT_ASSET: AssetClass = 'stocks';

interface AssetSelectorContextValue {
  selectedAsset: AssetClass;
  setSelectedAsset: (asset: AssetClass) => void;
}

const AssetSelectorContext = createContext<AssetSelectorContextValue | null>(null);

export function AssetSelectorProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const [selectedAsset, setSelectedAssetState] = useState<AssetClass>(() => {
    // Seed from URL if we're already on a Markets path, otherwise from storage.
    if (isMarketsPath(location.pathname)) {
      return assetFromPathname(location.pathname);
    }
    // SSR-safe: localStorage only exists in the browser (this initializer runs
    // during render, including server-side render / prerender in Node).
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY) as AssetClass | null;
      if (stored && ['stocks', 'crypto', 'futures', 'forex', 'commodities', 'macro'].includes(stored)) {
        return stored;
      }
    }
    return DEFAULT_ASSET;
  });

  // When the URL changes to a Markets path, sync the asset from the URL.
  // This handles the case where the user clicks a direct link to /app/crypto/heatmap
  // while the Markets product is already active — the selector should snap to Crypto.
  useEffect(() => {
    if (isMarketsPath(location.pathname)) {
      const fromUrl = assetFromPathname(location.pathname);
      setSelectedAssetState(fromUrl);
      localStorage.setItem(STORAGE_KEY, fromUrl);
    }
  }, [location.pathname]);

  const setSelectedAsset = useCallback((asset: AssetClass) => {
    setSelectedAssetState(asset);
    localStorage.setItem(STORAGE_KEY, asset);
  }, []);

  return (
    <AssetSelectorContext.Provider value={{ selectedAsset, setSelectedAsset }}>
      {children}
    </AssetSelectorContext.Provider>
  );
}

export function useAssetSelector(): AssetSelectorContextValue {
  const ctx = useContext(AssetSelectorContext);
  if (!ctx) {
    throw new Error('useAssetSelector must be used inside <AssetSelectorProvider>');
  }
  return ctx;
}
