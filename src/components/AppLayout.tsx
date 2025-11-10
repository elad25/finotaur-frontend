import React from "react";
import { TopNav } from "@/components/TopNav";
import { SubNav } from "@/components/SubNav";
import SideMenu from "@/components/SideMenu";
import { Outlet } from "react-router-dom";
import { NavProvider } from "@/state/NavContext";
import { TrialWarningBanner } from "@/components/subscription/TrialWarningBanner";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

const AppLayout: React.FC = () => {
  return (
    <div 
      className="min-h-screen text-[#F4F4F4]"
      style={{ 
        background: 'radial-gradient(circle at top, #0A0A0A 0%, #121212 100%)'
      }}
    >
      <style>{`
        /* Hide scrollbar but keep functionality */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Smooth transitions */
        * {
          transition-property: background-color, border-color, color, fill, stroke;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 200ms;
        }
      `}</style>
      
      <NavProvider initial="all-markets">
        {/* 🎭 IMPERSONATION BANNER - MUST BE FIRST! */}
        <ImpersonationBanner />
        
        <TopNav />
        {/* ✅ Banner התראה - מופיע בין TopNav ל-SubNav */}
        <TrialWarningBanner />
        <SubNav />
        <div className="max-w-screen-2xl mx-auto flex">
          <SideMenu />
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </NavProvider>
    </div>
  );
};

export default AppLayout;