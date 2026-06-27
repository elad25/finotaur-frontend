// src/features/automation/AutomationShell.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shell with sidebar nav (Risk / Copier / Agent) + <Outlet/>.
// Mirrors SettingsShell.tsx exactly (NavLink, sticky sidebar, Outlet in main).
// ─────────────────────────────────────────────────────────────────────────────

import { NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck, GitMerge, Monitor, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopierPremiumGate } from './components/CopierPremiumGate';

const navItems = [
  { path: 'install', label: 'Install',    icon: Download   },
  { path: 'risk',    label: 'Risk Rules', icon: ShieldCheck },
  { path: 'copier',  label: 'Copier',     icon: GitMerge   },
  { path: 'agent',   label: 'Agent',      icon: Monitor    },
] as const;

const AutomationShell = () => (
  <div className="max-w-7xl mx-auto py-8 px-6">
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-zinc-100">Automation</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Configure risk rules and copier routes. Execution runs through the FINOTAUR desktop agent — download and set it up from the Install tab.
      </p>
    </div>
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="w-44 shrink-0">
        <nav className="sticky top-24 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-[#C9A646]/10 text-[#C9A646] font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn('w-4 h-4', isActive ? 'text-[#C9A646]' : 'text-zinc-500')}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <CopierPremiumGate>
          <Outlet />
        </CopierPremiumGate>
      </main>
    </div>
  </div>
);

export default AutomationShell;
