// src/hooks/useDomain.ts
// =====================================================
// Phase 1 nav redesign: product-aware domain detection.
//
// The new top-level products are:
//   markets | ai | war-zone | top-secret | journal | copy-trade
//
// Any /app/{stocks,crypto,futures,forex,commodities,macro,all-markets}/*
// URL now maps to the 'markets' product so the Product Drawer highlights
// Markets and the Markets sidebar renders.
//
// ORDERING RULE: War Zone (/app/all-markets/warzone) is a sub-path of
// /app/all-markets which is a Markets prefix. War Zone must be checked first.
// =====================================================

import { useLocation } from 'react-router-dom';
import { domains } from '@/constants/nav';
import { isMarketsPath } from '@/constants/markets';

const WAR_ZONE_PATHS   = ['/app/all-markets/warzone', '/app/warzone'];
const TOP_SECRET_PATHS = ['/app/top-secret'];
// The Floor (/app/floor/*) is a sub-area of the Journal product, surfaced via
// the beta-gated "The Floor" tab in the Journal subNav. Without this mapping
// productId would be extracted as 'floor' (the 2nd path segment), miss the
// 'mentorship'-keyed domain, fall back to 'markets', and wrongly highlight the
// Markets/Stocks nav while on The Floor. Map it to 'journal' so the Journal
// subNav (with "The Floor" active) renders instead.
const FLOOR_PATHS = ['/app/floor'];

export const useDomain = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // ------------------------------------------------------------------
  // 1. Determine the top-level product id
  //    Order matters: more-specific paths before broad prefixes.
  // ------------------------------------------------------------------
  let productId: string;

  if (WAR_ZONE_PATHS.some((p) => pathname.startsWith(p))) {
    productId = 'war-zone';
  } else if (TOP_SECRET_PATHS.some((p) => pathname.startsWith(p))) {
    productId = 'top-secret';
  } else if (FLOOR_PATHS.some((p) => pathname.startsWith(p))) {
    // The Floor lives under the Journal product (see FLOOR_PATHS note above).
    productId = 'journal';
  } else if (isMarketsPath(pathname)) {
    // /app/etfs is now part of the Markets product (MARKETS_PATH_PREFIXES includes /app/etfs).
    productId = 'markets';
  } else {
    // Extract from /app/<segment>/… for other products (ai, journal, copy-trade…)
    const pathParts = pathname.split('/').filter(Boolean);
    productId = pathParts[1] ?? 'markets';
  }

  // ------------------------------------------------------------------
  // 2. Resolve the domain object from our nav config
  // ------------------------------------------------------------------
  const activeDomain = domains[productId] ?? domains['markets'];

  return {
    activeDomain,
    domainId: activeDomain.id,
    isActive: (path: string) => pathname === path,
  };
};
