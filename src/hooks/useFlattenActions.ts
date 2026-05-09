// src/hooks/useFlattenActions.ts
// ═══════════════════════════════════════════════════════════════
// Hook for calling the FLATTEN ALL / flatten-single endpoints.
// Auth: currently uses ENGINE_SECRET (x-engine-secret header) via the
// Vite proxy — the server router guards with requireSecret.
// TODO: switch to Supabase user JWT Bearer once user JWT middleware is
// wired into copy-engine routes (security review needed).
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';

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
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // TODO: add Authorization Bearer once user JWT middleware is wired
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
