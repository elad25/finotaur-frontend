// src/pages/app/admin/components/AdminSidebar.tsx
// ============================================
// Sidebar for Admin CRM shell.
// Phase 1: all 12 tabs are clickable. 7 mount existing pages,
// 4 are rich "planned" placeholders, 1 is the custom Overview.
// `planned` tabs get a "soon" badge to flag they aren't full features yet.
// ============================================

import { NavLink } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { ADMIN_TABS, type AdminTab } from '../config/adminTabs';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  isSuperAdmin: boolean;
}

/**
 * Nav content shared between the desktop <aside> and the mobile drawer.
 * `onNavigate` lets the mobile drawer close itself when a tab is tapped.
 */
export function AdminSidebarNav({
  isSuperAdmin,
  onNavigate,
}: AdminSidebarProps & { onNavigate?: () => void }) {
  const visible = ADMIN_TABS.filter(
    (tab) => !tab.superAdminOnly || isSuperAdmin
  );

  return (
    <>
      <div className="px-5 py-5 border-b border-gray-800">
        <a
          href="/app/home"
          className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-[#D4AF37] transition-colors mb-3"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to FINOTAUR
        </a>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#D4AF37]/15 flex items-center justify-center">
            <span className="text-[#D4AF37] font-bold text-sm">CRM</span>
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm leading-tight">
              Admin CRM
            </h2>
            <p className="text-gray-500 text-[10px] leading-tight mt-0.5">
              Phase 2 · Standalone
            </p>
          </div>
        </div>
      </div>

      <nav className="px-2 py-3 space-y-0.5">
        {visible.map((tab) => (
          <SidebarTab key={tab.id} tab={tab} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="px-4 py-3 mt-2 border-t border-gray-800">
        <p className="text-[10px] text-gray-600 leading-relaxed">
          <span className="text-[#D4AF37]">soon</span> tags mark modules still
          in planning — content is a preview of upcoming features.
        </p>
      </div>
    </>
  );
}

export function AdminSidebar({ isSuperAdmin }: AdminSidebarProps) {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-[#0E0E0E] border-r border-gray-800 min-h-screen">
      <AdminSidebarNav isSuperAdmin={isSuperAdmin} />
    </aside>
  );
}

function SidebarTab({
  tab,
  onNavigate,
}: {
  tab: AdminTab;
  onNavigate?: () => void;
}) {
  const { label, path, icon: Icon, description, planned } = tab;

  return (
    <NavLink
      to={path}
      end={path === '/app/admin'}
      title={description}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
          'text-[13px]',
          isActive
            ? 'bg-[#D4AF37]/15 text-[#D4AF37] font-medium'
            : 'text-gray-300 hover:bg-white/5 hover:text-white'
        )
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {planned && (
        <span
          className={cn(
            'flex items-center gap-0.5 px-1.5 py-0.5 rounded',
            'text-[9px] uppercase tracking-wide font-semibold',
            'bg-[#D4AF37]/10 text-[#D4AF37]'
          )}
        >
          <Sparkles className="w-2.5 h-2.5" />
          soon
        </span>
      )}
    </NavLink>
  );
}
