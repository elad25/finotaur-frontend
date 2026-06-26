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
// The Floor (/app/floor/*) maps to the 'floor' domain so its own sidebar
// renders. Without an explicit check, productId would be extracted as 'floor'
// from the URL segment and would find the domain correctly — but we keep the
// explicit list for safety and documentation parity with other special paths.
const FLOOR_PATHS  = ['/app/floor'];
// Mentor (/app/mentor/*) maps to the 'mentor' domain so its own sidebar renders.
const MENTOR_PATHS = ['/app/mentor'];

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
    // The Floor has its own 'floor' domain with its own sidebar.
    productId = 'floor';
  } else if (MENTOR_PATHS.some((p) => pathname.startsWith(p))) {
    // Mentor Rooms/Coach has its own 'mentor' domain with its own sidebar.
    productId = 'mentor';
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
