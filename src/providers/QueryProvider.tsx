// src/providers/QueryProvider.tsx
// ================================================
// 🚀 React Query Configuration - OPTIMIZED v2.0
// ✅ Better caching to reduce API calls
// ✅ Smarter refetch strategies
// ✅ Production ready for 5000+ concurrent users
// ================================================

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
// SINGLE SOURCE OF TRUTH: provide the same instance that @/lib/queryClient
// exports, so prefetch/invalidate helpers and components share ONE cache.
// (Previously this file created a SECOND QueryClient — every helper in
// lib/queryClient.ts operated on a dead cache no component ever read.)
import { queryClient } from '@/lib/queryClient';

export function AppQueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Back-compat: manual cache operations should import { queryClient } from
// '@/lib/queryClient' directly. Kept as a thin accessor for any legacy caller.
export function getQueryClient() {
  return queryClient;
}