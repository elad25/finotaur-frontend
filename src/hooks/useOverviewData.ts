// hooks/useOverviewData.ts - REWRITTEN WITH REACT QUERY
import { useQuery } from '@tanstack/react-query';

type PricePoint = [number, number]; // [timestamp, close]
type FilingEvent = { f: string; fd: string; rd?: string };
type AnalystData = { buy?: number; hold?: number; sell?: number; tAvg?: number; tHi?: number; tLo?: number };
type ProfileData = { name?: string; desc?: string; exch?: string; ind?: string };
type SnapshotData = { mc?: number; pe?: number; /* ... */ };
type NewsItem = { title: string; url: string; source?: string; publishedAt?: string };

export const overviewKeys = {
  all: ['overview'] as const,
  symbol: (symbol: string) => [...overviewKeys.all, symbol] as const,
  price: (symbol: string) => [...overviewKeys.symbol(symbol), 'price'] as const,
  events: (symbol: string) => [...overviewKeys.symbol(symbol), 'events'] as const,
  analyst: (symbol: string) => [...overviewKeys.symbol(symbol), 'analyst'] as const,
  profile: (symbol: string) => [...overviewKeys.symbol(symbol), 'profile'] as const,
  snapshot: (symbol: string) => [...overviewKeys.symbol(symbol), 'snapshot'] as const,
  news: (symbol: string) => [...overviewKeys.symbol(symbol), 'news'] as const,
};

// Individual fetchers
async function fetchPrice(symbol: string): Promise<PricePoint[]> {
  const r = await fetch(`/api/overview/price?symbol=${encodeURIComponent(symbol)}`);
  if (!r.ok) throw new Error('Failed to fetch price');
  const j = await r.json();
  return j.series || [];
}

async function fetchEvents(symbol: string) {
  const r = await fetch(`/api/overview/events?symbol=${encodeURIComponent(symbol)}`);
  if (!r.ok) return { filings: [] };
  const j = await r.json();
  return { filings: j.events || [] };
}

async function fetchAnalyst(symbol: string): Promise<AnalystData> {
  const r = await fetch(`/api/overview/analyst?symbol=${encodeURIComponent(symbol)}`);
  if (!r.ok) return {};
  return await r.json();
}

async function fetchProfile(symbol: string): Promise<ProfileData> {
  const r = await fetch(`/api/overview/about?symbol=${encodeURIComponent(symbol)}`);
  if (!r.ok) return {};
  return await r.json();
}

async function fetchSnapshot(symbol: string): Promise<SnapshotData> {
  const r = await fetch(`/api/overview/header?symbol=${encodeURIComponent(symbol)}`);
  if (!r.ok) return {};
  return await r.json();
}

async function fetchNews(symbol: string): Promise<NewsItem[]> {
  const r = await fetch(`/api/news?symbol=${encodeURIComponent(symbol)}&limit=6`);
  if (!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j) ? j.slice(0, 6) : [];
}

// Hooks
export function useOverviewPrice(symbol?: string) {
  return useQuery({
    queryKey: overviewKeys.price(symbol || ''),
    queryFn: () => fetchPrice(symbol!),
    enabled: !!symbol,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useOverviewEvents(symbol?: string) {
  return useQuery({
    queryKey: overviewKeys.events(symbol || ''),
    queryFn: () => fetchEvents(symbol!),
    enabled: !!symbol,
    staleTime: 10 * 60 * 1000,
  });
}

export function useOverviewAnalyst(symbol?: string) {
  return useQuery({
    queryKey: overviewKeys.analyst(symbol || ''),
    queryFn: () => fetchAnalyst(symbol!),
    enabled: !!symbol,
    staleTime: 10 * 60 * 1000,
  });
}

export function useOverviewProfile(symbol?: string) {
  return useQuery({
    queryKey: overviewKeys.profile(symbol || ''),
    queryFn: () => fetchProfile(symbol!),
    enabled: !!symbol,
    staleTime: 30 * 60 * 1000, // profile changes rarely
  });
}

export function useOverviewSnapshot(symbol?: string) {
  return useQuery({
    queryKey: overviewKeys.snapshot(symbol || ''),
    queryFn: () => fetchSnapshot(symbol!),
    enabled: !!symbol,
    staleTime: 2 * 60 * 1000,
  });
}

export function useOverviewNews(symbol?: string) {
  return useQuery({
    queryKey: overviewKeys.news(symbol || ''),
    queryFn: () => fetchNews(symbol!),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}

// Aggregate hook (if you need everything at once)
export function useOverviewData(symbol?: string) {
  const price = useOverviewPrice(symbol);
  const events = useOverviewEvents(symbol);
  const analyst = useOverviewAnalyst(symbol);
  const profile = useOverviewProfile(symbol);
  const snapshot = useOverviewSnapshot(symbol);
  const news = useOverviewNews(symbol);

  return {
    loading: price.isLoading || events.isLoading || analyst.isLoading || 
             profile.isLoading || snapshot.isLoading || news.isLoading,
    error: price.error || events.error || analyst.error || 
           profile.error || snapshot.error || news.error,
    price: price.data || [],
    events: events.data || { filings: [] },
    analyst: analyst.data || {},
    profile: profile.data || {},
    snapshot: snapshot.data || {},
    news: news.data || [],
  };
}