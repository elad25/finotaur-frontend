// src/pages/app/admin/AdminCRMShell.tsx
// ============================================
// Main shell for the unified Admin CRM.
//
// Phase 0 — Overview tab (real content, custom built).
// Phase 1 — mounts existing scattered admin pages as tabs:
//   /app/admin/users          → journal/admin/Users
//   /app/admin/users/:userId  → journal/admin/UserDetails
//   /app/admin/analytics      → journal/admin/Analytics
//   /app/admin/analytics/top-traders → journal/admin/TopTraders
//   /app/admin/billing        → journal/admin/Subscribers
//   /app/admin/billing/cancellations → journal/admin/Cancellations
//   /app/admin/communication  → journal/admin/NewsletterAdmin
//   /app/admin/communication/subscribers → journal/admin/NewsletterSub
//   /app/admin/affiliates/*   → journal/admin/Affiliate + affiliate/*
//   /app/admin/support        → all-markets/admin/Supporttickets
//   /app/admin/support/ai-drafts → all-markets/admin/SupportAiDrafts
//   /app/admin/tools          → journal/admin/maintenance
//
// Rich placeholders (Phase 2-5 planned features):
//   /app/admin/leads          — lead scoring + funnel
//   /app/admin/onboarding     — activation funnel
//   /app/admin/integrations   — Whop / Resend / Slack health
//   /app/admin/executive      — forecasting / anomaly detection
// ============================================

import { Suspense, useState } from 'react';
import { lazy } from '@/lib/lazyWithRetry';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { SkeletonTable } from '@/components/ds/Skeleton';
import { cn } from '@/lib/utils';
import { AdminSidebar, AdminSidebarNav } from './components/AdminSidebar';
import { findTabByPath } from './config/adminTabs';
import { OverviewTab } from './tabs/OverviewTab';
import { LeadsPlaceholder } from './tabs/LeadsPlaceholder';
import { OnboardingPlaceholder } from './tabs/OnboardingPlaceholder';
import { IntegrationsPlaceholder } from './tabs/IntegrationsPlaceholder';
import { ExecutivePlaceholder } from './tabs/ExecutivePlaceholder';
import { ToolsHub } from './tabs/tools/ToolsHub';
import { HealthRiskPanel } from './tabs/tools/HealthRiskPanel';
import { BulkActions } from './tabs/tools/BulkActions';
import { GDPRTools } from './tabs/tools/GDPRTools';
import { AIUsageTab } from './tabs/AIUsageTab';
import { AICommandCenterTab } from './tabs/AICommandCenterTab';
import { CustomerVoiceTab } from './tabs/CustomerVoiceTab';
import { FounderCockpitTab } from './tabs/FounderCockpitTab';
import { GrowthTab } from './tabs/GrowthTab';
import { AttributionTab } from './tabs/AttributionTab';
import SeoAnalyticsPage from './SeoAnalyticsPage';
import { AnnouncementsAdmin } from './tabs/AnnouncementsAdmin';

// Mounted existing admin pages — lazy so they don't bloat the Overview chunk.
const Users = lazy(() => import('@/pages/app/journal/admin/Users'));
const UserDetails = lazy(() => import('@/pages/app/journal/admin/UserDetails'));
const Analytics = lazy(() => import('@/pages/app/journal/admin/Analytics'));
const TopTraders = lazy(() => import('@/pages/app/journal/admin/TopTraders'));
const Subscribers = lazy(() => import('@/pages/app/journal/admin/Subscribers'));
const Cancellations = lazy(() => import('@/pages/app/journal/admin/Cancellations'));
const NewsletterAdmin = lazy(() => import('@/pages/app/journal/admin/NewsletterAdmin'));
const NewsletterSub = lazy(() => import('@/pages/app/journal/admin/NewsletterSub'));
const Affiliate = lazy(() => import('@/pages/app/journal/admin/Affiliate'));
const AffiliateAdminOverview = lazy(
  () => import('@/pages/app/journal/admin/affiliate/AffiliateAdminOverview')
);
const AffiliateAdminReferrals = lazy(
  () => import('@/pages/app/journal/admin/affiliate/AffiliateAdminReferrals')
);
const AffiliateAdminList = lazy(
  () => import('@/pages/app/journal/admin/affiliate/AffiliateAdminList')
);
const AffiliateAdminApplications = lazy(
  () => import('@/pages/app/journal/admin/affiliate/AffiliateAdminApplications')
);
const AffiliateAdminPayouts = lazy(
  () => import('@/pages/app/journal/admin/affiliate/AffiliateAdminPayouts')
);
const Supporttickets = lazy(
  () => import('@/pages/app/all-markets/admin/Supporttickets')
);
const SupportAiDrafts = lazy(
  () => import('@/pages/app/all-markets/admin/SupportAiDrafts')
);
const Maintenance = lazy(
  () => import('@/pages/app/journal/admin/maintenance/page')
);

function TabFallback() {
  return (
    <div className="p-8">
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<TabFallback />}>{children}</Suspense>;
}

export function AdminCRMShell() {
  const { isSuperAdmin } = useAdminAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentTab = findTabByPath(location.pathname);

  return (
    <div className="flex bg-[#080808] min-h-screen">
      <AdminSidebar isSuperAdmin={isSuperAdmin} />

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-50"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile slide-in drawer */}
      <div
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] h-full',
          'bg-[#0E0E0E] border-r border-gray-800 overflow-y-auto',
          'transition-transform duration-200 ease-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-end px-2 pt-2">
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2.5 text-gray-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <AdminSidebarNav
          isSuperAdmin={isSuperAdmin}
          onNavigate={() => setDrawerOpen(false)}
        />
      </div>

      <div className="flex-1 min-w-0">
        {/* Mobile header bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 border-b border-gray-800 bg-[#0E0E0E] min-h-[56px]">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2.5 -ml-2.5 text-gray-300 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-white font-semibold text-sm truncate">
            {currentTab?.label ?? 'Admin CRM'}
          </span>
        </div>

        <Routes>
          {/* Cockpit is the default landing — index redirects here */}
          <Route index element={<Navigate to="cockpit" replace />} />

          {/* Overview (Phase 0 — custom built) */}
          <Route path="overview" element={<OverviewTab />} />

          {/* Users & Profiles */}
          <Route path="users" element={<Lazy><Users /></Lazy>} />
          <Route path="users/:userId" element={<Lazy><UserDetails /></Lazy>} />

          {/* Usage Analytics */}
          <Route path="analytics" element={<Lazy><Analytics /></Lazy>} />
          <Route path="analytics/top-traders" element={<Lazy><TopTraders /></Lazy>} />
          <Route path="analytics/ai-usage" element={<AIUsageTab />} />

          {/* SEO Analytics */}
          <Route path="seo" element={<SeoAnalyticsPage />} />

          {/* Billing & Revenue */}
          <Route path="billing" element={<Lazy><Subscribers /></Lazy>} />
          <Route path="billing/cancellations" element={<Lazy><Cancellations /></Lazy>} />

          {/* Communication */}
          <Route path="communication" element={<Lazy><NewsletterAdmin /></Lazy>} />
          <Route
            path="communication/subscribers"
            element={<Lazy><NewsletterSub /></Lazy>}
          />

          {/* Announcements */}
          <Route path="announcements" element={<AnnouncementsAdmin />} />

          {/* Leads & Funnel (planned) */}
          <Route path="leads" element={<LeadsPlaceholder />} />

          {/* Onboarding (planned) */}
          <Route path="onboarding" element={<OnboardingPlaceholder />} />

          {/* Affiliates */}
          <Route path="affiliates" element={<Lazy><Affiliate /></Lazy>} />
          <Route
            path="affiliates/overview"
            element={<Lazy><AffiliateAdminOverview /></Lazy>}
          />
          <Route
            path="affiliates/referrals"
            element={<Lazy><AffiliateAdminReferrals /></Lazy>}
          />
          <Route
            path="affiliates/list"
            element={<Lazy><AffiliateAdminList /></Lazy>}
          />
          <Route
            path="affiliates/applications"
            element={<Lazy><AffiliateAdminApplications /></Lazy>}
          />
          <Route
            path="affiliates/payouts"
            element={<Lazy><AffiliateAdminPayouts /></Lazy>}
          />

          {/* Support & Tickets */}
          <Route path="support" element={<Lazy><Supporttickets /></Lazy>} />
          <Route
            path="support/ai-drafts"
            element={<Lazy><SupportAiDrafts /></Lazy>}
          />

          {/* Integrations (planned) */}
          <Route path="integrations" element={<IntegrationsPlaceholder />} />

          {/* Admin Tools (super-admin) — hub + sub-routes */}
          <Route path="tools" element={<ToolsHub />} />
          <Route path="tools/maintenance" element={<Lazy><Maintenance /></Lazy>} />
          <Route path="tools/health" element={<HealthRiskPanel />} />
          <Route path="tools/bulk" element={<BulkActions />} />
          <Route path="tools/gdpr" element={<GDPRTools />} />

          {/* Founder Cockpit */}
          <Route path="cockpit" element={<FounderCockpitTab />} />

          {/* Customer Voice */}
          <Route path="voice" element={<CustomerVoiceTab />} />

          {/* Growth Intelligence */}
          <Route path="growth" element={<GrowthTab />} />

          {/* Ad Attribution */}
          <Route path="attribution" element={<AttributionTab />} />

          {/* AI Command Center */}
          <Route path="ai" element={<AICommandCenterTab />} />

          {/* Executive Dashboard (planned) */}
          <Route path="executive" element={<ExecutivePlaceholder />} />

          <Route path="*" element={<Navigate to="/app/admin/cockpit" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default AdminCRMShell;
