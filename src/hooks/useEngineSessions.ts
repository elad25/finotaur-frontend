// src/hooks/useEngineSessions.ts
// Extends copy-engine health data with per-session credential details.
// Shares the same React Query cache key as useCopyEngineHealth — only one
// fetch per refetch interval regardless of how many components subscribe.
import { useQuery } from '@tanstack/react-query';

interface SessionDetail {
  credentialId: string;
  env: 'live' | 'demo';
  authenticated: boolean;
}

interface EngineHealthResponse {
  status: string;
  sessions: number;
  rules: number;
  uptime: number;
  sessionCredentialIds?: string[];
  sessionDetails?: SessionDetail[];
}

async function fetchEngineHealth(): Promise<EngineHealthResponse> {
  const res = await fetch('/api/copy-engine/health');
  if (!res.ok) throw new Error(`engine health ${res.status}`);
  return res.json();
}

export function useEngineSessions() {
  const { data, isLoading, error } = useQuery<EngineHealthResponse, Error>({
    queryKey: ['copy-engine-health'], // shared key with useCopyEngineHealth
    queryFn: fetchEngineHealth,
    refetchInterval: 5000,
    staleTime: 0,
    retry: 1,
  });

  const liveCredentialIds = new Set(data?.sessionCredentialIds ?? []);

  return {
    alive: data?.status === 'ok',
    sessions: data?.sessions ?? 0,
    rules: data?.rules ?? 0,
    uptime: data?.uptime ?? 0,
    liveCredentialIds,
    isCredentialLive: (id: string) => liveCredentialIds.has(id),
    isLoading,
    error: error ?? null,
  };
}
