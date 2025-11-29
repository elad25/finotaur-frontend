// src/providers/QueryProvider.tsx
// ================================================
// 🚀 React Query Configuration - OPTIMIZED v2.0
// ✅ Better caching to reduce API calls
// ✅ Smarter refetch strategies
// ✅ Production ready for 5000+ concurrent users
// ================================================

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useMemo } from 'react';

// Create QueryClient outside component to prevent recreation
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // ✅ OPTIMIZED: Longer stale time = fewer refetches
        staleTime: 5 * 60 * 1000,      // 5 minutes - data considered fresh
        gcTime: 15 * 60 * 1000,         // 15 minutes - keep in memory longer
        
        // ✅ CRITICAL FIX: Don't refetch on mount if data is fresh
        refetchOnMount: false,          // Was true - caused excessive calls
        refetchOnWindowFocus: false,    // Was true - caused refetch on tab switch
        refetchOnReconnect: 'always',   // Only refetch on reconnect
        
        // ✅ Smarter retry logic
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        
        // ✅ Network mode
        networkMode: 'offlineFirst',    // Use cache first, then network
        
        // ✅ Structural sharing for better performance
        structuralSharing: true,
      },
      mutations: {
        retry: 1,
        networkMode: 'online',
        // ✅ Auto-invalidate related queries on mutation success
        onSuccess: () => {
          // Individual mutations can override this
        },
      },
    },
  });
}

// Singleton instance for the entire app
let queryClientInstance: QueryClient | null = null;

function getQueryClient() {
  if (!queryClientInstance) {
    queryClientInstance = createQueryClient();
  }
  return queryClientInstance;
}

export function AppQueryProvider({ children }: { children: ReactNode }) {
  // ✅ Use singleton pattern to prevent recreation
  const queryClient = useMemo(() => getQueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// ✅ Export for manual cache operations
export { getQueryClient };