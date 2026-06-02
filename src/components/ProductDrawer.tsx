// src/components/ProductDrawer.tsx
// =====================================================
// Product Drawer — left-side slide-out listing all products.
// Opened by the ☰ hamburger button in TopNav.
// Rendered at layout level (ProtectedAppLayout / AppLayout).
//
// Uses vaul's Drawer with direction="left".
// SSR-safe: no window/document access; state in ProductDrawerContext.
// =====================================================

import { useNavigate } from 'react-router-dom';
import { X, Lock, Shield, Sparkles } from 'lucide-react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { useProductDrawer } from '@/contexts/ProductDrawerContext';
import { useDomain } from '@/hooks/useDomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { domains, domainOrder } from '@/constants/nav';
import { Wordmark } from '@/components/ds/Wordmark';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  Brain,
  Copy,
  Flame,
  FileText,
  BookOpen,
  Zap,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Per-product metadata: icon + one-line sublabel
// ---------------------------------------------------------------------------
const PRODUCT_META: Record<string, { icon: LucideIcon; sublabel: string }> = {
  markets:     { icon: TrendingUp, sublabel: 'Research Hub' },
  ai:          { icon: Brain,      sublabel: 'AI-Powered Tools' },
  copilot:     { icon: Copy,       sublabel: 'Your Portfolio AI' },
  'war-zone':  { icon: Flame,      sublabel: 'High Conviction Setups' },
  'top-secret':{ icon: FileText,   sublabel: 'Premium Research' },
  journal:     { icon: BookOpen,   sublabel: 'Track. Review. Improve.' },
  portfolio:   { icon: Briefcase,  sublabel: 'Manual portfolio & CSV import.' },
  'copy-trade':{ icon: Zap,        sublabel: 'Beta: Trade Copier' },
};

// ---------------------------------------------------------------------------
// ProductDrawer
// ---------------------------------------------------------------------------
export function ProductDrawer() {
  const { isOpen, close } = useProductDrawer();
  const { domainId } = useDomain();
  const { hasBetaAccess, isAdmin } = useAdminAuth();
  const navigate = useNavigate();

  const handleProductClick = (id: string) => {
    const domain = domains[id];
    if (!domain) return;

    // Gating: locked or beta domains require beta access
    if ((domain.locked || domain.beta) && !hasBetaAccess) return;

    const dest = domain.defaultPath ?? domain.subNav[0]?.path;
    if (dest) {
      navigate(dest);
    }
    close();
  };

  return (
    <DrawerPrimitive.Root
      open={isOpen}
      onOpenChange={(v) => { if (!v) close(); }}
      direction="left"
      // Disable body scale for left-side drawers (scale is a bottom-sheet affordance)
      shouldScaleBackground={false}
    >
      <DrawerPrimitive.Portal>
        {/* Overlay */}
        <DrawerPrimitive.Overlay
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px]"
        />

        {/* Panel */}
        <DrawerPrimitive.Content
          aria-label="Product navigation"
          className={cn(
            'fixed left-0 top-0 bottom-0 z-[201]',
            'flex flex-col w-[280px] max-w-[85vw]',
            'border-r',
          )}
          style={{
            backgroundColor: '#0A0A0A',
            borderColor: 'rgba(201,166,70,0.12)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
            style={{ borderColor: 'rgba(201,166,70,0.08)' }}
          >
            <Wordmark size="nav" interactive />
            <DrawerPrimitive.Close asChild>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#A0A0A0] transition-colors hover:bg-[#1A1A1A] hover:text-[#F4F4F4]"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </DrawerPrimitive.Close>
          </div>

          {/* Product list */}
          <nav className="flex-1 overflow-y-auto py-3" aria-label="Products">
            {domainOrder.map((id) => {
              const domain = domains[id];
              if (!domain) return null;

              const isBeta  = domain.beta === true;
              const isLocked = domain.locked === true;

              // Hide beta domains from non-beta users (matches TopNav logic)
              if (isBeta && !hasBetaAccess) return null;

              // Hide admin-only items (copy-trade admin section) from non-admins
              // copy-trade is beta:true so already hidden above for non-beta.
              // This guard covers any future adminOnly domains.

              const locked = (isLocked || isBeta) && !hasBetaAccess;
              const isActiveProduct = domainId === id;

              const meta = PRODUCT_META[id];
              const Icon = meta?.icon ?? TrendingUp;

              return (
                <button
                  key={id}
                  onClick={() => handleProductClick(id)}
                  disabled={locked}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200',
                    locked
                      ? 'cursor-not-allowed opacity-40'
                      : 'cursor-pointer hover:bg-[#1A1A1A]',
                    isActiveProduct && !locked
                      ? 'bg-[#C9A646]/08'
                      : '',
                  )}
                  aria-current={isActiveProduct ? 'page' : undefined}
                >
                  {/* Icon container */}
                  <span
                    className={cn(
                      'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
                      isActiveProduct && !locked
                        ? 'bg-[#C9A646]/20 text-[#C9A646]'
                        : 'bg-[#1A1A1A] text-[#A0A0A0]',
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                  </span>

                  {/* Label + sublabel */}
                  <span className="flex flex-col min-w-0">
                    <span
                      className={cn(
                        'text-sm font-medium leading-tight flex items-center gap-1.5',
                        isActiveProduct && !locked
                          ? 'text-[#C9A646]'
                          : locked
                          ? 'text-[#A0A0A0]'
                          : 'text-[#F4F4F4]',
                      )}
                    >
                      {domain.label}
                      {isBeta && hasBetaAccess && (
                        <span className="px-1 py-0.5 text-[8px] font-bold bg-orange-500/20 text-orange-400 rounded">
                          BETA
                        </span>
                      )}
                      {locked && <Lock className="h-2.5 w-2.5 opacity-60" />}
                      {/* Admin indicator: gated item the admin can access — subtle lock so they know it's restricted for regular users */}
                      {(isLocked || isBeta) && hasBetaAccess && (
                        <Lock
                          className="h-2.5 w-2.5 flex-shrink-0"
                          style={{ color: 'rgba(201,166,70,0.55)' }}
                          aria-label="Locked for regular users"
                          title="Locked for regular users"
                        />
                      )}
                    </span>
                    {meta?.sublabel && (
                      <span className="text-[11px] text-[#606060] leading-tight mt-0.5">
                        {meta.sublabel}
                      </span>
                    )}
                  </span>

                  {/* Active indicator */}
                  {isActiveProduct && !locked && (
                    <span
                      className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: '#C9A646' }}
                    />
                  )}
                </button>
              );
            })}

            {/* Admin-only section (Trade Copier / Admin) — visible only to admins */}
            {isAdmin && (
              <>
                <div
                  className="mx-4 my-2 border-t"
                  style={{ borderColor: 'rgba(201,166,70,0.08)' }}
                />
                <div className="px-4 pb-1">
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[#606060]">
                    <Shield className="h-3 w-3" />
                    Admin Only
                  </span>
                </div>
                {/* Trade Copier is already listed above via domainOrder when hasBetaAccess.
                    This section is intentionally left as a visual label — admins see the
                    copy-trade entry in the main list (beta:true + hasBetaAccess). */}
                <button
                  onClick={() => { navigate('/app/admin'); close(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 cursor-pointer hover:bg-[#1A1A1A]"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#1A1A1A] text-[#A0A0A0]">
                    <Shield className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-medium leading-tight text-[#F4F4F4] flex items-center gap-1.5">
                      Admin CRM
                      <Sparkles className="h-3 w-3 text-[#C9A646]" />
                    </span>
                    <span className="text-[11px] text-[#606060] leading-tight mt-0.5">
                      Opens in new tab
                    </span>
                  </span>
                </button>
              </>
            )}
          </nav>

          {/* Footer hint */}
          <div
            className="px-5 py-3 border-t flex-shrink-0"
            style={{ borderColor: 'rgba(201,166,70,0.08)' }}
          >
            <p className="text-[11px] text-[#404040]">
              FINOTAUR · AI-Powered Markets
            </p>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}

export default ProductDrawer;
