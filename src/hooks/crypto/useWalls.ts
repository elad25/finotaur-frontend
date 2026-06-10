// src/hooks/crypto/useWalls.ts
// React Query hooks for Order Book Walls — mirrors useWhaleData.ts shape.

import { useQuery } from '@tanstack/react-query';
import { fetchWalls, fetchSymbolWalls } from '@/pages/app/crypto/_shared/api';
import type { OrderWall, SymbolWalls } from '@/pages/app/crypto/_shared/types';

/** Global walls — biggest resting limits across all tracked assets. */
export function useWalls(side?: 'bid' | 'ask') {
  return useQuery<OrderWall[], Error>({
    queryKey: ['crypto-walls', side ?? 'all'],
    queryFn: () => fetchWalls({ limit: 60, side }),
    staleTime: 8_000,
    refetchInterval: 10_000,
  });
}

/** Per-symbol walls — bids + asks for a specific asset. */
export function useSymbolWalls(symbol: string) {
  return useQuery<SymbolWalls, Error>({
    queryKey: ['crypto-walls', symbol],
    queryFn: () => fetchSymbolWalls(symbol),
    staleTime: 8_000,
    refetchInterval: 10_000,
    enabled: !!symbol,
  });
}
