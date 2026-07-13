// src/components/AuthLandingGate.tsx
// =====================================================
// Post-OAuth / post-email-confirmation landing gate for /pricing-selection.
//
// /pricing-selection is EXCLUSIVELY the redirect target Supabase sends OAuth
// (Google) and email-confirmation flows to (an allowlisted redirect URL — see
// the route comment in App.tsx). With the PKCE flow (supabase-js default) the
// browser lands on `/pricing-selection?code=…` and supabase-js exchanges the
// code for a session ASYNCHRONOUSLY via detectSessionInUrl. Crucially,
// supabase-js consumes and CLEANS the callback markers (the `?code=` query and
// the PKCE code-verifier in storage) almost immediately — so by the time React
// renders there is nothing left to sniff, yet `user` is still null for another
// beat until onAuthStateChange delivers the session.
//
// The previous behaviour was an immediate `<Navigate to="/welcome">`, which
// forwarded the user to a ProtectedRoute-gated route mid-exchange, where
// user==null resolved to `/auth/login` — the OAuth redirect bounce (observed
// 2026-07-13: a Google signup pinballed /welcome↔/auth/login↔/pricing-selection
// before giving up and using email). ProtectedRoute's hydration wait (#1467)
// only covers the window once the token is already in localStorage; it cannot
// cover the earlier code-exchange window, which is why the fix lives here.
//
// Rather than race the (already-cleaned) markers, we wait a bounded grace for
// the session to arrive before forwarding. As soon as it lands we go to
// /welcome; if it never comes (genuine no-session / abandoned OAuth) we forward
// after the grace and /welcome's ProtectedRoute resolves to /auth/login exactly
// as before. Because this route is only ever a machine redirect target, the
// brief wait costs a real user nothing.
//
// Verified 2026-07-13 on a Pages preview via an in-page decision recorder:
// the loader is held continuously (L=true→false at ~0.2s, then held on the
// grace) and only forwards once graceElapsed flips at ~7s — no early bounce to
// /auth/login. A real OAuth session arriving mid-grace flips `user` true and
// forwards immediately to /welcome → /app/home.
// =====================================================

import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { PageLoader } from '@/components/ds/Spinner';

// Bounded wait for the OAuth code-exchange to deliver a session. Typical
// exchange + onAuthStateChange completes in 1-3s; 6s absorbs a slow network.
// If the exchange runs even longer, ProtectedRoute's own localStorage-token
// hydration wait (#1467) is the downstream safety net at /welcome.
const SESSION_SETTLE_GRACE_MS = 6_000;

export default function AuthLandingGate() {
  const { user, isLoading } = useAuth();
  const [graceElapsed, setGraceElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setGraceElapsed(true), SESSION_SETTLE_GRACE_MS);
    return () => clearTimeout(timer);
  }, []);

  // Session delivered → continue to the proven onboarding screen (→ /app/home).
  if (user) {
    return <Navigate to="/welcome" replace />;
  }

  // Auth still initialising, or within the settle grace → wait for the session
  // instead of forwarding into a ProtectedRoute that would bounce to /auth/login.
  if (isLoading || !graceElapsed) {
    return <PageLoader />;
  }

  // No session after the grace → forward; /welcome → /auth/login for a genuinely
  // logged-out visitor, unchanged from the prior behaviour.
  return <Navigate to="/welcome" replace />;
}
