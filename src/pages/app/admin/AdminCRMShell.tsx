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

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { AdminSidebar } from './components/AdminSidebar';
import { OverviewTab } from './tabs/OverviewTab';
import { LeadsPlaceholder } from './tabs/LeadsPlaceholder';
import { OnboardingPlaceholder } from './tabs/OnboardingPlaceholder';
import { IntegrationsPlaceholder } from './tabs/IntegrationsPlaceholder';
import { ExecutivePlaceholder } from './tabs/ExecutivePlaceholder';
import { ToolsHub } from './tabs/tools/ToolsHub';
import { HealthRiskPanel } from './tabs/tools/HealthRiskPanel';
import { BulkActions } from './tabs/tools/BulkActions';

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
      <LoadingSkeleton lines={8} />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<TabFallback />}>{children}</Suspense>;
}

export function AdminCRMShell() {
  const { isSuperAdmin } = useAdminAuth();

  return (
    <div className="flex bg-[#080808] min-h-[calc(100vh-120px)]">
      <AdminSidebar isSuperAdmin={isSuperAdmin} />

      <div className="flex-1 min-w-0">
        <Routes>
          {/* Overview (Phase 0 — custom built) */}
          <Route index element={<OverviewTab />} />
          <Route path="overview" element={<Navigate to="/app/admin" replace />} />

          {/* Users & Profiles */}
          <Route path="users" element={<Lazy><Users /></Lazy>} />
          <Route path="users/:userId" element={<Lazy><UserDetails /></Lazy>} />

          {/* Usage Analytics */}
          <Route path="analytics" element={<Lazy><Analytics /></Lazy>} />
          <Route path="analytics/top-traders" element={<Lazy><TopTraders /></Lazy>} />

          {/* Billing & Revenue */}
          <Route path="billing" element={<Lazy><Subscribers /></Lazy>} />
          <Route path="billing/cancellations" element={<Lazy><Cancellations /></Lazy>} />

          {/* Communication */}
          <Route path="communication" element={<Lazy><NewsletterAdmin /></Lazy>} />
          <Route
            path="communication/subscribers"
            element={<Lazy><NewsletterSub /></Lazy>}
          />

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

          {/* Executive Dashboard (planned) */}
          <Route path="executive" element={<ExecutivePlaceholder />} />

          <Route path="*" element={<Navigate to="/app/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default AdminCRMShell;
