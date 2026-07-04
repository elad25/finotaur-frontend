// src/pages/app/admin/tabs/AICommandCenterTab.tsx
// ============================================
// Admin AI Command Center — surface of the AI Operating System.
//
// Displays pending AI-generated growth/retention recommendations and
// lets the admin approve, dismiss, snooze, or manually trigger agent runs.
//
// Endpoints (all admin-gated on the server):
//   GET  /admin/ai/insights/stats
//   GET  /admin/ai/insights?status=pending&limit=50
//   POST /admin/ai/insights/:id/action  { action, snoozeDays?, draft? }
//   POST /admin/agents/:name/run        { dryRun?: false }
// ============================================

import { useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  Users,
  ShieldAlert,
  BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { Card, Eyebrow } from '@/components/ds/Card';
import { SectionSpinner, Spinner } from '@/components/ds/Spinner';
import { StatsCard } from '@/components/admin/StatsCard';
import { getApiBase } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InsightStats {
  pending?: number;
  approved?: number;
  dismissed?: number;
  snoozed?: number;
  high?: number;
  medium?: number;
  low?: number;
  // API may return any shape — we read defensively
  [key: string]: number | undefined;
}

interface Insight {
  id: string;
  agent_name: string;
  target_user_id: string | null;
  insight_type: string;
  title: string;
  reasoning: string;
  evidence: unknown;
  confidence: number | null;
  risk_score: number | null;
  priority: 'high' | 'medium' | 'low' | string;
  suggested_action: string | null;
  draft_content: string | null;
  status: string;
  created_at: string;
}

type ActionType = 'approve' | 'dismiss' | 'snooze';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getBearerToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = await getBearerToken();
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

function priorityColor(priority: string): string {
  if (priority === 'high') return 'text-red-400 bg-red-400/10';
  if (priority === 'medium') return 'text-yellow-400 bg-yellow-400/10';
  return 'text-gray-400 bg-gray-400/10';
}

function agentLabel(agentName: string): string {
  return agentName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function confidencePct(val: number | null): string {
  if (val == null) return '—';
  return `${Math.round(val * 100)}%`;
}

// ---------------------------------------------------------------------------
// AgentRunButton — handles a single run POST + local feedback
// ---------------------------------------------------------------------------

interface AgentRunButtonProps {
  agentName: 'growth' | 'retention';
  label: string;
  onRunComplete: (msg: string) => void;
}

function AgentRunButton({ agentName, label, onRunComplete }: AgentRunButtonProps) {
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(async () => {
    if (running) return;
    setRunning(true);
    try {
      const result = await apiFetch<{ count?: number; written?: number; message?: string }>(
        `/admin/agents/${agentName}/run`,
        { method: 'POST', body: JSON.stringify({ dryRun: false }) },
      );
      const count = result.count ?? result.written ?? 0;
      onRunComplete(
        `${agentName.charAt(0).toUpperCase() + agentName.slice(1)}: ${count} insight${count !== 1 ? 's' : ''} written`,
      );
    } catch (err) {
      onRunComplete(
        `${agentName} run failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setRunning(false);
    }
  }, [agentName, running, onRunComplete]);

  return (
    <Button
      variant="gold"
      size="sm"
      showArrow={false}
      disabled={running}
      onClick={handleRun}
      className="min-w-[180px] justify-center"
    >
      {running ? (
        <span className="flex items-center gap-2">
          <Spinner size="sm" color="inherit" />
          Running…
        </span>
      ) : (
        label
      )}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// InsightCard — single recommendation row
// ---------------------------------------------------------------------------

interface InsightCardProps {
  insight: Insight;
  onAction: (id: string, action: ActionType) => void;
  actioning: string | null; // id of card currently being actioned
}

function InsightCard({ insight, onAction, actioning }: InsightCardProps) {
  const isActioning = actioning === insight.id;
  const evidenceStr =
    insight.evidence != null ? JSON.stringify(insight.evidence, null, 2) : null;

  return (
    <Card variant="featured" padding="default" className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Eyebrow className="text-[#D4AF37]">{agentLabel(insight.agent_name)}</Eyebrow>
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${priorityColor(insight.priority)}`}
            >
              {insight.priority}
            </span>
            <span className="text-[11px] text-gray-500">
              Confidence: {confidencePct(insight.confidence)}
            </span>
            {insight.risk_score != null && (
              <span className="text-[11px] text-gray-500">
                Risk: {Math.round(insight.risk_score * 100)}%
              </span>
            )}
          </div>
          <h3 className="text-white font-semibold text-base leading-snug mt-1">
            {insight.title}
          </h3>
        </div>
        <span className="text-[11px] text-gray-600 shrink-0 pt-0.5">
          {new Date(insight.created_at).toLocaleDateString('en-US')}
        </span>
      </div>

      {/* Reasoning */}
      <p className="text-sm text-gray-300 leading-relaxed">{insight.reasoning}</p>

      {/* Suggested action */}
      {insight.suggested_action && (
        <div className="bg-[#0E0E0E] border border-gray-800 rounded-md px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
            Suggested action
          </p>
          <p className="text-sm text-gray-200">{insight.suggested_action}</p>
        </div>
      )}

      {/* Draft content */}
      {insight.draft_content && (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
            Draft content
          </p>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
            {insight.draft_content}
          </pre>
        </div>
      )}

      {/* Evidence (collapsible) */}
      {evidenceStr && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-300 select-none">
            Evidence (raw JSON)
          </summary>
          <pre className="mt-2 bg-[#0A0A0A] border border-gray-800 rounded p-3 text-gray-400 overflow-x-auto">
            {evidenceStr}
          </pre>
        </details>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {isActioning ? (
          <Spinner size="sm" />
        ) : (
          <>
            <button
              onClick={() => onAction(insight.id, 'approve')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={() => onAction(insight.id, 'dismiss')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Dismiss
            </button>
            <button
              onClick={() => onAction(insight.id, 'snooze')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-700/40 text-gray-400 border border-gray-700 hover:bg-gray-700/70 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Snooze 7d
            </button>
          </>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

export function AICommandCenterTab() {
  const [stats, setStats] = useState<InsightStats | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, insightsData] = await Promise.all([
        apiFetch<InsightStats>('/admin/ai/insights/stats'),
        apiFetch<{ insights: Insight[] }>('/admin/ai/insights?status=pending&limit=50'),
      ]);

      setStats(statsData);
      setInsights(insightsData.insights ?? []);
    } catch (err) {
      console.error('[AICommandCenterTab] load failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load AI recommendations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunComplete = useCallback(
    (msg: string) => {
      setRunMessage(msg);
      // Refresh feed after a brief moment so newly-written insights appear
      setTimeout(() => loadData(), 800);
      setTimeout(() => setRunMessage(null), 6000);
    },
    [loadData],
  );

  const handleAction = useCallback(
    async (id: string, action: ActionType) => {
      setActioning(id);
      try {
        await apiFetch(`/admin/ai/insights/${id}/action`, {
          method: 'POST',
          body: JSON.stringify(
            action === 'snooze'
              ? { action, snoozeDays: 7 }
              : { action },
          ),
        });
        // Optimistic removal
        setInsights((prev) => prev.filter((i) => i.id !== id));
        // Decrement pending count
        setStats((prev) =>
          prev
            ? { ...prev, pending: Math.max(0, (prev.pending ?? 0) - 1) }
            : prev,
        );
      } catch (err) {
        console.error('[AICommandCenterTab] action failed:', err);
        setError(err instanceof Error ? err.message : 'Action failed');
      } finally {
        setActioning(null);
      }
    },
    [],
  );

  // --- Loading state ---
  if (loading) {
    return (
      <div className="p-8">
        <SectionSpinner label="Loading AI recommendations…" />
      </div>
    );
  }

  // --- Error state ---
  if (error && insights.length === 0) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load AI Command Center</p>
            <p className="text-sm opacity-80 mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 text-xs underline underline-offset-2 hover:opacity-80"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pending = stats?.pending ?? insights.length;
  const highCount = stats?.high ?? insights.filter((i) => i.priority === 'high').length;
  const medCount = stats?.medium ?? insights.filter((i) => i.priority === 'medium').length;
  const lowCount = stats?.low ?? insights.filter((i) => i.priority === 'low').length;

  return (
    <div className="p-8 space-y-8">
      {/* Page header */}
      <header className="flex items-start gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">AI Command Center</h1>
          <p className="text-sm text-gray-400 mt-1">
            Review AI-generated growth and retention recommendations. Approve to act, dismiss to ignore, or snooze for later.
          </p>
        </div>
      </header>

      {/* Run bar */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg px-5 py-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-gray-400 shrink-0">
          <Zap className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-sm font-medium text-white">Run agents</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <AgentRunButton
            agentName="growth"
            label="Run Growth Agent"
            onRunComplete={handleRunComplete}
          />
          <AgentRunButton
            agentName="retention"
            label="Run Retention Agent"
            onRunComplete={handleRunComplete}
          />
        </div>
        {runMessage && (
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-md px-3 py-1.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {runMessage}
          </div>
        )}
      </section>

      {/* KPI strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard
          title="Pending"
          value={pending}
          subtitle="awaiting review"
          icon={BarChart2}
        />
        <StatsCard
          title="High priority"
          value={highCount}
          subtitle="needs attention"
          icon={ShieldAlert}
        />
        <StatsCard
          title="Medium priority"
          value={medCount}
          subtitle="review when able"
          icon={TrendingUp}
        />
        <StatsCard
          title="Low priority"
          value={lowCount}
          subtitle="informational"
          icon={Users}
        />
      </section>

      {/* Inline error (after partial load) */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Recommendations feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Pending Recommendations</h2>
          <span className="text-xs text-gray-500">{insights.length} item{insights.length !== 1 ? 's' : ''}</span>
        </div>

        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-[#D4AF37]" />
            </div>
            <p className="text-white font-semibold mb-1">No pending recommendations</p>
            <p className="text-sm text-gray-500">
              Run an agent above to generate new insights, or check back later.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onAction={handleAction}
                actioning={actioning}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AICommandCenterTab;
