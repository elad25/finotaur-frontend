// src/pages/app/admin/config/adminTabs.ts
// ============================================
// Admin CRM tab definitions — single source of truth for sidebar.
//
// Phase 0 shipped Overview only.
// Phase 1 mounts the existing scattered admin pages under the CRM shell:
//   users / analytics / billing / communication / affiliates / support / tools
// The 4 tabs with no existing page get rich "in planning" placeholders.
// ============================================

import {
  LayoutDashboard,
  Users,
  CreditCard,
  Mail,
  Handshake,
  Ticket,
  Crown,
  Brain,
  Search,
  Sparkles,
  MessageSquare,
  Target,
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
  // When a tab proxies an existing page, this hints which one — for docs only.
  mountedFrom?: string;
  // For richer placeholders that explain what's planned.
  planned?: boolean;
}

export const ADMIN_TABS: AdminTab[] = [
  {
    id: 'cockpit',
    label: 'Founder Cockpit',
    path: '/app/admin/cockpit',
    icon: Target,
    phase: 2,
    enabled: true,
    description: 'AI advisor + all accumulated business data in one place',
  },
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
    enabled: true,
    description: 'User list, profiles, subscription state, ban / impersonate',
    mountedFrom: 'pages/app/journal/admin/Users.tsx',
  },
  // 'analytics' sidebar entry removed — Usage Analytics content folded into Overview.
  // Route /app/admin/analytics still exists in AdminCRMShell.tsx for deep links.
  {
    id: 'ai-usage',
    label: 'AI Consumption',
    path: '/app/admin/analytics/ai-usage',
    icon: Brain,
    phase: 2,
    enabled: true,
    description: 'Per-user AI usage leaderboard + per-tier cost averages',
  },
  {
    id: 'voice',
    label: 'Customer Voice',
    path: '/app/admin/voice',
    icon: MessageSquare,
    phase: 2,
    enabled: true,
    description: 'Product-feedback intelligence — requests, churn themes, bugs, pain points',
  },
  {
    id: 'seo',
    label: 'SEO',
    path: '/app/admin/seo',
    icon: Search,
    phase: 5,
    enabled: true,
    description: 'Organic traffic analytics for /research/* pages',
    planned: false,
  },
  {
    id: 'billing',
    label: 'Billing & Revenue',
    path: '/app/admin/billing',
    icon: CreditCard,
    phase: 1,
    enabled: true,
    description: 'Whop subscribers, cancellations, MRR/ARR detail',
    mountedFrom: 'pages/app/journal/admin/Subscribers.tsx',
  },
  {
    id: 'communication',
    label: 'Communication',
    path: '/app/admin/communication',
    icon: Mail,
    phase: 1,
    enabled: true,
    description: 'Newsletter admin, subscriber management, broadcasts',
    mountedFrom: 'pages/app/journal/admin/NewsletterAdmin.tsx',
  },
  // 'leads' and 'onboarding' sidebar entries removed — empty SOON placeholders.
  // Routes /app/admin/leads and /app/admin/onboarding still exist in AdminCRMShell.tsx.
  {
    id: 'affiliates',
    label: 'Affiliates',
    path: '/app/admin/affiliates',
    icon: Handshake,
    phase: 1,
    enabled: true,
    description: 'Partner tracking, applications, referrals, payouts',
    mountedFrom: 'pages/app/journal/admin/Affiliate.tsx (+ affiliate/*)',
  },
  {
    id: 'support',
    label: 'Support & Tickets',
    path: '/app/admin/support',
    icon: Ticket,
    phase: 1,
    enabled: true,
    description: 'Tickets, AI drafts, knowledge base',
    mountedFrom: 'pages/app/all-markets/admin/Supporttickets.tsx',
  },
  // 'integrations' sidebar entry removed — empty SOON placeholder.
  // Route /app/admin/integrations still exists in AdminCRMShell.tsx.
  {
    id: 'tools',
    label: 'Admin Tools',
    path: '/app/admin/tools',
    icon: Crown,
    phase: 1,
    enabled: true,
    superAdminOnly: true,
    description: 'Maintenance, audit log, impersonation sessions',
    mountedFrom: 'pages/app/journal/admin/maintenance/page.tsx',
  },
  {
    id: 'ai-command',
    label: 'AI Command Center',
    path: '/app/admin/ai',
    icon: Sparkles,
    phase: 2,
    enabled: true,
    description: 'AI-generated growth & retention recommendations — approve, dismiss, or snooze',
  },
  // 'executive' sidebar entry removed — forecast content folded into OverviewTab.
  // Route /app/admin/executive still exists in AdminCRMShell.tsx for deep links.
];

export function findTabByPath(pathname: string): AdminTab | undefined {
  const exact = ADMIN_TABS.find((t) => t.path === pathname);
  if (exact) return exact;

  // Longest-prefix wins so nested routes (e.g. /app/admin/analytics/ai-usage)
  // resolve to the most specific tab rather than the parent prefix.
  let best: AdminTab | undefined;
  for (const t of ADMIN_TABS) {
    if (t.path === '/app/admin') continue;
    if (!pathname.startsWith(t.path)) continue;
    if (!best || t.path.length > best.path.length) best = t;
  }
  return best;
}
