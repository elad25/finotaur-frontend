// src/layouts/ProtectedAppLayout.tsx
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
import { SubNav } from '@/components/SubNav';
import { Sidebar } from '@/components/Sidebar';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { PortfolioProvider } from '@/contexts/PortfolioContext';
import '@/styles/app.css';  // App-only styles (custom scrollbars, ticker, sidebar). Landing's import graph excluded.

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

  return (
    <PortfolioProvider>
      <div className="flex min-h-screen w-full flex-col">
        <ImpersonationBanner />
        <TopNav />
        <SubNav />
        <div className="flex flex-1">
          {!hideSidebar && <Sidebar isOpen={sidebarOpen} />}
          <main className="flex-1 overflow-auto">
            <div className={hideSidebar ? "p-0" : "w-full"}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </PortfolioProvider>
  );
};