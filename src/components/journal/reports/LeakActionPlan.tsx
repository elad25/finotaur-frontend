// src/components/journal/reports/LeakActionPlan.tsx
// =====================================================
// AI SUMMARY — "Your action plan" + "Add to My Rules"
// =====================================================
// Generates a personalized 3-bullet action plan for the #1 leak verdict,
// optionally informed by the trader's own written trading rules
// (profiles.risk_settings.trading_rules.text). Reads/writes
// profiles.risk_settings.leak_action_plan (read-merge-write cache), mirroring
// the pattern in RevengeRulesInsights.tsx.
//
// Also exports AddRuleButton — appends verdict.rule to the trader's own
// trading_rules.text (read-merge-write), used inside AISummary's "Your
// rule" box.
// =====================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, RefreshCw, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Card } from '@/components/ds/Card';
import type { Leak } from '@/lib/journal/leakDetector';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Deterministic djb2-style short hash, base36 — mirrors RevengeRulesInsights.tsx. */
function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

interface CachedActionPlan {
  input_hash: string;
  generated_at: string;
  bullets: string[];
}

async function fetchRiskSettings(userId: string): Promise<{
  rulesText: string;
  cached: CachedActionPlan | null;
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select('risk_settings')
    .eq('id', userId)
    .single();

  if (error) throw error;

  const riskSettings = (data?.risk_settings as Record<string, any>) ?? {};
  const rulesText = String(riskSettings?.trading_rules?.text ?? '').trim();

  const rawCache = riskSettings?.leak_action_plan;
  const cached: CachedActionPlan | null =
    rawCache && typeof rawCache === 'object' && Array.isArray(rawCache.bullets)
      ? {
          input_hash: String(rawCache.input_hash ?? ''),
          generated_at: String(rawCache.generated_at ?? ''),
          bullets: rawCache.bullets.filter((b: unknown): b is string => typeof b === 'string'),
        }
      : null;

  return { rulesText, cached };
}

function sanitizeBullets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is string => typeof b === 'string').slice(0, 3);
}

// ─── Small presentational pieces ─────────────────────────────────────────────

function LoadingPanel({ text }: { text: string }) {
  return (
    <Card padding="default">
      <div className="flex items-center justify-center gap-2 py-8">
        <Sparkles className="w-4 h-4 text-gold-primary animate-pulse" />
        <p className="text-sm text-ink-tertiary">{text}</p>
      </div>
    </Card>
  );
}

// ─── AddRuleButton ────────────────────────────────────────────────────────────

interface AddRuleButtonProps {
  rule: string;
}

export function AddRuleButton({ rule }: AddRuleButtonProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const { data: rulesQuery } = useQuery({
    queryKey: ['tradingRules', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('risk_settings')
        .eq('id', userId as string)
        .single();
      if (error) throw error;
      const riskSettings = (data?.risk_settings as Record<string, any>) ?? {};
      return String(riskSettings?.trading_rules?.text ?? '').trim();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const existingText = rulesQuery ?? '';
  const alreadyIncluded = existingText.length > 0 && existingText.toLowerCase().includes(rule.toLowerCase());

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('not_authenticated');
      const { data: cur, error: fetchError } = await supabase
        .from('profiles')
        .select('risk_settings')
        .eq('id', userId)
        .single();
      if (fetchError) throw fetchError;

      const currentSettings = (cur?.risk_settings as Record<string, unknown>) ?? {};
      const currentText = String((currentSettings as any)?.trading_rules?.text ?? '').trim();
      const nextText = currentText ? `${currentText}\n${rule}` : rule;

      const merged = {
        ...currentSettings,
        trading_rules: { text: nextText, updated_at: new Date().toISOString() },
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ risk_settings: merged })
        .eq('id', userId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success('Added to your trading rules');
      queryClient.invalidateQueries({ queryKey: ['tradingRules', userId] });
      queryClient.invalidateQueries({ queryKey: ['revengeRulesText', userId] });
      queryClient.invalidateQueries({ queryKey: ['leakActionPlan', userId] });
    },
    onError: () => {
      toast.error('Could not add this rule right now');
    },
  });

  if (alreadyIncluded) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-gold-border text-[11px] font-medium text-gold-primary opacity-60 cursor-default shrink-0"
      >
        <Check className="w-3 h-3" />
        In your rules
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => addMutation.mutate()}
      disabled={addMutation.isPending || !userId}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-gold-border text-[11px] font-medium text-gold-primary hover:bg-gold-primary/10 transition-colors disabled:opacity-50 shrink-0"
    >
      Add to My Rules
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LeakActionPlanProps {
  verdict: Leak;
}

export default function LeakActionPlan({ verdict }: LeakActionPlanProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const [liveResult, setLiveResult] = useState<{ bullets: string[]; generated_at: string } | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const autoTriggeredRef = useRef(false);

  const { data: settingsQuery, isLoading: settingsLoading } = useQuery({
    queryKey: ['leakActionPlan', userId],
    queryFn: () => fetchRiskSettings(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const rulesText = settingsQuery?.rulesText ?? '';
  const cachedPlan = settingsQuery?.cached ?? null;

  const inputHash = useMemo(
    () => hashString(`${verdict.title}|${Math.round(verdict.costUsd)}|${verdict.sampleSize}|${rulesText}`),
    [verdict.title, verdict.costUsd, verdict.sampleSize, rulesText],
  );

  const generateMutation = useMutation({
    mutationFn: async (): Promise<{ bullets: string[]; generated_at: string }> => {
      const { data, error } = await supabase.functions.invoke('leak-action-plan', {
        body: {
          verdict: {
            family: verdict.family,
            title: verdict.title,
            detail: verdict.detail,
            rule: verdict.rule,
            costUsd: verdict.costUsd,
            sampleSize: verdict.sampleSize,
            shareOfLosses: verdict.shareOfLosses,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      return {
        bullets: sanitizeBullets(data?.data?.bullets),
        generated_at: String(data?.generated_at ?? new Date().toISOString()),
      };
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
          leak_action_plan: { input_hash: inputHash, generated_at: result.generated_at, bullets: result.bullets },
        };

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ risk_settings: merged })
          .eq('id', userId);
        if (updateError) throw updateError;

        queryClient.invalidateQueries({ queryKey: ['leakActionPlan', userId] });
      } catch (persistErr) {
        console.error('Failed to persist leak action plan cache:', persistErr);
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'upgrade_required') {
        setUpgradeRequired(true);
        return;
      }
      toast.error('Could not generate your action plan right now');
    },
  });

  const hasFreshCache = !!cachedPlan && cachedPlan.input_hash === inputHash;

  // Auto-generate once when there's no fresh cache for the current input.
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    if (!userId || settingsLoading) return;
    if (hasFreshCache) return;

    autoTriggeredRef.current = true;
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, settingsLoading, hasFreshCache]);

  const displayed: { bullets: string[]; generated_at: string } | null =
    liveResult ?? (hasFreshCache && cachedPlan ? { bullets: cachedPlan.bullets, generated_at: cachedPlan.generated_at } : null);

  const handleRefresh = () => {
    generateMutation.mutate();
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (upgradeRequired) return null;

  if (!userId || settingsLoading) {
    return <LoadingPanel text="Loading your action plan…" />;
  }

  if (generateMutation.isPending) {
    return <LoadingPanel text="Building your action plan…" />;
  }

  if (!displayed) {
    return (
      <Card padding="default">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Sparkles className="w-5 h-5 text-gold-primary" />
          <p className="text-sm font-semibold text-ink-primary">Your action plan</p>
          <p className="text-xs text-ink-tertiary max-w-[420px]">
            {generateMutation.isError
              ? 'We could not generate your action plan just now.'
              : 'Get a concrete, mechanical plan to fix this leak, built from your own data.'}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-1 flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all hover:scale-105 bg-gold-primary text-black"
          >
            <RefreshCw className="w-4 h-4" />
            {generateMutation.isError ? 'Try Again' : 'Build My Action Plan'}
          </button>
        </div>
      </Card>
    );
  }

  const generatedLabel = (() => {
    try {
      return new Date(displayed.generated_at).toLocaleDateString('en-US', {
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
    <Card padding="default" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-primary">
            Your action plan
          </h3>
          {generatedLabel && <p className="mt-1 text-[11px] text-ink-tertiary">Generated {generatedLabel}</p>}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={generateMutation.isPending}
          aria-label="Refresh action plan"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-ink-tertiary border border-white/[0.08] hover:text-ink-primary hover:border-white/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {displayed.bullets.map((bullet, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-primary/10 text-[11px] font-bold text-gold-primary">
              {idx + 1}
            </span>
            <p className="text-sm text-ink-primary leading-relaxed">{bullet}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
