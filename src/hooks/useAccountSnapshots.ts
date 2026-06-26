// src/hooks/useAccountSnapshots.ts
// Polls /api/copy-engine/accounts every 3 s and returns per-credential
// snapshots (positions, balances, PnL). Designed to mount/unmount with the
// Copy Trading Dashboard tab — React Query handles cache + cleanup.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authFetch } from '@/utils/authFetch';

export interface PositionEntry {
  contractId:     number;
  contractName:   string;
  netPos:         number;
  avgPrice:       number | null;
  prevPos:        number | null;
  breakevenPrice: number | null;
  openPL?:        number | null;
}

export interface OpenOrderEntry {
  orderId:    number;
  contractId: number;
  action:     'Buy' | 'Sell' | string;
  orderQty:   number;
  orderType:  string;
  ordStatus:  string;
}

interface AccountSnapshot {
  positions:   PositionEntry[];
  orders:      OpenOrderEntry[];
  cashBalance: number;
  openPnL:     number;
  realizedPnL: number;
  totalPnL:    number;
  lastUpdated: string | null;
}

export interface AccountState {
  credentialId:  string;
  accountId:     string | number | null;
  accountSpec:   string | null;
  env:           'live' | 'demo';
  authenticated: boolean;
  portfolioId:   string | null;
  snapshot:      AccountSnapshot;
}

interface AccountsResponse {
  accounts:  AccountState[];
  fetchedAt: string;
}

async function fetchAccounts(signal?: AbortSignal): Promise<AccountsResponse> {
  // Tier 0a (2026-05-10): use authFetch so Supabase Bearer token reaches the
  // server. Plain fetch() returned 401 from /accounts after I.3 hardening.
  const res = await authFetch('/api/copy-engine/accounts', { signal });
  if (!res.ok) throw new Error(`accounts fetch ${res.status}`);
  return res.json();
}

export function useAccountSnapshots() {
  const { data, isLoading, error } = useQuery<AccountsResponse, Error>({
    queryKey:        ['copy-engine-accounts'],
    queryFn:         ({ signal }) => fetchAccounts(signal),
    // Tier 0b (2026-05-10): 3 s gives 33% headroom under server's 30 req/60s
    // per-user rate limit. 2 s was at exactly the limit and tripped 429 on
    // any retry/jitter.
    refetchInterval: 3000,
    staleTime:       0,
    retry:           1,
  });

  const byCredentialId = useMemo(() => {
    const map = new Map<string, AccountState>();
    for (const a of data?.accounts ?? []) map.set(a.credentialId, a);
    return map;
  }, [data?.accounts]);

  return {
    accounts:       data?.accounts ?? [],
    byCredentialId,
    snapshotFor:    (credentialId: string) => byCredentialId.get(credentialId)?.snapshot ?? null,
    fetchedAt:      data?.fetchedAt ?? null,
    isLoading,
    error:          error ?? null,
  };
}
