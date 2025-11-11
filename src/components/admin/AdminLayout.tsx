// src/components/admin/AdminLayout.tsx
// ============================================
// Admin Layout Wrapper - Consistent Tabs
// WITH SUBSCRIBERS TAB
// ============================================

import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Gift,
  Trophy,
  CreditCard,
  ArrowLeft
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  showBackButton?: boolean;
}

type TabId = 'dashboard' | 'users' | 'analytics' | 'subscribers' | 'affiliate' | 'top-traders';

interface Tab {
  id: TabId;
  label: string;
  icon: any;
  path: string;
}

const ADMIN_TABS: Tab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/app/journal/admin',
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    path: '/app/journal/admin/users',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/app/journal/admin/analytics',
  },
  {
    id: 'subscribers',
    label: 'Subscribers',
    icon: CreditCard,
    path: '/app/journal/admin/subscribers',
  },
  {
    id: 'affiliate',
    label: 'Affiliate',
    icon: Gift,
    path: '/app/journal/admin/affiliate',
  },
  {
    id: 'top-traders',
    label: 'Top Traders',
    icon: Trophy,
    path: '/app/journal/admin/top-traders',
  },
];

export default function AdminLayout({ 
  children, 
  title, 
  description,
  showBackButton = false 
}: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = (): TabId => {
    const path = location.pathname;
    if (path.includes('/users')) return 'users';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/subscribers')) return 'subscribers';
    if (path.includes('/affiliate')) return 'affiliate';
    if (path.includes('/top-traders')) return 'top-traders';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0A0A0A] sticky top-0 z-10">
        <div className="px-8 py-6">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          <p className="text-gray-400">{description}</p>
        </div>

        {/* Tabs Navigation */}
        <div className="px-8">
          <div className="flex gap-1 border-b border-gray-800">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`px-6 py-3 font-medium transition-all relative flex items-center gap-2 ${
                    isActive
                      ? 'text-[#D4AF37] bg-[#D4AF37]/5'
                      : 'text-gray-400 hover:text-white hover:bg-[#111111]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {children}
      </div>
    </div>
  );
}