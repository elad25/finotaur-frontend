// src/layouts/ProtectedAppLayout.tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
import { SubNav } from '@/components/SubNav';
import { Sidebar } from '@/components/Sidebar';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
// 🔥 הסרנו את OnboardingGuard - ProtectedRoute כבר עושה את הבדיקה

export const ProtectedAppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <ImpersonationBanner />
      <TopNav />
      <SubNav />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} />
        <main className="flex-1 overflow-auto">
          <div className="container max-w-7xl p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};