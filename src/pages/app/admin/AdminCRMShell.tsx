// src/pages/app/admin/AdminCRMShell.tsx
// ============================================
// Main shell for the unified Admin CRM.
// Holds the left sidebar, content area, and nested routes for tabs.
// Phase 0: only Overview renders real content; later tabs show
// ComingSoonTab placeholders to keep URLs stable as they roll in.
// ============================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminSidebar } from './components/AdminSidebar';
import { OverviewTab } from './tabs/OverviewTab';
import { ComingSoonTab } from './tabs/ComingSoonTab';
import { ADMIN_TABS } from './config/adminTabs';

export function AdminCRMShell() {
  const { isSuperAdmin } = useAdminAuth();

  return (
    <div className="flex bg-[#080808] min-h-[calc(100vh-120px)]">
      <AdminSidebar isSuperAdmin={isSuperAdmin} />

      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<OverviewTab />} />
          <Route path="overview" element={<Navigate to="/app/admin" replace />} />

          {ADMIN_TABS.filter((t) => t.phase !== 0).map((tab) => {
            const subPath = tab.path.replace(/^\/app\/admin\//, '');
            return (
              <Route
                key={tab.id}
                path={subPath}
                element={<ComingSoonTab tab={tab} />}
              />
            );
          })}

          <Route path="*" element={<Navigate to="/app/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default AdminCRMShell;
