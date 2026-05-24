// src/layouts/CopilotStandaloneLayout.tsx
// Standalone shell for /copilot/* — no TopNav, no SubNav, just Sidebar + content.
// User intent: CO PILOT opens in a separate browser tab so it feels like its
// own product surface, while sharing auth + Supabase state via localStorage.
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { PortfolioProvider } from '@/contexts/PortfolioContext';
import ComplianceFooterBar from '@/components/ComplianceFooterBar';

export const CopilotStandaloneLayout = () => {
  const [sidebarOpen] = useState(true);
  return (
    <PortfolioProvider>
      <div className="finotaur-app-shell flex min-h-screen w-full flex-col">
        <ImpersonationBanner />
        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} />
          <main className="flex-1 overflow-auto transition-[margin-left] duration-300 ease-in-out md:ml-[var(--finotaur-sidebar-width,14rem)]">
            <div className="w-full">
              <Outlet />
            </div>
          </main>
        </div>
        <ComplianceFooterBar />
      </div>
    </PortfolioProvider>
  );
};
