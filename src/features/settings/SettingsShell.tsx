// src/features/settings/SettingsShell.tsx
// The outer settings shell: sidebar nav (NavLink-based) + Outlet for nested routes.
// Also handles legacy ?tab= deep-links by redirecting to the new route paths.

import { useEffect } from "react";
import { NavLink, Outlet, useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Settings, CreditCard, Bell, Shield, Activity, Handshake } from "lucide-react";
import { SettingsProvider } from "./SettingsProvider";
import { FEATURES } from "@/config/features";

// Sidebar nav items mapped to new nested route paths
const navItems = [
  { path: "account",       label: "Account",       icon: Settings   },
  { path: "billing",       label: "Subscription",  icon: CreditCard },
  { path: "notifications", label: "Notifications", icon: Bell       },
  { path: "security",      label: "Security",      icon: Shield     },
  { path: "the-floor",     label: "The Floor",     icon: Activity   },
  // Gated on the feature flag so rollback hides it (AFFILIATE_TRACKING off until Stripe migration).
  ...(FEATURES.AFFILIATE_TRACKING
    ? [{ path: "affiliates", label: "Affiliates", icon: Handshake }] as const
    : []),
] as const;

// Legacy ?tab= query param values → new path segments
const TAB_REDIRECT: Record<string, string> = {
  general:       "account",
  billing:       "billing",
  notifications: "notifications",
  security:      "security",
};

const SettingsShell = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Support legacy deep-links: ?tab=general → /app/settings/account etc.
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TAB_REDIRECT[tab]) {
      navigate(`/app/settings/${TAB_REDIRECT[tab]}`, { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <SettingsProvider>
      <div className="max-w-7xl mx-auto py-8 px-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-44 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {navItems.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) => cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                    isActive
                      ? "bg-[#C9A646]/10 text-[#C9A646] font-medium"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn("w-4 h-4", isActive ? "text-[#C9A646]" : "text-zinc-500")} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </aside>

          {/* Content — rendered by the matched nested route */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SettingsProvider>
  );
};

export default SettingsShell;
