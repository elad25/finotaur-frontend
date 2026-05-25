// src/pages/app/admin/config/adminTabs.ts
// ============================================
// Admin CRM tab definitions — single source of truth for sidebar
// Phase 0 ships Overview only; remaining tabs are placeholders
// gated by `phase` so the sidebar can render "Coming in Phase N".
// ============================================

import {
  LayoutDashboard,
  Users,
  Activity,
  CreditCard,
  Mail,
  Rocket,
  Handshake,
  Sprout,
  Ticket,
  Plug,
  Crown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface AdminTab {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  phase: 0 | 1 | 2 | 3 | 4 | 5;
  enabled: boolean;
  superAdminOnly?: boolean;
  description?: string;
}

export const ADMIN_TABS: AdminTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    path: '/app/admin',
    icon: LayoutDashboard,
    phase: 0,
    enabled: true,
    description: 'KPIs, growth, revenue at a glance',
  },
  {
    id: 'users',
    label: 'Users & Profiles',
    path: '/app/admin/users',
    icon: Users,
    phase: 1,
    enabled: false,
    description: 'User management, profiles, tags, notes, health score',
  },
  {
    id: 'analytics',
    label: 'Usage Analytics',
    path: '/app/admin/analytics',
    icon: Activity,
    phase: 1,
    enabled: false,
    description: 'Per-user activity, feature usage, AI consumption',
  },
  {
    id: 'billing',
    label: 'Billing & Revenue',
    path: '/app/admin/billing',
    icon: CreditCard,
    phase: 1,
    enabled: false,
    description: 'Whop sync, MRR/ARR, cohort, dunning',
  },
  {
    id: 'communication',
    label: 'Communication',
    path: '/app/admin/communication',
    icon: Mail,
    phase: 2,
    enabled: false,
    description: 'Email templates, drip campaigns, broadcasts',
  },
  {
    id: 'leads',
    label: 'Leads & Funnel',
    path: '/app/admin/leads',
    icon: Sprout,
    phase: 2,
    enabled: false,
    description: 'Lead scoring, source attribution, conversion funnel',
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    path: '/app/admin/onboarding',
    icon: Rocket,
    phase: 3,
    enabled: false,
    description: 'Activation milestones, time-to-value, funnel drop-off',
  },
  {
    id: 'affiliates',
    label: 'Affiliates',
    path: '/app/admin/affiliates',
    icon: Handshake,
    phase: 3,
    enabled: false,
    description: 'Partner tracking, commission, referral analytics',
  },
  {
    id: 'support',
    label: 'Support & Tickets',
    path: '/app/admin/support',
    icon: Ticket,
    phase: 4,
    enabled: false,
    description: 'Unified inbox, ticket system, response metrics',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    path: '/app/admin/integrations',
    icon: Plug,
    phase: 5,
    enabled: false,
    description: 'Whop, Resend, Slack, Discord, WhatsApp',
  },
  {
    id: 'tools',
    label: 'Admin Tools',
    path: '/app/admin/tools',
    icon: Crown,
    phase: 5,
    enabled: false,
    superAdminOnly: true,
    description: 'Audit log, impersonation, bulk actions, RBAC, GDPR',
  },
  {
    id: 'executive',
    label: 'Executive Dashboard',
    path: '/app/admin/executive',
    icon: TrendingUp,
    phase: 5,
    enabled: false,
    description: 'Forecasting, anomaly detection, KPI alerts',
  },
];

export function findTabByPath(pathname: string): AdminTab | undefined {
  const exact = ADMIN_TABS.find((t) => t.path === pathname);
  if (exact) return exact;
  return ADMIN_TABS.find(
    (t) => t.path !== '/app/admin' && pathname.startsWith(t.path)
  );
}
