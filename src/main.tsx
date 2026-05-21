import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import './styles/globals.css';
import App from './App';
import { initSentry } from '@/lib/sentry';
initSentry();

// ─── Vite stale-chunk recovery ─────────────────────────────────────────────
// After a new deploy, Cloudflare Pages serves new chunk filenames. Clients
// still holding stale HTML (open tabs from before the deploy) get a
// "Failed to fetch dynamically imported module" error when a React.lazy()
// route triggers. The fix is a single hard reload — the new HTML points at
// the new chunk hashes. Guarded by a 10-second sessionStorage flag so we
// never loop if the failure is something other than a stale chunk.
// See Sentry MZ-2 (TradeCopier chunk) and MZ-4 (Strategies chunk).
window.addEventListener('vite:preloadError', (event) => {
  const RELOAD_KEY = '__vite_preload_reload_at__';
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  if (Date.now() - last < 10_000) {
    // Already reloaded recently — surface the real error to Sentry instead
    // of looping.
    return;
  }
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  event.preventDefault?.();
  window.location.reload();
});

// ================================================
// 🔥 OPTIMIZED REACT QUERY CLIENT
// ================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ Cache strategy based on data type
      staleTime: 1000 * 60 * 15,           // 15 min - רוב הדאטה יציב
      gcTime: 1000 * 60 * 30,              // 30 min - garbage collection
      
      // ✅ Smart refetch strategy
      refetchOnWindowFocus: false,          // לא צריך - גורם לעומס מיותר
      refetchOnMount: false,                // אם יש cache, תשתמש בו
      refetchOnReconnect: true,             // רק כש-reconnect
      
      // ✅ Retry strategy
      retry: (failureCount, error: any) => {
        // לא retry על 404 או 401
        if (error?.status === 404 || error?.status === 401) return false;
        // retry פעמיים על errors אחרים
        return failureCount < 2;
      },
      
      // ✅ Network optimization
      networkMode: 'online',                // רק כשיש אינטרנט
    },
    
    mutations: {
      // ✅ Mutation defaults
      retry: 1,
      networkMode: 'online',
    },
  },
});

// ✅ Prefetch critical data on app load
const prefetchCriticalData = async () => {
  // הוסף כאן prefetch לדאטה קריטי שכל משתמש צריך
  // לדוגמה: user profile, settings, etc.
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

// Prefetch after initial render
prefetchCriticalData();

// ✅ Export for use in other files if needed
export { queryClient };