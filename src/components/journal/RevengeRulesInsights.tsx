// src/components/journal/RevengeRulesInsights.tsx
// =====================================================
// Revenge Radar — "Your Rules vs. Reality"
// =====================================================
// Compares the trader's own free-text trading rules against measured
// revenge-trading behavior via a personalized AI-generated verdict.
// Reads/writes profiles.risk_settings.trading_rules and
// profiles.risk_settings.revenge_insights (read-merge-write cache).
// =====================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Brain, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import type { Trade } from '@/hooks/useTradesData';
import type { RevengeAnalysis, RevengeReason, RevengeTradeFlag } from '@/lib/journal/revengeDetection';

/** Matches JOURNAL_PANEL from RevengeRadar.tsx / Overview.tsx / TradeCompare.tsx */
const JOURNAL_PANEL =
  'relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]';

const MIN_TRADES_FOR_INSIGHTS = 5;
const RECENT_EPISODES_LIMIT = 8;

// ─── Types ──────────────────────────────────────────────────────────────────

interface RevengeInsightItem {
  title: string;
  severity: 'good' | 'warning' | 'critical';
  body: string;
}

interface RevengeInsightsData {
  adherence_score: number;
  verdict: string;
  insights: RevengeInsightItem[];
  rule_gaps: string[];
}

interface CachedInsights {
  input_hash: string;
  generated_at: string;
  data: RevengeInsightsData;
}

interface RevengeRulesInsightsProps {
  analysis: RevengeAnalysis;
  closedTrades: Trade[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Local (browser timezone) YYYY-MM-DD — mirrors revengeDetection.ts's localDateKey. */
function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Deterministic djb2-style short hash, base36. */
function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

async function fetchRulesAndCache(userId: string): Promise<{ rulesText: string; cached: CachedInsights | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('risk_settings')
    .eq('id', userId)
    .single();

  if (error) throw error;

  const riskSettings = (data?.risk_settings as Record<string, any>) ?? {};
  const rulesText = String(riskSettings?.trading_rules?.text ?? '').trim();

  const rawCache = riskSettings?.revenge_insights;
  const cached: CachedInsights | null =
    rawCache && typeof rawCache === 'object' && rawCache.data
      ? {
          input_hash: String(rawCache.input_hash ?? ''),
          generated_at: String(rawCache.generated_at ?? ''),
          data: rawCache.data as RevengeInsightsData,
        }
      : null;

  return { rulesText, cached };
}

function sanitizeInsightsData(raw: unknown): RevengeInsightsData {
  const obj = (raw ?? {}) as Partial<RevengeInsightsData>;
  const scoreRaw = Number(obj.adherence_score);
  const adherence_score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : 0;
  const verdict = typeof obj.verdict === 'string' ? obj.verdict : '';
  const insights = Array.isArray(obj.insights)
    ? obj.insights
        .filter((i): i is RevengeInsightItem => !!i && typeof i.title === 'string' && typeof i.body === 'string')
        .map((i) => ({
          title: i.title,
          severity: (['good', 'warning', 'critical'] as const).includes(i.severity) ? i.severity : 'warning',
          body: i.body,
        }))
    : [];
  const rule_gaps = Array.isArray(obj.rule_gaps) ? obj.rule_gaps.filter((g): g is string => typeof g === 'string') : [];
  return { adherence_score, verdict, insights, rule_gaps };
}

// ─── Small presentational pieces ─────────────────────────────────────────────

function LoadingPanel({ text }: { text: string }) {
  return (
    <div className={`${JOURNAL_PANEL} p-ds-5`}>
      <div className="flex items-center justify-center gap-2 py-8">
        <Sparkles className="h-4 w-4 text-[#C9A646] animate-pulse" />
        <p className="text-sm text-white/62">{text}</p>
      </div>
    </div>
  );
}

function scoreColors(score: number): { bg: string; border: string; text: string } {
  if (score >= 70) return { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', text: '#34D399' };
  if (score >= 40) return { bg: 'rgba(201,166,70,0.12)', border: 'rgba(201,166,70,0.3)', text: '#C9A646' };
  return { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#F87171' };
}

function severityColor(severity: RevengeInsightItem['severity']): string {
  if (severity === 'good') return '#34D399';
  if (severity === 'critical') return '#F87171';
  return '#C9A646';
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RevengeRulesInsights({ analysis, closedTrades }: RevengeRulesInsightsProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [liveResult, setLiveResult] = useState<{ data: RevengeInsightsData; generated_at: string } | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const autoTriggeredRef = useRef(false);

  const { data: rulesQuery, isLoading: rulesLoading } = useQuery({
    queryKey: ['revengeRulesText', userId],
    queryFn: () => fetchRulesAndCache(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const rulesText = rulesQuery?.rulesText ?? '';
  const cachedInsights = rulesQuery?.cached ?? null;

  // Build the measured-behavior summary from the props (never sent to the AI
  // via anything except the edge function call below).
  const summary = useMemo(() => {
    const lastPoint = analysis.points[analysis.points.length - 1];
    const costOfRevenge = lastPoint ? round2(lastPoint.clean - lastPoint.actual) : 0;

    const reasonsBreakdown: Partial<Record<RevengeReason, number>> = {};
    analysis.flags.forEach((flag) => {
      flag.reasons.forEach((r) => {
        reasonsBreakdown[r] = (reasonsBreakdown[r] ?? 0) + 1;
      });
    });

    const perDayMap = new Map<string, number>();
    closedTrades.forEach((t) => {
      if (!t.open_at) return;
      const key = localDateKey(t.open_at);
      perDayMap.set(key, (perDayMap.get(key) ?? 0) + 1);
    });
    const perDayCounts = Array.from(perDayMap.values());
    const tradesPerDay = {
      medianPerDay: round2(median(perDayCounts)),
      maxPerDay: perDayCounts.length ? Math.max(...perDayCounts) : 0,
      activeDays: perDayMap.size,
    };

    const qtys = closedTrades.map((t) => Math.abs(t.quantity)).filter((q) => Number.isFinite(q) && q > 0);
    const sizing = {
      medianQty: round2(median(qtys)),
      maxQty: qtys.length ? Math.max(...qtys) : 0,
    };

    const tradesById = new Map(closedTrades.map((t) => [t.id, t]));
    const recentEpisodes = Array.from(analysis.flags.values())
      .map((flag) => {
        const trade = tradesById.get(flag.tradeId);
        if (!trade) return null;
        const closeTime = trade.close_at ? new Date(trade.close_at).getTime() : 0;
        return { trade, flag, closeTime };
      })
      .filter((x): x is { trade: Trade; flag: RevengeTradeFlag; closeTime: number } => x !== null)
      .sort((a, b) => b.closeTime - a.closeTime)
      .slice(0, RECENT_EPISODES_LIMIT)
      .map(({ trade, flag }) => ({
        date: trade.close_at ? localDateKey(trade.close_at) : '',
        symbol: trade.symbol,
        minutesAfterLoss: Math.round(flag.minutesAfterLoss),
        reasons: flag.reasons,
        pnl: round2(trade.pnl ?? 0),
        qty: round2(Math.abs(trade.quantity)),
      }));

    return {
      totals: {
        totalTrades: analysis.totalCount,
        revengeCount: analysis.revengeCount,
        revengePnl: round2(analysis.revengePnl),
        revengeWinRate: analysis.revengeWinRate !== null ? round2(analysis.revengeWinRate) : null,
        normalWinRate: analysis.normalWinRate !== null ? round2(analysis.normalWinRate) : null,
        revengeDaysCount: analysis.revengeDays.length,
        costOfRevenge,
      },
      reasonsBreakdown,
      tradesPerDay,
      sizing,
      recentEpisodes,
    };
  }, [analysis, closedTrades]);

  const inputHash = useMemo(
    () => hashString(`${rulesText}|${JSON.stringify(summary.totals)}|${summary.tradesPerDay.activeDays}`),
    [rulesText, summary],
  );

  const generateMutation = useMutation({
    mutationFn: async (): Promise<{ data: RevengeInsightsData; generated_at: string }> => {
      const { data, error } = await supabase.functions.invoke('revenge-insights', {
        body: { summary },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      return { data: sanitizeInsightsData(data.data), generated_at: String(data.generated_at ?? new Date().toISOString()) };
    },
    onSuccess: async (result) => {
      setLiveResult(result);

      if (!userId) return;
      try {
        const { data: cur, error: fetchError } = await supabase
          .from('profiles')
          .select('risk_settings')
          .eq('id', userId)
          .single();

        if (fetchError) throw fetchError;

        const merged = {
          ...((cur?.risk_settings as Record<string, unknown>) ?? {}),
          revenge_insights: { input_hash: inputHash, generated_at: result.generated_at, data: result.data },
        };

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ risk_settings: merged })
          .eq('id', userId);

        if (updateError) throw updateError;

        queryClient.invalidateQueries({ queryKey: ['revengeRulesText', userId] });
      } catch (persistErr) {
        console.error('Failed to persist revenge insights cache:', persistErr);
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'upgrade_required') {
        setUpgradeRequired(true);
        return;
      }
      if (message === 'no_rules') {
        return;
      }
      toast.error('Could not generate insights right now');
    },
  });

  const hasFreshCache = !!cachedInsights && cachedInsights.input_hash === inputHash;

  // Auto-generate once when rules exist, sample size qualifies, and there is
  // no fresh cache for the current input. Guarded so it never loops.
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    if (!userId || rulesLoading) return;
    if (!rulesText) return;
    if (summary.totals.totalTrades < MIN_TRADES_FOR_INSIGHTS) return;
    if (hasFreshCache) return;

    autoTriggeredRef.current = true;
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, rulesLoading, rulesText, hasFreshCache, summary.totals.totalTrades]);

  const displayedInsights: { data: RevengeInsightsData; generated_at: string } | null =
    liveResult ?? (hasFreshCache && cachedInsights ? { data: cachedInsights.data, generated_at: cachedInsights.generated_at } : null);

  const handleRefresh = () => {
    generateMutation.mutate();
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (upgradeRequired) return null;

  if (!userId || rulesLoading) {
    return <LoadingPanel text="Loading your rules…" />;
  }

  if (!rulesText) {
    return (
      <div className={`${JOURNAL_PANEL} p-ds-5`}>
        <div className="flex flex-col items-center gap-ds-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(201,166,70,0.12)]">
            <Brain className="h-7 w-7" style={{ color: '#C9A646' }} />
          </div>
          <p className="text-sm font-semibold text-white">Personal AI Insights</p>
          <p className="text-xs text-white/62 max-w-[420px]">
            Write your trading rules — position size, risk per trade, max trades per day — and the radar will judge
            your actual behavior against them.
          </p>
          <button
            type="button"
            onClick={() => navigate('/app/journal/strategies')}
            className="mt-1 flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #C9A646, #B48C2C)',
              color: '#000',
            }}
          >
            Add My Rules
          </button>
        </div>
      </div>
    );
  }

  if (summary.totals.totalTrades < MIN_TRADES_FOR_INSIGHTS) {
    return (
      <div className={`${JOURNAL_PANEL} p-ds-5`}>
        <p className="text-center text-sm text-white/42 py-8">
          Personal insights unlock after 5 closed trades.
        </p>
      </div>
    );
  }

  if (generateMutation.isPending) {
    return <LoadingPanel text="Analyzing your behavior against your rules…" />;
  }

  if (!displayedInsights) {
    // Auto-generation either hasn't fired yet or failed — show a retry
    // surface instead of an endless loading state.
    return (
      <div className={`${JOURNAL_PANEL} p-ds-5`}>
        <div className="flex flex-col items-center gap-ds-3 py-6 text-center">
          <Sparkles className="h-5 w-5 text-[#C9A646]" />
          <p className="text-sm font-semibold text-white">Your Rules vs. Reality</p>
          <p className="text-xs text-white/62 max-w-[420px]">
            {generateMutation.isError
              ? 'We could not generate your personal insights just now.'
              : 'Generate a personal AI read of how your actual trading matches the rules you wrote.'}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-1 flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #C9A646, #B48C2C)', color: '#000' }}
          >
            <RefreshCw className="h-4 w-4" />
            {generateMutation.isError ? 'Try Again' : 'Analyze My Trading'}
          </button>
        </div>
      </div>
    );
  }

  const { data } = displayedInsights;
  const colors = scoreColors(data.adherence_score);
  const generatedLabel = (() => {
    try {
      return new Date(displayedInsights.generated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  })();

  return (
    <div className={`${JOURNAL_PANEL} p-ds-5`}>
      <div className="flex items-start justify-between gap-ds-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#C9A646]" />
          <span className="text-[14px] font-semibold text-white">Your Rules vs. Reality</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1 rounded-full text-[12px] font-semibold font-mono tabular-nums"
            style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
          >
            {data.adherence_score}/100
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={generateMutation.isPending}
            aria-label="Refresh insights"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white/62 border border-white/[0.08] hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {generatedLabel && (
        <p className="mt-1 text-[11px] text-white/38">Generated {generatedLabel}</p>
      )}

      {data.verdict && (
        <p className="mt-4 text-[13px] italic text-white/80">{data.verdict}</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {data.insights.map((insight, idx) => (
          <div key={idx} className="flex items-start gap-3 rounded-lg bg-white/[0.02] p-3">
            <div
              className="mt-0.5 h-full w-[3px] rounded-full self-stretch"
              style={{ background: severityColor(insight.severity), minHeight: '32px' }}
            />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-white">{insight.title}</p>
              <p className="mt-1 text-[12px] text-white/62">{insight.body}</p>
            </div>
          </div>
        ))}
      </div>

      {data.rule_gaps.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/42">
            Rules you might be missing
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {data.rule_gaps.map((gap, idx) => (
              <li key={idx} className="text-[12px] text-white/55">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
