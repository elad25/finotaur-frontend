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
import { CopilotPageHeader } from '@/pages/app/ai/copilot/components/CopilotPageHeader';
import { CopilotBackdrop } from '@/pages/app/ai/copilot/components/CopilotBackdrop';

export const CopilotStandaloneLayout = () => {
  const [sidebarOpen] = useState(true);
  return (
    <PortfolioProvider>
      <div className="finotaur-app-shell flex min-h-screen w-full flex-col bg-[#030302] text-ink-primary">
        <ImpersonationBanner />
        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} collapseMode="collapsed-default" />
          <main className="flex-1 overflow-auto transition-[margin-left] duration-300 ease-in-out md:ml-[var(--finotaur-sidebar-width,14rem)]">
            <div className="relative min-h-full overflow-hidden">
              <CopilotBackdrop />
              <div className="relative z-10 px-3 py-3 max-w-[1480px] mx-auto">
                <CopilotPageHeader />
                <Outlet />
              </div>
            </div>
          </main>
        </div>
        <ComplianceFooterBar />
      </div>
    </PortfolioProvider>
  );
};

// Default export required by the finotaur:assert-lazy-default-exports build guard
// (this module is loaded via lazy() in App.tsx).
export default CopilotStandaloneLayout;
