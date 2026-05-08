// src/hooks/useCopyEngineHealth.ts
// Polls /api/copy-engine/health every 5 s.
// Returns { alive, sessions, rules, uptime, isLoading, error }.
import { useQuery } from '@tanstack/react-query';

interface EngineHealth {
  status: string;
  sessions: number;
  rules: number;
  uptime: number;
}

async function fetchEngineHealth(): Promise<EngineHealth> {
  const res = await fetch('/api/copy-engine/health');
  if (!res.ok) throw new Error(`copy-engine health check failed: ${res.status}`);
  return res.json() as Promise<EngineHealth>;
}

export function useCopyEngineHealth() {
  const { data, isLoading, error } = useQuery<EngineHealth, Error>({
    queryKey: ['copy-engine-health'],
    queryFn: fetchEngineHealth,
    refetchInterval: 5000,
    staleTime: 0,
    retry: 1,
  });

  return {
    alive:     data?.status === 'ok',
    sessions:  data?.sessions  ?? 0,
    rules:     data?.rules     ?? 0,
    uptime:    data?.uptime    ?? 0,
    isLoading,
    error:     error ?? null,
  };
}
