// src/components/AuthLandingGate.tsx
// =====================================================
// Post-OAuth / post-email-confirmation landing gate.
//
// Supabase redirects OAuth (Google) and email-confirmation flows to
// `${origin}/pricing-selection` (an allowlisted redirect URL). With the PKCE
// flow (supabase-js default), the browser lands on `/pricing-selection?code=…`
// and supabase-js exchanges the code for a session ASYNCHRONOUSLY via
// detectSessionInUrl. During that exchange `user` is momentarily null and the
// session token is not yet in localStorage.
//
// The previous behaviour here was an immediate `<Navigate to="/welcome">`. That
// forwarded the user to a ProtectedRoute-gated route mid-exchange, where
// user==null resolved to a redirect to `/auth/login` — the post-signup OAuth
// redirect bounce (observed 2026-07-13: a Google signup pinballed
// /welcome↔/auth/login↔/pricing-selection before the user gave up and used
// email instead). ProtectedRoute's own hydration wait only covers the window
// once the token is already in localStorage; it cannot cover the earlier
// code-exchange window, which is why the fix lives here at the landing route.
//
// This gate holds on a loader while an auth callback is settling, then forwards
// to /welcome once the session is delivered. Non-callback visits preserve the
// original immediate forward to /welcome (ProtectedRoute there resolves a
// logged-out visitor to /auth/login exactly as before).
// =====================================================

import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { PageLoader } from '@/components/ds/Spinner';

// Bounded wait so a stalled/abandoned exchange never hangs on the loader.
const CALLBACK_SETTLE_TIMEOUT_MS = 15_000;

/** True when the current URL/storage indicates an in-flight Supabase auth callback. */
function hasPendingAuthCallback(): boolean {
  if (typeof window === 'undefined') return false;
  // PKCE (?code=) or error redirect, implicit-flow (#access_token=), or the
  // PKCE code-verifier still in storage (survives even after supabase-js cleans
  // the URL, until the exchange completes). storageKey = 'finotaur-auth-token'.
  return (
    /[?&](code|error)=/.test(window.location.search) ||
    window.location.hash.includes('access_token') ||
    !!localStorage.getItem('finotaur-auth-token-code-verifier')
  );
}

export default function AuthLandingGate() {
  const { user, isLoading } = useAuth();
  const [isCallback] = useState<boolean>(hasPendingAuthCallback);
  const [waitedTooLong, setWaitedTooLong] = useState(false);

  useEffect(() => {
    if (!isCallback) return;
    const timer = setTimeout(() => setWaitedTooLong(true), CALLBACK_SETTLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isCallback]);

  // Session delivered → continue to the proven onboarding screen (→ /app/home).
  if (user) {
    return <Navigate to="/welcome" replace />;
  }

  // Auth callback still settling → wait instead of bouncing to /auth/login.
  if (isCallback && !waitedTooLong && (isLoading || !user)) {
    return <PageLoader />;
  }

  // No callback (or the wait was exhausted): preserve the original forward.
  // ProtectedRoute at /welcome resolves a genuinely logged-out visitor to
  // /auth/login, unchanged from prior behaviour.
  return <Navigate to="/welcome" replace />;
}
