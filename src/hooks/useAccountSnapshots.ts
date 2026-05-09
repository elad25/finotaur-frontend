// src/hooks/useAccountSnapshots.ts
// Polls /api/copy-engine/accounts every 2 s and returns per-credential
// snapshots (positions, balances, PnL). Designed to mount/unmount with the
// Copy Trading Dashboard tab — React Query handles cache + cleanup.

import { useQuery } from '@tanstack/react-query';

export interface PositionEntry {
  contractId:     number;
  contractName:   string;
  netPos:         number;
  avgPrice:       number | null;
  prevPos:        number | null;
  breakevenPrice: number | null;
}

interface AccountSnapshot {
  positions:   PositionEntry[];
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

async function fetchAccounts(): Promise<AccountsResponse> {
  const res = await fetch('/api/copy-engine/accounts');
  if (!res.ok) throw new Error(`accounts fetch ${res.status}`);
  return res.json();
}

export function useAccountSnapshots() {
  const { data, isLoading, error } = useQuery<AccountsResponse, Error>({
    queryKey:       ['copy-engine-accounts'],
    queryFn:        fetchAccounts,
    refetchInterval: 2000, // 2 s — live-ish without hammering
    staleTime:      0,
    retry:          1,
  });

  const byCredentialId = new Map<string, AccountState>();
  for (const a of data?.accounts ?? []) byCredentialId.set(a.credentialId, a);

  return {
    accounts:       data?.accounts ?? [],
    byCredentialId,
    snapshotFor:    (credentialId: string) => byCredentialId.get(credentialId)?.snapshot ?? null,
    fetchedAt:      data?.fetchedAt ?? null,
    isLoading,
    error:          error ?? null,
  };
}
