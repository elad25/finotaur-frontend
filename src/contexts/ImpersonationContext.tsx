// src/contexts/ImpersonationContext.tsx
// ================================================
// IMPERSONATION CONTEXT - v3.0 TRUE SESSION SWAP
// ================================================
// Admin "view as user" via a REAL Supabase session swap:
//  - start: admin-impersonate edge fn mints a one-time token for the
//    target; we back up the admin's own session, then verifyOtp() to
//    BECOME the target. From here every RLS-protected query / page shows
//    exactly what the user sees (read AND write), with zero per-table
//    changes — auth.uid() is genuinely the target.
//  - stop: restore the admin's backed-up session, close the audit row,
//    and return to the admin CRM.
//
// No service-role key in the browser. No admin_mode RLS bypass. The old
// fake-token flow (placeholder tokens + supabaseAdmin) is fully removed.
// ================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

interface ImpersonatedUser {
  id: string;
  email: string;
  name?: string;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;
  originalAdminId: string | null;
  startImpersonation: (userId: string, userEmail: string, userName?: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  refreshSession: () => Promise<void>;
  /** @deprecated kept for interface compatibility — admin_mode is no longer used. */
  enableAdminMode: () => Promise<boolean>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

// localStorage (not sessionStorage): survives reloads AND lets any tab that
// loaded the swapped session detect impersonation and restore the admin.
const ACTIVE_KEY = 'imp_active';        // '1' while impersonating
const META_KEY = 'imp_meta';            // { id, email, name, adminId, auditToken, expiresAt }
const ADMIN_BACKUP_KEY = 'imp_admin_backup'; // { access_token, refresh_token }

interface ImpMeta {
  id: string;
  email: string;
  name?: string;
  adminId: string;
  auditToken: string;
  expiresAt: string;
}

function readMeta(): ImpMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as ImpMeta) : null;
  } catch {
    return null;
  }
}

function clearImpStorage() {
  localStorage.removeItem(ACTIVE_KEY);
  localStorage.removeItem(META_KEY);
  localStorage.removeItem(ADMIN_BACKUP_KEY);
  // Legacy keys from the old fake-token flow — clear so nothing lingers.
  sessionStorage.removeItem('imp_session_token');
  sessionStorage.removeItem('imp_user_data');
  sessionStorage.removeItem('imp_last_check');
}

export const ImpersonationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState(() => {
    // Optimistic synchronous hydration from localStorage (no skeleton flash).
    const meta = readMeta();
    const active = localStorage.getItem(ACTIVE_KEY) === '1' && !!meta;
    return {
      isImpersonating: active,
      impersonatedUser: active && meta ? { id: meta.id, email: meta.email, name: meta.name } : null,
      originalAdminId: active && meta ? meta.adminId : null,
    };
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const swapInProgress = useRef(false);

  // ── Rehydrate / reconcile on mount ──────────────────────────────
  // The authoritative truth is the actual Supabase session. If the stored
  // flag disagrees with the live session, fix the flag (do not fight it).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const meta = readMeta();
      const active = localStorage.getItem(ACTIVE_KEY) === '1' && !!meta;
      if (!active || !meta) return;

      // Expired → auto-stop.
      if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
        if (!cancelled) await stopImpersonation();
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.user?.id === meta.id) {
        // Confirmed: live session is the target → we are impersonating.
        setState({
          isImpersonating: true,
          impersonatedUser: { id: meta.id, email: meta.email, name: meta.name },
          originalAdminId: meta.adminId,
        });
      } else {
        // Live session is NOT the target (admin already restored elsewhere,
        // or session changed). Drop the stale flag — we're not impersonating.
        clearImpStorage();
        setState({ isImpersonating: false, impersonatedUser: null, originalAdminId: null });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start ───────────────────────────────────────────────────────
  const startImpersonation = useCallback(
    async (userId: string, userEmail: string, userName?: string) => {
      if (swapInProgress.current) return;
      swapInProgress.current = true;
      try {
        // Capture the admin's current session BEFORE the swap overwrites it.
        const { data: { session: adminSession } } = await supabase.auth.getSession();
        if (!adminSession?.refresh_token || !adminSession.user) {
          toast.error('You must be logged in to impersonate');
          return;
        }
        const adminId = adminSession.user.id;

        // Ask the edge function to mint a real one-time token for the target.
        const { data, error } = await supabase.functions.invoke('admin-impersonate', {
          body: { target_user_id: userId },
        });

        if (error || !data?.success || !data?.token_hash) {
          const msg = data?.error || error?.message || 'Failed to start impersonation';
          toast.error(msg);
          return;
        }

        // Back up the admin session so we can return to it on exit.
        localStorage.setItem(
          ADMIN_BACKUP_KEY,
          JSON.stringify({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          }),
        );

        // Exchange the token → the live session becomes the target user.
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: (data.verification_type as 'magiclink') || 'magiclink',
        });

        if (otpError) {
          // Swap failed — session is still the admin's. Roll back the backup.
          localStorage.removeItem(ADMIN_BACKUP_KEY);
          toast.error(`Failed to switch session: ${otpError.message}`);
          return;
        }

        const meta: ImpMeta = {
          id: data.target?.id ?? userId,
          email: data.target?.email ?? userEmail,
          name: data.target?.name ?? userName,
          adminId,
          auditToken: data.session_token,
          expiresAt: data.expires_at,
        };
        localStorage.setItem(ACTIVE_KEY, '1');
        localStorage.setItem(META_KEY, JSON.stringify(meta));

        setState({
          isImpersonating: true,
          impersonatedUser: { id: meta.id, email: meta.email, name: meta.name },
          originalAdminId: adminId,
        });

        // Fresh data for the target — drop the admin's cached queries.
        queryClient.clear();
        queryClient.invalidateQueries();

        toast.success(`Now viewing as ${meta.email}`, { description: 'Session expires in 2 hours' });
        navigate('/app/journal/overview', { replace: true });
        setTimeout(() => window.dispatchEvent(new CustomEvent('impersonation-started')), 150);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start impersonation';
        toast.error(msg);
      } finally {
        swapInProgress.current = false;
      }
    },
    [navigate, queryClient],
  );

  // ── Stop ────────────────────────────────────────────────────────
  const stopImpersonation = useCallback(async () => {
    if (swapInProgress.current) return;
    swapInProgress.current = true;
    try {
      const meta = readMeta();
      let restored = false;

      // 1. Restore the admin session FIRST so auth.uid() is the admin again
      //    (required for the end-session RPC below, and to return control).
      try {
        const raw = localStorage.getItem(ADMIN_BACKUP_KEY);
        const backup = raw ? JSON.parse(raw) : null;
        if (backup?.access_token && backup?.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: backup.access_token,
            refresh_token: backup.refresh_token,
          });
          restored = !error;
        }
      } catch {
        restored = false;
      }

      // 2. Close the audit row (best-effort; needs the admin session above).
      if (restored && meta?.auditToken) {
        try {
          await supabase.rpc('end_impersonation_session', { p_session_token: meta.auditToken });
        } catch {
          /* non-fatal */
        }
      }

      clearImpStorage();
      setState({ isImpersonating: false, impersonatedUser: null, originalAdminId: null });
      queryClient.clear();
      queryClient.invalidateQueries();

      if (restored) {
        toast.success('Returned to admin view');
        navigate('/app/admin/users', { replace: true });
      } else {
        // Could not restore the admin session (e.g. backup lost / expired).
        // Fail safe: sign out completely rather than stay stuck as the user.
        toast.error('Could not restore admin session — please sign in again');
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
      }
      setTimeout(() => window.dispatchEvent(new CustomEvent('impersonation-stopped')), 150);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to stop impersonation';
      toast.error(msg);
    } finally {
      swapInProgress.current = false;
    }
  }, [navigate, queryClient]);

  const refreshSession = useCallback(async () => {
    const meta = readMeta();
    if (!meta) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id !== meta.id) {
      clearImpStorage();
      setState({ isImpersonating: false, impersonatedUser: null, originalAdminId: null });
    }
  }, []);

  // Deprecated no-op (admin_mode RLS bypass no longer exists).
  const enableAdminMode = useCallback(async () => true, []);

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: state.isImpersonating,
        impersonatedUser: state.impersonatedUser,
        originalAdminId: state.originalAdminId,
        startImpersonation,
        stopImpersonation,
        refreshSession,
        enableAdminMode,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
};
