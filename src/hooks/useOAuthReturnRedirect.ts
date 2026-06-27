// src/hooks/useOAuthReturnRedirect.ts
// Reads a pending sessionStorage return-to path (set before Tradovate OAuth redirect)
// and navigates the user there after a successful OAuth callback instead of
// keeping them on /app/journal/overview.
//
// Mount once inside ProtectedAppLayout so it runs on every route change.
// Journal callers that never set the key are completely unaffected.

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'finotaur_oauth_return_to';

export function useOAuthReturnRedirect(): void {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('oauth_status') !== 'connected') return;

    const returnTo = sessionStorage.getItem(STORAGE_KEY);
    if (!returnTo) return;

    // Consume immediately so a manual refresh does not re-trigger.
    sessionStorage.removeItem(STORAGE_KEY);

    const base = returnTo.split('?')[0];
    // Safety: only redirect to internal /app/ paths.
    if (!base.startsWith('/app/')) return;
    // Already on the target page — nothing to do (the page's own handler runs).
    if (location.pathname === base) return;

    // Forward the full oauth_status=connected&broker=... query string to the
    // destination page so it can show success UI if desired.
    navigate(`${base}?${params.toString()}`, { replace: true });
  }, [location.pathname, location.search, navigate]);
}
