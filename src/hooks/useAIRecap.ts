import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type RecapPeriod = 'weekly' | 'monthly' | 'quarterly';

export interface RecapData {
  period: RecapPeriod;
  periodStart: string;   // YYYY-MM-DD
  periodEnd: string;
  generatedAt: string;   // ISO
  tradeCount: number;
  narrative: string;     // multi-line markdown-light
  keyMetrics: { label: string; value: string }[];
  observations: string[];
  isMock: boolean;       // true until real edge function lands
}

// --- Date math helpers ---

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computePeriodRange(period: RecapPeriod, now: Date): { periodStart: string; periodEnd: string } {
  const d = new Date(now);
  if (period === 'weekly') {
    const day = d.getDay(); // 0=Sun
    const offsetToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + offsetToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { periodStart: iso(monday), periodEnd: iso(sunday) };
  }
  if (period === 'monthly') {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { periodStart: iso(first), periodEnd: iso(last) };
  }
  // quarterly
  const q = Math.floor(d.getMonth() / 3);
  const first = new Date(d.getFullYear(), q * 3, 1);
  const last = new Date(d.getFullYear(), q * 3 + 3, 0);
  return { periodStart: iso(first), periodEnd: iso(last) };
}

// --- Mock template ---

const PERIOD_LABELS: Record<RecapPeriod, string> = {
  weekly: 'this week',
  monthly: 'this month',
  quarterly: 'this quarter',
};

const MOCK_SETUPS: readonly string[] = [
  'opening-range breakouts',
  'VWAP reclaims',
  'momentum continuation plays',
  'earnings gap fades',
];

const MOCK_MISTAKES: readonly string[] = [
  'overtrading after a losing session',
  'chasing entries past the ideal zone',
  'ignoring pre-market levels',
  'holding losers too long',
];

const MOCK_INSIGHTS: readonly string[] = [
  'higher average R-multiples than smaller-sample sessions',
  'tighter stop adherence compared to previous periods',
  'cleaner entries correlated with better outcomes',
];

function buildMockRecap(period: RecapPeriod, periodStart: string, periodEnd: string): RecapData {
  const hash = periodStart.replace(/-/g, '').slice(-4);
  const seed = parseInt(hash, 10) || 1234;

  const tradeCount = 10 + (seed % 30);
  const winCount = Math.round(tradeCount * (0.45 + (seed % 15) / 100));
  const winRate = Math.round((winCount / tradeCount) * 100);
  const netPnl = (seed % 2000) - 500;
  const avgR = (1.1 + (seed % 8) / 10).toFixed(1);
  const setup = MOCK_SETUPS[seed % MOCK_SETUPS.length];
  const mistake = MOCK_MISTAKES[(seed + 1) % MOCK_MISTAKES.length];
  const insight = MOCK_INSIGHTS[(seed + 2) % MOCK_INSIGHTS.length];
  const label = PERIOD_LABELS[period];

  const narrative =
    `During ${label} (${periodStart} – ${periodEnd}), you placed ${tradeCount} trades with a net P&L of $${netPnl.toLocaleString()}. ` +
    `Your strongest pattern was ${setup}. The biggest leak was ${mistake}. ` +
    `Sessions with 5+ trades showed ${insight}.`;

  return {
    period,
    periodStart,
    periodEnd,
    generatedAt: new Date().toISOString(),
    tradeCount,
    narrative,
    keyMetrics: [
      { label: 'Trades', value: String(tradeCount) },
      { label: 'Win rate', value: `${winRate}%` },
      { label: 'Net P&L', value: `$${netPnl.toLocaleString()}` },
      { label: 'Avg R', value: avgR },
    ],
    observations: [
      `Best day: ${(seed % 5) + 1} winning trades in a row.`,
      `${mistake.charAt(0).toUpperCase() + mistake.slice(1)} was the primary edge-leak.`,
      `Tightening risk on sessions with >3 losers could improve overall R by ~0.3.`,
    ],
    isMock: true,
  };
}

// --- localStorage cache helpers ---

const CACHE_KEY = (userId: string, period: RecapPeriod) =>
  `finotaur:journal:recap:${userId}:${period}`;

function loadCached(userId: string, period: RecapPeriod): RecapData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY(userId, period));
    if (!raw) return null;
    return JSON.parse(raw) as RecapData;
  } catch {
    return null;
  }
}

function saveCache(userId: string, period: RecapPeriod, data: RecapData): void {
  try {
    localStorage.setItem(CACHE_KEY(userId, period), JSON.stringify(data));
  } catch {
    // storage quota — silently ignore
  }
}

// --- Hook ---

export function useAIRecap(period: RecapPeriod): {
  recap: RecapData | null;
  isGenerating: boolean;
  error: string | null;
  generate: () => Promise<void>;
  lastGenerated: string | null;
} {
  const { user } = useAuth();
  const userId = user?.id ?? 'anonymous';

  const [recap, setRecap] = useState<RecapData | null>(() => loadCached(userId, period));
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-hydrate from localStorage if userId changes (login)
  useEffect(() => {
    setRecap(loadCached(userId, period));
  }, [userId, period]);

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    const { periodStart, periodEnd } = computePeriodRange(period, new Date());

    try {
      const { data, error: fnError } = await supabase.functions.invoke('journal-ai-recap', {
        body: { period },
      });

      if (fnError || !data) {
        throw fnError ?? new Error('Empty response');
      }

      if (data.error === 'not_implemented') {
        // Edge function is a stub — fall back to mock
        throw new Error('not_implemented');
      }

      const result: RecapData = {
        period,
        periodStart: data.periodStart ?? periodStart,
        periodEnd: data.periodEnd ?? periodEnd,
        generatedAt: data.generatedAt ?? new Date().toISOString(),
        tradeCount: data.tradeCount ?? 0,
        narrative: data.narrative ?? '',
        keyMetrics: data.keyMetrics ?? [],
        observations: data.observations ?? [],
        isMock: false,
      };

      saveCache(userId, period, result);
      setRecap(result);
    } catch {
      // Edge function unavailable or returned 501 — use deterministic mock
      const mock = buildMockRecap(period, periodStart, periodEnd);
      saveCache(userId, period, mock);
      setRecap(mock);
      // No user-visible error — mock is the intended fallback
    } finally {
      setIsGenerating(false);
    }
  }, [period, userId]);

  return {
    recap,
    isGenerating,
    error,
    generate,
    lastGenerated: recap?.generatedAt ?? null,
  };
}
