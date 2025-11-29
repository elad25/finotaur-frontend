// src/pages/app/journal/admin/Affiliate.tsx
// ============================================
// FIXED: Admin Affiliate Page with ALL 5 Tabs
// Overview, Applications, Affiliates List, Referrals, Payouts
// ============================================

import { useState, lazy, Suspense } from 'react';
import { 
  LayoutDashboard,
  FileText,
  Users,
  UserCheck,
  Wallet,
  Loader2
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// Lazy load tab components
const AffiliateAdminOverview = lazy(() => import('./affiliate/AffiliateAdminOverview'));
const AffiliateAdminApplications = lazy(() => import('./affiliate/AffiliateAdminApplications'));
const AffiliateAdminList = lazy(() => import('./affiliate/AffiliateAdminList'));
const AffiliateAdminReferrals = lazy(() => import('./affiliate/AffiliateAdminReferrals'));
const AffiliateAdminPayouts = lazy(() => import('./affiliate/AffiliateAdminPayouts'));

type TabId = 'overview' | 'applications' | 'affiliates' | 'referrals' | 'payouts';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

export default function AdminAffiliate() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [pendingApplications, setPendingApplications] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'applications', label: 'Applications', icon: FileText, badge: pendingApplications },
    { id: 'affiliates', label: 'Affiliates', icon: Users },
    { id: 'referrals', label: 'Referrals', icon: UserCheck, badge: pendingVerifications },
    { id: 'payouts', label: 'Payouts', icon: Wallet },
  ];

  const TabLoader = () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
    </div>
  );

  return (
    <AdminLayout
      title="Affiliate Program"
      description="Manage affiliates, applications, referrals, and payouts"
    >
      {/* Tabs Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-gray-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all
                ${isActive
                  ? 'bg-[#111111] text-white border-b-2 border-[#D4AF37] -mb-[2px]'
                  : 'text-gray-400 hover:text-white hover:bg-[#111111]/50'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`
                  px-1.5 py-0.5 text-xs font-bold rounded-full
                  ${isActive 
                    ? 'bg-[#D4AF37] text-black' 
                    : 'bg-yellow-500/20 text-yellow-400'
                  }
                `}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <Suspense fallback={<TabLoader />}>
        {activeTab === 'overview' && <AffiliateAdminOverview />}
        {activeTab === 'applications' && (
          <AffiliateAdminApplications onPendingCountChange={setPendingApplications} />
        )}
        {activeTab === 'affiliates' && <AffiliateAdminList />}
        {activeTab === 'referrals' && (
          <AffiliateAdminReferrals onPendingVerificationsChange={setPendingVerifications} />
        )}
        {activeTab === 'payouts' && <AffiliateAdminPayouts />}
      </Suspense>
    </AdminLayout>
  );
}