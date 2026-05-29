import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  SectorFlowSnapshot,
  SectorFlowBriefing,
  SectorFlowBriefingError,
} from '../utils/sectorFlowTypes';
import { isSectorFlowBriefingError } from '../utils/sectorFlowTypes';

const SNAPSHOT_URL = '/api/sector-flow/snapshot';
const BRIEFING_URL = '/api/sector-flow/briefing';

const SNAPSHOT_STALE_MS = 60 * 1000;
const SNAPSHOT_REFETCH_MS = 60 * 1000;
const BRIEFING_STALE_MS = 5 * 60 * 1000;
const BRIEFING_REFETCH_MS = 5 * 60 * 1000;

const QUERY_KEYS = {
  snapshot: ['sector-flow', 'snapshot'] as const,
  briefing: ['sector-flow', 'briefing'] as const,
};

async function fetchSnapshot(): Promise<SectorFlowSnapshot> {
  const res = await fetch(SNAPSHOT_URL, { credentials: 'include' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`snapshot fetch failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return (await res.json()) as SectorFlowSnapshot;
}

async function fetchBriefing(force: boolean): Promise<SectorFlowBriefing> {
  const url = force ? `${BRIEFING_URL}?force=true` : BRIEFING_URL;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as SectorFlowBriefingError | null;
    const detail = body?.message ?? body?.error ?? `HTTP ${res.status}`;
    throw new Error(`briefing fetch failed: ${detail}`);
  }
  const payload = (await res.json()) as SectorFlowBriefing | SectorFlowBriefingError;
  if (isSectorFlowBriefingError(payload)) {
    throw new Error(payload.message ?? payload.error);
  }
  return payload;
}

export interface SnapshotHookResult {
  data: SectorFlowSnapshot | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSectorFlowSnapshot(): SnapshotHookResult {
  const query = useQuery({
    queryKey: QUERY_KEYS.snapshot,
    queryFn: fetchSnapshot,
    staleTime: SNAPSHOT_STALE_MS,
    refetchInterval: (q) => (q.state.error ? false : SNAPSHOT_REFETCH_MS),
    refetchOnWindowFocus: false,
    throwOnError: false,
    retry: 1,
    retryDelay: 5000,
  });
  return {
    data: query.data ?? null,
    loading: query.isLoading || query.isFetching,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => {
      void query.refetch();
    },
  };
}

export interface BriefingHookResult {
  data: SectorFlowBriefing | null;
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => void;
}

export function useSectorFlowBriefing(): BriefingHookResult {
  const [forceNext, setForceNext] = useState(false);
  const query = useQuery({
    queryKey: [...QUERY_KEYS.briefing, forceNext],
    queryFn: () => fetchBriefing(forceNext),
    staleTime: BRIEFING_STALE_MS,
    refetchInterval: (q) => (q.state.error ? false : BRIEFING_REFETCH_MS),
    refetchOnWindowFocus: false,
    throwOnError: false,
    retry: 1,
    retryDelay: 5000,
  });

  const refetch = useCallback((force?: boolean) => {
    if (force) {
      setForceNext(true);
      setTimeout(() => setForceNext(false), 1000);
    } else {
      void query.refetch();
    }
  }, [query]);

  return {
    data: query.data ?? null,
    loading: query.isLoading || query.isFetching,
    error: query.error instanceof Error ? query.error : null,
    refetch,
  };
}
