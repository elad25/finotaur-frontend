// src/pages/app/admin/tabs/CopilotEvalTab.tsx
// ============================================
// COPILOT Eval — the Session-3 evaluation scorecard for the Active Advisor
// go/no-go decision.
//
// Reads GET /api/admin/copilot-eval and posts to
// POST /api/admin/copilot-verdicts/regenerate. Both endpoints ship in a
// parallel server PR — this component is coded defensively against the
// documented response shape and tolerates missing/null fields so it
// degrades gracefully while the server-side contract is still settling.
// ============================================

import { useCallback, useEffect, useState } from 'react';
import {
  Sparkles,
  Target,
  DollarSign,
  BarChart3,
  Database,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Badge } from '@/components/ui/badge';
import { Price, Change } from '@/components/ds/NumberDisplay';
import { SkeletonStatRow, SkeletonTable } from '@/components/ds/Skeleton';

// ---------------------------------------------------------------------------
// Types — mirrors the documented GET /api/admin/copilot-eval response.
// Every field that isn't guaranteed to exist yet is typed nullable/optional
// and read defensively below.
// ---------------------------------------------------------------------------

type ThresholdStatus = 'pass' | 'fail' | 'insufficient_data';

interface EvalBatch {
  batch_id: string;
  generated_at: string;
  user_id: string;
  verdicts: number;
}

type VerdictOutcome = 'correct' | 'incorrect' | 'neutral' | 'pending' | 'unpriced';

// Confirmed server contract — verdicts rows have NO asset_class/confidence
// fields (dropped from the original speculative shape).
interface EvalVerdict {
  id: string;
  batch_id: string;
  user_id: string;
  symbol: string;
  underlying: string;
  verdict: string;
  generated_at: string;
  age_days: number | null;
  price_at_issue: number | null;
  latest_price: number | null;
  price_source: string | null;
  return_pct: number | null;
  outcome: VerdictOutcome;
}

interface ByVerdictAgg {
  n: number;
  priced: number;
  hit_rate: number | null;
  avg_return_pct: number | null;
}

// Confirmed server contract — totals live under `summary.overall`, not
// flattened onto `summary` directly. `by_verdict` keys are the verdict
// types (BUY_MORE | HOLD | TRIM | EXIT | HEDGE) but kept as a generic
// Record so the UI doesn't hard-fail if the server adds/renames a type.
interface EvalSummary {
  overall: ByVerdictAgg | null;
  by_verdict: Record<string, ByVerdictAgg>;
}

interface CostServiceRow {
  service: string;
  runs: number;
  total_cost_usd: number;
  avg_cost_per_run: number;
  avg_duration_ms: number;
}

interface EvalCosts {
  services: CostServiceRow[];
  projected_user_month_usd: number | null;
}

interface EvalDifferentiation {
  symbols: number | null;
  distinct_values: number | null;
  spread_index: number | null;
  // Shape of `values` isn't pinned down by the contract yet — not rendered
  // directly, kept as unknown[] so we don't need `any`.
  values: unknown[] | null;
  verdict_mix_index: number | null;
}

/** Server-computed actual values backing the scorecard tiles (confirmed contract). */
interface EvalThresholdActuals {
  hit_rate: number | null;
  cost_user_month_usd: number | null;
  differentiation: number | null;
  batches: number | null;
}

/** Server-computed pass/fail verdicts, keyed exactly per the confirmed contract. */
interface EvalThresholdStatusMap {
  hit_rate: ThresholdStatus | null;
  cost: ThresholdStatus | null;
  differentiation: ThresholdStatus | null;
  data_volume: ThresholdStatus | null;
}

interface EvalThresholds {
  hit_rate_min: number | null;
  cost_user_month_max_usd: number | null;
  differentiation_min: number | null;
  min_batches: number | null;
  status: EvalThresholdStatusMap | null;
  actuals: EvalThresholdActuals | null;
}

interface CopilotEvalResponse {
  batches: EvalBatch[];
  batches_count: number | null;
  verdicts: EvalVerdict[];
  summary: EvalSummary | null;
  costs: EvalCosts | null;
  differentiation: EvalDifferentiation | null;
  thresholds: EvalThresholds | null;
}

interface RegenerateResponse {
  batch_id?: string;
  verdicts?: EvalVerdict[];
}

// ---------------------------------------------------------------------------
// Auth-aware fetch helper — same convention as AIOperationsTab.tsx.
// Tolerates an empty body (the regenerate endpoint may reply 202 with
// nothing to parse).
// ---------------------------------------------------------------------------

async function adminFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({} as { error?: string; message?: string }));
    throw new Error(body.error || body.message || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** hit_rate / differentiation_min etc. are fractions (0-1) — format ×100. */
function formatFractionPct(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${(v * 100).toFixed(decimals)}%`;
}

function formatUsd(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `$${v.toFixed(decimals)}`;
}

function formatIndex(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toFixed(decimals);
}

/**
 * Reads the server-computed status for one scorecard tile, keyed exactly per
 * the confirmed contract (`thresholds.status.hit_rate` / `.cost` /
 * `.differentiation` / `.data_volume`). Falls back to a client-computed
 * pass/fail/insufficient_data only when the server key is absent — the
 * server is always the primary source once it reports a value.
 */
function resolveStatus(
  thresholds: EvalThresholds | null,
  key: keyof EvalThresholdStatusMap,
  fallback: () => ThresholdStatus,
): ThresholdStatus {
  const v = thresholds?.status?.[key];
  if (v === 'pass' || v === 'fail' || v === 'insufficient_data') return v;
  return fallback();
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

const STATUS_BADGE_CLASS: Record<ThresholdStatus, string> = {
  pass: 'bg-green-500/10 text-green-400 border-green-500/20',
  fail: 'bg-red-500/10 text-red-400 border-red-500/20',
  insufficient_data: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const STATUS_LABEL: Record<ThresholdStatus, string> = {
  pass: 'Pass',
  fail: 'Fail',
  insufficient_data: 'Insufficient data',
};

function StatusBadge({ status }: { status: ThresholdStatus }) {
  return <Badge className={STATUS_BADGE_CLASS[status]}>{STATUS_LABEL[status]}</Badge>;
}

const OUTCOME_BADGE_CLASS: Record<VerdictOutcome, string> = {
  correct: 'bg-green-500/10 text-green-400 border-green-500/20',
  incorrect: 'bg-red-500/10 text-red-400 border-red-500/20',
  neutral: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  unpriced: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

function OutcomeBadge({ outcome }: { outcome: VerdictOutcome }) {
  const cls = OUTCOME_BADGE_CLASS[outcome] ?? OUTCOME_BADGE_CLASS.neutral;
  return <Badge className={cls}>{outcome}</Badge>;
}

interface ScorecardTileProps {
  icon: typeof Target;
  label: string;
  valueLabel: string;
  thresholdLabel: string;
  status: ThresholdStatus;
  caption?: string;
}

function ScorecardTile({
  icon: Icon,
  label,
  valueLabel,
  thresholdLabel,
  status,
  caption,
}: ScorecardTileProps) {
  return (
    <Card variant="default" padding="default">
      <div className="flex items-start justify-between mb-ds-3">
        <div className="flex items-center gap-ds-2">
          <Icon className="w-4 h-4 text-gold-primary" />
          <span className="text-[11px] uppercase tracking-[1.5px] text-ink-tertiary">
            {label}
          </span>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="font-mono tabular-nums text-[28px] text-ink-primary leading-none mb-ds-1">
        {valueLabel}
      </div>
      <div className="text-[11px] text-ink-tertiary">Threshold: {thresholdLabel}</div>
      {caption && <div className="text-[11px] text-ink-tertiary mt-ds-1">{caption}</div>}
    </Card>
  );
}

function ErrorAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-ds-4 rounded-[12px] bg-red-500/10 border-[0.5px] border-red-500/20 flex items-center justify-between">
      <div className="flex items-center gap-ds-2">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
        <span className="text-red-400 text-[13px]">{message}</span>
      </div>
      <Button variant="ghost" size="sm" showArrow={false} onClick={onRetry} className="text-[12px]">
        Retry
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CopilotEvalTab() {
  const [data, setData] = useState<CopilotEvalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminFetch<CopilotEvalResponse>('/api/admin/copilot-eval');
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load COPILOT eval data',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      const result = await adminFetch<RegenerateResponse>(
        '/api/admin/copilot-verdicts/regenerate',
        { method: 'POST', body: JSON.stringify({}) },
      );
      toast.success(
        result?.batch_id
          ? `Fresh batch generated (${result.batch_id})`
          : 'Batch generation started',
      );
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to generate a fresh batch',
      );
    } finally {
      setRegenerating(false);
    }
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="p-8 space-y-6">
        <SkeletonStatRow count={4} />
        <SkeletonTable rows={6} cols={5} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8">
        <ErrorAlert message={error} onRetry={() => void fetchData()} />
      </div>
    );
  }

  const batches = data?.batches ?? [];
  const verdicts = data?.verdicts ?? [];
  const summary = data?.summary ?? null;
  const costs = data?.costs ?? null;
  const differentiation = data?.differentiation ?? null;
  const thresholds = data?.thresholds ?? null;

  const minBatches = thresholds?.min_batches ?? 0;
  const insufficientBatches = minBatches > 0 && batches.length < minBatches;

  const sortedVerdicts = [...verdicts].sort(
    (a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
  );
  const byVerdictEntries = Object.entries(summary?.by_verdict ?? {});

  // Displayed actual values: prefer the server's `thresholds.actuals.*`
  // (the authoritative figure the server used to compute pass/fail), fall
  // back to the client-aggregated equivalent only when actuals is absent.
  const actuals = thresholds?.actuals ?? null;
  const hitRateActual = actuals?.hit_rate ?? summary?.overall?.hit_rate ?? null;
  const costActual = actuals?.cost_user_month_usd ?? costs?.projected_user_month_usd ?? null;
  const differentiationActual = actuals?.differentiation ?? differentiation?.spread_index ?? null;
  const dataVolumeActual = actuals?.batches ?? data?.batches_count ?? batches.length;

  const hitRateStatus = resolveStatus(thresholds, 'hit_rate', () => {
    if (insufficientBatches) return 'insufficient_data';
    if (hitRateActual == null || thresholds?.hit_rate_min == null) return 'insufficient_data';
    return hitRateActual >= thresholds.hit_rate_min ? 'pass' : 'fail';
  });

  const costStatus = resolveStatus(thresholds, 'cost', () => {
    if (costActual == null || thresholds?.cost_user_month_max_usd == null) {
      return 'insufficient_data';
    }
    return costActual <= thresholds.cost_user_month_max_usd ? 'pass' : 'fail';
  });

  const differentiationStatus = resolveStatus(thresholds, 'differentiation', () => {
    if (insufficientBatches) return 'insufficient_data';
    if (differentiationActual == null || thresholds?.differentiation_min == null) {
      return 'insufficient_data';
    }
    return differentiationActual >= thresholds.differentiation_min ? 'pass' : 'fail';
  });

  const dataVolumeStatus = resolveStatus(thresholds, 'data_volume', () =>
    insufficientBatches ? 'insufficient_data' : 'pass',
  );

  const diffCaption =
    differentiation?.symbols != null && differentiation?.distinct_values != null
      ? `${differentiation.symbols} symbols, ${differentiation.distinct_values} distinct values`
      : undefined;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start gap-4 flex-wrap justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-gold-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-gold-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-ink-primary">COPILOT Eval</h1>
            <p className="text-sm text-ink-tertiary mt-1 max-w-2xl">
              Session-3 evaluation scorecard for the Active Advisor go/no-go decision —
              verdict accuracy, projected per-user cost, and output differentiation
              against the shipping thresholds.
            </p>
          </div>
        </div>
        <Button
          variant="goldOutline"
          size="sm"
          showArrow={false}
          onClick={() => void handleRegenerate()}
          disabled={regenerating}
        >
          {regenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Generate fresh batch
        </Button>
      </header>

      {error && (
        <ErrorAlert message={error} onRetry={() => void fetchData()} />
      )}

      {insufficientBatches && (
        <div className="p-ds-3 rounded-[12px] bg-amber-500/10 border-[0.5px] border-amber-500/20 flex items-center gap-ds-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-amber-400 text-[13px]">
            Collecting data — {batches.length} of {minBatches} weekly batches collected.
            Scorecard thresholds need at least {minBatches} batches before a reliable
            go/no-go call.
          </span>
        </div>
      )}

      {/* Scorecard */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScorecardTile
          icon={Target}
          label="Verdict hit-rate"
          valueLabel={formatFractionPct(hitRateActual)}
          thresholdLabel={
            thresholds?.hit_rate_min != null ? `≥ ${formatFractionPct(thresholds.hit_rate_min)}` : '—'
          }
          status={hitRateStatus}
        />
        <ScorecardTile
          icon={DollarSign}
          label="Cost / user / month"
          valueLabel={formatUsd(costActual)}
          thresholdLabel={
            thresholds?.cost_user_month_max_usd != null
              ? `≤ ${formatUsd(thresholds.cost_user_month_max_usd)}`
              : '—'
          }
          status={costStatus}
        />
        <ScorecardTile
          icon={BarChart3}
          label="Differentiation"
          valueLabel={formatIndex(differentiationActual)}
          thresholdLabel={
            thresholds?.differentiation_min != null
              ? `≥ ${formatIndex(thresholds.differentiation_min)}`
              : '—'
          }
          status={differentiationStatus}
          caption={diffCaption}
        />
        <ScorecardTile
          icon={Database}
          label="Data volume"
          valueLabel={`${dataVolumeActual}`}
          thresholdLabel={minBatches > 0 ? `≥ ${minBatches} batches` : '—'}
          status={dataVolumeStatus}
        />
      </section>

      {/* By verdict type */}
      <section className="bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] overflow-hidden">
        <header className="px-5 py-3 border-b border-border-ds-subtle">
          <h3 className="text-ink-primary font-semibold">By verdict type</h3>
        </header>
        {byVerdictEntries.length === 0 ? (
          <p className="text-sm text-ink-tertiary text-center py-8">
            No verdict-type breakdown yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-ink-tertiary text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-2 font-medium">Type</th>
                <th className="text-right px-5 py-2 font-medium">N</th>
                <th className="text-right px-5 py-2 font-medium">Priced</th>
                <th className="text-right px-5 py-2 font-medium">Hit-rate</th>
                <th className="text-right px-5 py-2 font-medium">Avg return %</th>
              </tr>
            </thead>
            <tbody>
              {byVerdictEntries.map(([type, agg]) => (
                <tr key={type} className="border-t border-border-ds-subtle hover:bg-white/[0.02]">
                  <td className="px-5 py-2 text-ink-primary">{type}</td>
                  <td className="text-right px-5 py-2 text-ink-secondary">{agg.n}</td>
                  <td className="text-right px-5 py-2 text-ink-secondary">{agg.priced}</td>
                  <td className="text-right px-5 py-2 text-gold-primary font-medium">
                    {formatFractionPct(agg.hit_rate)}
                  </td>
                  <td className="text-right px-5 py-2">
                    {agg.avg_return_pct != null ? (
                      <Change value={agg.avg_return_pct} format="percent" decimals={2} />
                    ) : (
                      <span className="text-ink-tertiary">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Verdicts detail */}
      <section className="bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] overflow-hidden">
        <header className="px-5 py-3 border-b border-border-ds-subtle flex items-baseline justify-between gap-2 flex-wrap">
          <h3 className="text-ink-primary font-semibold">Verdicts</h3>
          <span className="text-[11px] text-ink-tertiary">
            {sortedVerdicts.length} verdicts, newest first
          </span>
        </header>
        {sortedVerdicts.length === 0 ? (
          <p className="text-sm text-ink-tertiary text-center py-8">
            No verdicts recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-ink-tertiary text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">Symbol</th>
                  <th className="text-left px-5 py-2 font-medium">Verdict</th>
                  <th className="text-right px-5 py-2 font-medium">Price @ issue</th>
                  <th className="text-right px-5 py-2 font-medium">Latest</th>
                  <th className="text-right px-5 py-2 font-medium">Return %</th>
                  <th className="text-right px-5 py-2 font-medium">Age</th>
                  <th className="text-left px-5 py-2 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {sortedVerdicts.map((v, idx) => (
                  <tr
                    key={v.id || `${v.batch_id}-${v.symbol}-${idx}`}
                    className="border-t border-border-ds-subtle hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-2">
                      <div className="text-ink-primary font-medium">{v.symbol}</div>
                      {v.underlying && v.underlying !== v.symbol && (
                        <div className="text-xs text-ink-tertiary">{v.underlying}</div>
                      )}
                    </td>
                    <td className="px-5 py-2 text-ink-secondary">{v.verdict}</td>
                    <td className="text-right px-5 py-2">
                      {v.price_at_issue != null ? (
                        <Price value={v.price_at_issue} size="small" format="currency" />
                      ) : (
                        <span className="text-ink-tertiary">—</span>
                      )}
                    </td>
                    <td className="text-right px-5 py-2">
                      {v.latest_price != null ? (
                        <Price value={v.latest_price} size="small" format="currency" />
                      ) : (
                        <span className="text-ink-tertiary">—</span>
                      )}
                    </td>
                    <td className="text-right px-5 py-2">
                      {v.return_pct != null ? (
                        <Change value={v.return_pct} format="percent" decimals={2} />
                      ) : (
                        <span className="text-ink-tertiary">—</span>
                      )}
                    </td>
                    <td className="text-right px-5 py-2 text-ink-tertiary">
                      {v.age_days != null ? `${v.age_days}d` : '—'}
                    </td>
                    <td className="px-5 py-2">
                      <OutcomeBadge outcome={v.outcome} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Costs */}
      <section className="bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] overflow-hidden">
        <header className="px-5 py-3 border-b border-border-ds-subtle flex items-baseline justify-between gap-2 flex-wrap">
          <h3 className="text-ink-primary font-semibold">Costs</h3>
          <span className="text-[13px] text-gold-primary font-medium">
            Projected: {formatUsd(costActual)} / user / month
          </span>
        </header>
        {(costs?.services.length ?? 0) === 0 ? (
          <p className="text-sm text-ink-tertiary text-center py-8">
            No cost data recorded yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-ink-tertiary text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-2 font-medium">Service</th>
                <th className="text-right px-5 py-2 font-medium">Runs</th>
                <th className="text-right px-5 py-2 font-medium">Total cost</th>
                <th className="text-right px-5 py-2 font-medium">Avg / run</th>
                <th className="text-right px-5 py-2 font-medium">Avg duration</th>
              </tr>
            </thead>
            <tbody>
              {(costs?.services ?? []).map((row) => (
                <tr key={row.service} className="border-t border-border-ds-subtle hover:bg-white/[0.02]">
                  <td className="px-5 py-2 text-ink-primary">{row.service}</td>
                  <td className="text-right px-5 py-2 text-ink-secondary">
                    {row.runs.toLocaleString('en-US')}
                  </td>
                  <td className="text-right px-5 py-2 text-gold-primary font-medium">
                    {formatUsd(row.total_cost_usd, 4)}
                  </td>
                  <td className="text-right px-5 py-2 text-ink-secondary">
                    {formatUsd(row.avg_cost_per_run, 4)}
                  </td>
                  <td className="text-right px-5 py-2 text-ink-tertiary">
                    {Number.isFinite(row.avg_duration_ms) ? `${Math.round(row.avg_duration_ms)}ms` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default CopilotEvalTab;
