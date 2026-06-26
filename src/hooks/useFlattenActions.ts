// src/hooks/useFlattenActions.ts
// ═══════════════════════════════════════════════════════════════
// Hook for calling the FLATTEN ALL / flatten-single endpoints.
// Auth: Supabase user JWT (Bearer) via authFetch. Server I.3 (2026-05-10,
// PR #15) added requireAuth + per-user rate limit + ownership check on
// broker_connections.user_id; ENGINE_SECRET path is now admin-only at
// /api/copy-engine/admin/flatten-all.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { authFetch } from '@/utils/authFetch';

interface FlattenResult {
  ok: boolean;
  accountsAffected?: number;
  positionsFlattened?: number;
  errors?: string[];
  error?: string;
}

export function useFlattenActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<FlattenResult | null>(null);

  async function callEndpoint(path: string): Promise<FlattenResult> {
    setIsLoading(true);
    try {
      const res = await authFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data: FlattenResult = await res.json();
      setLastResult(data);
      return data;
    } catch (err) {
      const data: FlattenResult = { ok: false, error: String(err) };
      setLastResult(data);
      return data;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    flattenAll:        () => callEndpoint('/api/copy-engine/flatten-all'),
    flattenCredential: (id: string) =>
      callEndpoint(`/api/copy-engine/flatten/${encodeURIComponent(id)}`),
    isLoading,
    lastResult,
  };
}
