// src/components/admin/AdminLayout.tsx
// ============================================
// Admin Layout Wrapper.
// Auto-detects whether it is being rendered inside the unified Admin CRM
// shell (any /app/admin/* route) or standalone (legacy direct access).
//
// Standalone: full screen with sticky page header.
// Embedded in CRM shell: no nested min-h-screen, no sticky header — just
// a slim breadcrumb that mirrors the CRM sub-nav style so the experience
// feels like one continuous tab rather than a pop-up pane.
// ============================================

import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ChevronRight } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  showBackButton?: boolean;
  /**
   * Force embedded mode regardless of pathname. Default behavior auto-detects
   * via useLocation — set explicitly only when the parent route prefix is not
   * /app/admin but the page should still render in embedded mode.
   */
  embedded?: boolean;
}

export default function AdminLayout({
  children,
  title,
  description,
  showBackButton = false,
  embedded,
}: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Embedded mode auto-activates inside the unified CRM shell.
  const isEmbedded = embedded ?? location.pathname.startsWith('/app/admin');

  if (isEmbedded) {
    return (
      <div className="bg-[#0A0A0A]">
        {/* Slim breadcrumb header — sits inside the CRM shell content area. */}
        <div className="border-b border-gray-800 px-4 md:px-8 py-4">
          <nav className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <Link
              to="/app/admin"
              className="hover:text-[#D4AF37] transition-colors flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              Admin CRM
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-300">{title}</span>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-white">{title}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{description}</p>
            </div>
            {showBackButton && (
              <Link
                to="/app/admin"
                className="text-xs text-gray-400 hover:text-[#D4AF37] flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to CRM
              </Link>
            )}
          </div>
        </div>

        <div className="p-4 md:p-8">{children}</div>
      </div>
    );
  }

  // Standalone — legacy direct-access experience preserved.
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="border-b border-gray-800 bg-[#0A0A0A] sticky top-0 z-10">
        <div className="px-4 md:px-8 py-6">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{title}</h1>
              <p className="text-gray-400">{description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8">{children}</div>
    </div>
  );
}
