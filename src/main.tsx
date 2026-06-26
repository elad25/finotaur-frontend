import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
// Single shared QueryClient — networkMode 'offlineFirst' prevents silent
// forever-paused queries when navigator.onLine momentarily reads false.
import { queryClient } from '@/lib/queryClient';
import './styles/globals.css';
import App from './App';
import { initSentry } from '@/lib/sentry';
initSentry();

// ─── Legacy Supabase storage cleanup ───────────────────────────────────────
// Some users still have a `supabase.auth.token` key in localStorage from an
// old Supabase v1 SDK (current client uses `finotaur-auth-token`). When the
// legacy value is a raw OAuth URL fragment instead of JSON, downstream
// JSON.parse calls explode with `SyntaxError: Unexpected token '#'...`,
// which surfaces as "site stuck / data not loading". One-shot removal.
try {
  const legacy = localStorage.getItem('supabase.auth.token');
  if (legacy !== null && (legacy.length === 0 || legacy[0] !== '{')) {
    localStorage.removeItem('supabase.auth.token');
  }
} catch {
  // localStorage unavailable (private mode, quota) — nothing to clean.
}

// ─── Stale-chunk recovery (multi-layer) ─────────────────────────────────────
// After a deploy, Cloudflare Pages serves new hashed chunk filenames and the
// old ones 404 → SPA fallback returns index.html (Content-Type text/html). A
// client still holding pre-deploy HTML then fails to load a chunk and renders
// a blank screen. We recover with a single guarded hard reload — the fresh
// HTML points at the new hashes.
//
// Three failure surfaces are covered (the original handler caught only #1):
//   1. vite:preloadError     — React.lazy() dynamic import() failures
//   2. capture-phase 'error' — <script>/<link> (modulepreload) load failures,
//                              i.e. the entry/vendor chunks the stale HTML
//                              preloads before any app code runs. THIS is the
//                              blank-screen case vite:preloadError misses.
//   3. unhandledrejection    — dynamic import() rejections with chunk/MIME text
// Guarded by a 10s sessionStorage flag so a non-stale failure never loops.
// See Sentry MZ-4 (Strategies chunk).
const STALE_CHUNK_RELOAD_KEY = '__vite_preload_reload_at__';

function recoverFromStaleChunk(): void {
  const last = Number(sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY) || 0);
  if (Date.now() - last < 10_000) {
    // Already reloaded recently — let the real error surface (Sentry +
    // GlobalErrorBoundary manual-refresh UI) instead of looping.
    return;
  }
  sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(Date.now()));
  window.location.reload();
}

const STALE_CHUNK_PATTERN =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|module script.*MIME type|Unexpected token '<'/i;

// 1. Vite's own dynamic-import failure event (React.lazy routes).
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault?.();
  recoverFromStaleChunk();
});

// 2. Resource-load failures for module scripts / modulepreload links. These
//    fire a non-bubbling 'error' on the element, so we listen in capture phase
//    on window. Scoped to our hashed build assets so third-party script
//    failures never trigger a reload.
window.addEventListener(
  'error',
  (event) => {
    const target = event.target as HTMLElement | null;
    if (!target || typeof target.tagName !== 'string') return;
    if (target.tagName !== 'SCRIPT' && target.tagName !== 'LINK') return;
    const url =
      (target as HTMLScriptElement).src || (target as HTMLLinkElement).href || '';
    if (!/\/assets\/.*\.(js|mjs)(\?|$)/.test(url)) return;
    recoverFromStaleChunk();
  },
  true,
);

// 3. Dynamic import() rejections that slipped past vite:preloadError.
window.addEventListener('unhandledrejection', (event) => {
  const message = String(event.reason?.message ?? event.reason ?? '');
  if (STALE_CHUNK_PATTERN.test(message)) {
    recoverFromStaleChunk();
  }
});

// ✅ Prefetch critical data on app load
const prefetchCriticalData = async () => {
  // Add prefetch calls here for data every authenticated user needs.
  // e.g. user profile, settings, etc.
};

// Initialize app
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </HelmetProvider>
);

// Remove the instant boot splash once React has taken over the first paint.
// Idempotent — may be called by both the fast path and the fallback below.
let bootSplashHidden = false;
const hideBootSplash = () => {
  if (bootSplashHidden) return;
  const splash = document.getElementById('boot-splash');
  if (!splash) { bootSplashHidden = true; return; }
  bootSplashHidden = true;
  splash.classList.add('boot-splash--hide');
  setTimeout(() => splash.remove(), 350); // match the CSS opacity transition
};
// Fast path (foreground tab): remove right after the first painted frame.
requestAnimationFrame(() => requestAnimationFrame(hideBootSplash));
// Robust fallback: requestAnimationFrame is PAUSED in background/unfocused tabs,
// so the rAF path alone would leave the splash covering the page when the site
// is opened in a background tab. A plain timer still fires while hidden and
// guarantees the splash is always removed.
setTimeout(hideBootSplash, 1500);

// Prefetch after initial render
prefetchCriticalData();

// Re-export so legacy callers that import from 'main' still get the same instance.
export { queryClient };