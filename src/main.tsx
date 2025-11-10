import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/globals.css';
import App from './App';

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
  <QueryClientProvider client={queryClient}>
    <App />
    
  </QueryClientProvider>
);

// Prefetch after initial render
prefetchCriticalData();

// ✅ Export for use in other files if needed
export { queryClient };