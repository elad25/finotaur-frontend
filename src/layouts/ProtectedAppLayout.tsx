// src/layouts/ProtectedAppLayout.tsx
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
import { SubNav } from '@/components/SubNav';
import { Sidebar } from '@/components/Sidebar';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { MentorViewBanner } from '@/components/MentorViewBanner';
import { PortfolioProvider } from '@/contexts/PortfolioContext';
import ComplianceFooterBar from '@/components/ComplianceFooterBar';
import { MarketStatusBadge } from '@/components/ai-arena/MarketStatusBadge';
import { cn } from '@/lib/utils';
import { AssetSelectorProvider } from '@/contexts/AssetSelectorContext';
import { ProductDrawerProvider } from '@/contexts/ProductDrawerContext';
import { ProductDrawer } from '@/components/ProductDrawer';
import SpotlightTour from '@/components/onboarding/SpotlightTour';

// 🔥 דפים שמוצגים בלי Sidebar (רק Top Nav + Sub Nav)
const NO_SIDEBAR_ROUTES = [
  // Phase 1: War Zone and Top Secret now have their own sidebars — removed from this list.
  // '/app/top-secret',           // Top Secret has sidebar now
  '/app/top-secret',           // Top Secret renders like War Zone: no product sidebar
  '/app/all-markets/warzone',  // War Zone renders chrome-free (no product sidebar)
  '/app/warzone',              // legacy War Zone path alias
  '/app/home',              // Home hub renders full-width (no product sidebar needed)
  '/app/all-markets/chart',
  '/app/all-markets/top-secret',
  '/app/all-markets/top-secret-admin',
  '/app/settings',
  // Admin CRM ships its own internal sidebar (12 tabs), so the global one
  // would collide.
  '/app/admin',
];

// Home hub is standalone — no product SubNav (it is its own surface).
const NO_SUBNAV_ROUTES = [
  '/app/home',
  '/app/all-markets/warzone',  // War Zone renders chrome-free (no Latest/Compose sub-nav)
  '/app/warzone',              // legacy War Zone path alias
  '/app/top-secret',           // Top Secret renders like War Zone: no product sub-nav
  '/app/all-markets/top-secret',
  '/app/all-markets/top-secret-admin',
  '/app/ai',                   // AI Arena uses the left sidebar as its only section navigation
];

// 🔥 Standalone surfaces — no TopNav, no SubNav, no footer.
// Admin CRM is its own admin app; the marketing/trading chrome is noise
// inside it and the user is reaching it via a new-tab open from SubNav.
const HIDE_CHROME_ROUTES = [
  '/app/admin',
];

export const ProtectedAppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // 🔥 בדיקה אם הדף הנוכחי צריך להיות בלי Sidebar
  const hideSidebar = NO_SIDEBAR_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  const hideChrome = HIDE_CHROME_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  const hideSubNav = NO_SUBNAV_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  // Show "Market Closed — Showing Friday's Close" badge across AI Arena routes
  // when US equities are closed. Auto-hides during regular session.
  // Sector Analyzer renders its own market-status badge inside the page header
  // (swapped with the Fino Explains panel), so suppress the global fixed one there.
  const showMarketStatus =
    location.pathname.startsWith('/app/ai/') &&
    location.pathname !== '/app/ai/sector-analyzer';

  // Journal pages manage their own page container (max-w + px) — adding the
  // global sidebar gap there would double-pad them.
  const isJournalRoute = location.pathname.startsWith('/app/journal');

  if (hideChrome) {
    // Standalone surface — only the impersonation banner is preserved so an
    // admin in an impersonation session still sees the warning. Everything
    // else (TopNav, SubNav, global Sidebar, ComplianceFooter) is intentionally
    // dropped.
    return (
      <PortfolioProvider>
        <div className="finotaur-app-shell flex min-h-screen w-full flex-col">
          <ImpersonationBanner />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </PortfolioProvider>
    );
  }

  return (
    <AssetSelectorProvider>
    <ProductDrawerProvider>
    <PortfolioProvider>
      <div className="finotaur-app-shell flex min-h-screen w-full flex-col">
        <ImpersonationBanner />
        <MentorViewBanner />
        {showMarketStatus && <MarketStatusBadge />}
        <TopNav />
        {!hideSubNav && <SubNav />}
        {/* Product Drawer — rendered at layout level so it overlays everything */}
        <ProductDrawer />
        <div className="flex flex-1">
          {!hideSidebar && <Sidebar isOpen={sidebarOpen} />}
          <main
            className={cn(
              'flex-1 overflow-auto transition-[margin-left] duration-300 ease-in-out',
              !hideSidebar && 'md:ml-[var(--finotaur-sidebar-width,14rem)]',
              !hideSidebar && !isJournalRoute && 'md:pl-4'
            )}
          >
            <div className={hideSidebar ? "p-0" : "w-full"}>
              <Outlet />
            </div>
          </main>
        </div>
        <ComplianceFooterBar />
        {/* Spotlight onboarding tour — renders null when tour is not active */}
        <SpotlightTour />
      </div>
    </PortfolioProvider>
    </ProductDrawerProvider>
    </AssetSelectorProvider>
  );
};

// Default export required by the finotaur:assert-lazy-default-exports build guard
// (this module is loaded via lazy() in App.tsx).
export default ProtectedAppLayout;
