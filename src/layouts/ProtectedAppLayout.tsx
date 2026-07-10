// src/layouts/ProtectedAppLayout.tsx
import { useState, type CSSProperties } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
import { SubNav } from '@/components/SubNav';
import { Sidebar } from '@/components/Sidebar';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { MentorViewBanner } from '@/components/MentorViewBanner';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useMentorView } from '@/contexts/MentorViewContext';
import { PortfolioProvider } from '@/contexts/PortfolioContext';
import ComplianceFooterBar from '@/components/ComplianceFooterBar';
import { MarketStatusBadge } from '@/components/ai-arena/MarketStatusBadge';
import { cn } from '@/lib/utils';
import { AssetSelectorProvider } from '@/contexts/AssetSelectorContext';
import { ProductDrawerProvider } from '@/contexts/ProductDrawerContext';
import { ProductDrawer } from '@/components/ProductDrawer';
import SpotlightTour from '@/components/onboarding/SpotlightTour';
import WelcomeIntro from '@/components/onboarding/WelcomeIntro';
import { useOAuthReturnRedirect } from '@/hooks/useOAuthReturnRedirect';
import { usePostCheckoutSync } from '@/hooks/usePostCheckoutSync';
import { useJournalDemoMode } from '@/hooks/useJournalDemoMode';
import { DemoBanner } from '@/components/journal/DemoBanner';
import { DemoSyncOverlay } from '@/components/journal/DemoSyncOverlay';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { isFreePreviewJournalPath } from '@/contexts/JournalPreviewContext';
import { isMarketsBlocked, isMarketsResearchPath } from '@/lib/marketsAccess';

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
  '/app/automation', // Automation has its own internal sidebar
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
// Trading Arena is a full-screen workstation with its own top bar.
const HIDE_CHROME_ROUTES = [
  '/app/admin',
  '/app/trading-arena', // Trading Arena: full-screen, renders own top bar
  '/app/reports',       // FINO Reports: full-screen report shell, renders own close/nav chrome
];

export const ProtectedAppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { isImpersonating } = useImpersonation();
  const { isMentorView } = useMentorView();
  const { hasBetaAccess, isLoading: isAdminLoading } = useAdminAuth();

  // Redirect after OAuth if the flow was started from a non-journal page
  // (e.g. the Trade Copier). When no key is set in sessionStorage this is a no-op.
  useOAuthReturnRedirect();

  // Keeps subscription/profile state (TopNav plan badge, JournalFeatureGate,
  // broker-sync gates) from going stale right after a Whop checkout — polls on
  // `?payment=success` return and on tab focus/visible when a checkout was
  // started in another tab. No-op when neither condition applies.
  usePostCheckoutSync();

  const { isDemo: isJournalDemo } = useJournalDemoMode();

  // JournalFeatureGate (mounted inside the route tree) already renders its
  // own "Preview" banner for free-tier users on the gated journal pages
  // (Shadow / Revenge Radar). This layout sits ABOVE the route tree, so it
  // can't read JournalPreviewContext — fall back to a path + tier check.
  // Default to isSubLoading === true meaning "don't suppress" so the
  // DemoBanner never flickers away while tier is still resolving.
  const { isFreeJournal, isLoading: isSubLoading } = useSubscription();
  const suppressDemoBannerForGatedPreview =
    !isSubLoading && isFreeJournal && isFreePreviewJournalPath(location.pathname);

  // Each top banner (admin impersonation / mentor view) is a fixed 52px bar.
  // In-flow chrome (TopNav/SubNav/main) is already pushed by each banner's
  // spacer, but the position:fixed Sidebar is not — so expose the combined
  // banner height as a CSS var the Sidebar reads to offset its top/height.
  const bannerOffset = (isImpersonating ? 52 : 0) + (isMentorView ? 52 : 0);
  const shellStyle = { '--app-banner-offset': `${bannerOffset}px` } as CSSProperties;

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
  // These AI Arena pages render their own market-status badge inside the page
  // header (swapped with the Fino Explains panel), so suppress the global fixed one.
  const selfBadgeAiRoutes = [
    '/app/ai/stock-analyzer',
    '/app/ai/sector-analyzer',
    '/app/ai/macro-analyzer',
    '/app/ai/options-intelligence',
    '/app/ai/flow-scanner',
    '/app/ai/top-5',
  ];
  const showMarketStatus =
    location.pathname.startsWith('/app/ai/') &&
    !selfBadgeAiRoutes.some((r) => location.pathname.startsWith(r));

  // Journal pages manage their own page container (max-w + px) — adding the
  // global sidebar gap there would double-pad them.
  const isJournalRoute = location.pathname.startsWith('/app/journal');

  // Markets research area is beta-only (single switch: MARKETS_BETA_ONLY in
  // src/lib/marketsAccess.ts). A non-beta user hitting any Markets URL directly
  // is redirected to Upgrade. Guard on !isAdminLoading so a beta user is never
  // wrongly bounced while their access status is still resolving. Flipping the
  // switch off makes isMarketsBlocked() return false → this becomes a no-op.
  if (!isAdminLoading && isMarketsResearchPath(location.pathname) && isMarketsBlocked(hasBetaAccess)) {
    return <Navigate to="/app/upgrade" replace />;
  }

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
      <div className="finotaur-app-shell flex min-h-screen w-full flex-col" style={shellStyle}>
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
              {isJournalRoute && isJournalDemo && !suppressDemoBannerForGatedPreview && <DemoBanner />}
              <Outlet />
            </div>
          </main>
        </div>
        {isJournalRoute && isJournalDemo && !suppressDemoBannerForGatedPreview && <DemoSyncOverlay />}
        <ComplianceFooterBar />
        {/* Spotlight onboarding tour — renders null when tour is not active */}
        <SpotlightTour />
        {/* Welcome intro overlay — renders null unless the welcome flag is set */}
        <WelcomeIntro />
      </div>
    </PortfolioProvider>
    </ProductDrawerProvider>
    </AssetSelectorProvider>
  );
};

// Default export required by the finotaur:assert-lazy-default-exports build guard
// (this module is loaded via lazy() in App.tsx).
export default ProtectedAppLayout;
