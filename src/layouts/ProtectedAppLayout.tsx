// src/layouts/ProtectedAppLayout.tsx
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
import { SubNav } from '@/components/SubNav';
import { Sidebar } from '@/components/Sidebar';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { PortfolioProvider } from '@/contexts/PortfolioContext';
import ComplianceFooterBar from '@/components/ComplianceFooterBar';
import { MarketStatusBadge } from '@/components/ai-arena/MarketStatusBadge';
import { cn } from '@/lib/utils';

// 🔥 דפים שמוצגים בלי Sidebar (רק Top Nav + Sub Nav)
const NO_SIDEBAR_ROUTES = [
  '/app/all-markets/warzone',
  '/app/top-secret',
  '/app/all-markets/chart',
  '/app/all-markets/top-secret',
  '/app/settings',
];

export const ProtectedAppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  
  // 🔥 בדיקה אם הדף הנוכחי צריך להיות בלי Sidebar
  const hideSidebar = NO_SIDEBAR_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  // Show "Market Closed — Showing Friday's Close" badge across AI Arena routes
  // when US equities are closed. Auto-hides during regular session.
  const showMarketStatus = location.pathname.startsWith('/app/ai/');

  return (
    <PortfolioProvider>
      <div className="finotaur-app-shell flex min-h-screen w-full flex-col">
        <ImpersonationBanner />
        {showMarketStatus && <MarketStatusBadge />}
        <TopNav />
        <SubNav />
        <div className="flex flex-1">
          {!hideSidebar && <Sidebar isOpen={sidebarOpen} />}
          <main
            className={cn(
              'flex-1 overflow-auto transition-[margin-left] duration-300 ease-in-out',
              !hideSidebar && 'md:ml-[var(--finotaur-sidebar-width,14rem)]'
            )}
          >
            <div className={hideSidebar ? "p-0" : "w-full"}>
              <Outlet />
            </div>
          </main>
        </div>
        <ComplianceFooterBar />
      </div>
    </PortfolioProvider>
  );
};
