// hooks/useDailyBriefData.ts
// Fetches the personalized daily brief with a stale-while-revalidate pattern.
// Both global and personal arrive in a single call via React Query.
// On repeat visits the last brief is served instantly from localStorage
// (up to 12 h old), while a background refetch refreshes it silently.
// On a true first visit (no cache) a normal loading skeleton is shown once.

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchPersonalizedDailyBrief,
  type PersonalizedDailyResponse,
  type PortfolioContext,
} from '@/services/copilotDailyBriefApi';

const CACHE_KEY = 'finotaur:copilot-daily-brief:v1';
// Only treat a cached brief as "instant-renderable" if it was saved within this
// window. Beyond it we fall back to a normal loading state so we never flash a
// clearly-stale brief (the daily cadence means a fresh one exists each morning).
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12h

interface CachedEntry {
  savedAt: number;
  data: PersonalizedDailyResponse;
}

/** Read the persisted brief; returns undefined if missing, unparseable, or too old. */
function readBriefCache(): CachedEntry | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (
      !parsed ||
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS
    ) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

/** Persist the latest brief response (best-effort; storage failures are ignored). */
function writeBriefCache(data: PersonalizedDailyResponse): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* quota / private-mode — non-fatal */
  }
}

export interface UseDailyBriefDataResult {
  global: PersonalizedDailyResponse['global'];
  personal: PersonalizedDailyResponse['personal'];
  loading: boolean;
  error: Error | null;
}

export function useDailyBriefData(portfolio?: PortfolioContext): UseDailyBriefDataResult {
  const cached = readBriefCache();

  const query = useQuery<PersonalizedDailyResponse, Error>({
    // Include a stable key segment when portfolio is present so different
    // portfolio states do not share a stale cached result.
    queryKey: ['copilot-daily-brief-personalized', portfolio ? 'with-portfolio' : 'no-portfolio'],
    queryFn: () => fetchPersonalizedDailyBrief(portfolio ?? undefined),
    // Brief content only changes once/day (pre-open cron). Within this window we
    // serve from React Query memory with no network call at all.
    staleTime: 4 * 60 * 60 * 1000, // 4h
    gcTime: 24 * 60 * 60 * 1000,   // 24h
    refetchOnWindowFocus: false,
    // Seed from localStorage so the page renders the last brief INSTANTLY on a
    // cold load, then revalidates in the background (initialDataUpdatedAt is the
    // cache's save time, which is older than staleTime → triggers one background
    // refetch). On a true first visit (no cache) this is undefined → normal load.
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
  });

  // Persist every successful response for the next cold load.
  useEffect(() => {
    if (query.data) writeBriefCache(query.data);
  }, [query.data]);

  return {
    global: query.data?.global ?? null,
    personal: query.data?.personal ?? null,
    // With seeded initialData, isLoading is false → no skeleton on repeat visits.
    // On a genuine first load (no cache) isLoading is true → skeleton shows once.
    loading: query.isLoading,
    error: query.error ?? null,
  };
}
