// src/pages/app/admin/tabs/tools/ToolsHub.tsx
// Landing for /app/admin/tools. Three live panels (Audit, Impersonation,
// Maintenance link). Each panel reads from existing adminService RPCs —
// no schema changes.

import { Link } from 'react-router-dom';
import { Wrench, ArrowRight, ShieldAlert, Eye, Database } from 'lucide-react';
import { AuditLogPanel } from './AuditLogPanel';
import { ImpersonationPanel } from './ImpersonationPanel';

export function ToolsHub() {
  return (
    <div className="p-8 space-y-6">
      <header className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
          <Wrench className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Tools</h1>
          <p className="text-sm text-gray-400 mt-1">
            Audit log, live impersonation sessions, and platform maintenance —
            super-admin only.
          </p>
        </div>
      </header>

      {/* Quick-link cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickLink
          to="/app/admin/tools/maintenance"
          icon={Database}
          label="Maintenance"
          hint="Cron status, cache busts, manual jobs"
        />
        <QuickLink
          to="/app/admin/tools/audit"
          icon={ShieldAlert}
          label="Full audit log"
          hint="Filter, paginate, drill into a single user"
          disabled
        />
        <QuickLink
          to="/app/admin/tools/impersonation"
          icon={Eye}
          label="All impersonation"
          hint="Historical sessions + audit trail"
          disabled
        />
      </section>

      {/* Live panels */}
      <AuditLogPanel />
      <ImpersonationPanel />
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
  hint,
  disabled = false,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  const inner = (
    <div
      className={`bg-[#111111] border border-gray-800 rounded-lg p-4
                  flex items-start gap-3
                  ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-[#D4AF37]/30'}`}
    >
      <div className="w-9 h-9 rounded-md bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#D4AF37]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-white text-sm font-medium">{label}</span>
          {!disabled && (
            <ArrowRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          )}
          {disabled && (
            <span className="text-[9px] uppercase tracking-wide text-gray-600 shrink-0">
              soon
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
      </div>
    </div>
  );

  return disabled ? inner : <Link to={to}>{inner}</Link>;
}
