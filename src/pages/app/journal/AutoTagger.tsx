/**
 * JournalAutoTagger — deterministic rule-based auto-tagging manager.
 *
 * Layout:
 *  1. PageTitle
 *  2. Rules section: RulesList + "New rule" button → opens RuleBuilder inline.
 *     Editing an existing rule re-opens RuleBuilder pre-populated.
 *  3. Preview / Apply section:
 *     - Per-active-rule match count preview table (first 10 trades)
 *     - "Run auto-tagger on all trades" button with confirm dialog
 *     - Progress indicator + result summary after run
 *
 * Apply batching: sequential awaits in chunks of 10 via Promise.all,
 * only for trades where computeAutoTags adds net-new tags (union diff).
 */

import { useState, useMemo } from 'react';
import PageTitle from '@/components/PageTitle';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import RuleBuilder from '@/components/journal/autotag/RuleBuilder';
import RulesList from '@/components/journal/autotag/RulesList';
import { useAutoTagRules } from '@/hooks/useAutoTags';
import { useTrades, useUpdateTrade } from '@/hooks/useTradesData';
import { computeAutoTags, tradeMatchesRule } from '@/lib/journal/autotag';
import type { AutoTagCondition, AutoTagRule } from '@/lib/journal/autotag';
import type { Trade } from '@/hooks/useTradesData';
import { Play, Tag } from 'lucide-react';

// ─── Apply-run state ──────────────────────────────────────────────────────────

type ApplyStatus = 'idle' | 'confirm' | 'running' | 'done' | 'error';

interface ApplyResult {
  taggedTrades: number;
  addedTags: number;
}

// ─── Tiny tag pill (preview table) ────────────────────────────────────────────

function TagPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-gold-primary/10 border border-gold-border px-1.5 py-0.5 text-[10px] font-medium text-gold-primary">
      <Tag size={9} />
      {label}
    </span>
  );
}

// ─── Chunk helper (avoids Promise.all on thousands of mutations at once) ──────

async function inChunks<T>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    await Promise.all(items.slice(i, i + chunkSize).map(fn));
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function JournalAutoTagger() {
  const { rules, isLoading, createRule, updateRule, deleteRule, toggleRule } =
    useAutoTagRules();
  const { data: trades = [] } = useTrades();
  const updateTrade = useUpdateTrade();

  // Form visibility
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoTagRule | null>(null);

  // Apply-run state
  const [applyStatus, setApplyStatus] = useState<ApplyStatus>('idle');
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [applyProgress, setApplyProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  // ── Derived data ────────────────────────────────────────────────────────────

  const activeRules = useMemo(() => rules.filter(r => r.isActive), [rules]);

  /** Per-rule match counts across all trades (for the live count badge). */
  const matchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const rule of rules) {
      counts[rule.id] = trades.filter(t => tradeMatchesRule(t, rule.conditions)).length;
    }
    return counts;
  }, [rules, trades]);

  /**
   * Preview data: first 10 trades with their projected auto-tags.
   * Only considers active rules.
   */
  const previewRows = useMemo(
    () =>
      trades.slice(0, 10).map((trade: Trade) => ({
        trade,
        autoTags: computeAutoTags(trade, activeRules),
      })),
    [trades, activeRules],
  );

  /**
   * Total "new tags" preview: how many unique tag additions would the run make.
   * Used as the confirm-dialog summary.
   */
  const previewImpact = useMemo(() => {
    let willTag = 0;
    let willAdd = 0;
    for (const trade of trades) {
      const newTags = computeAutoTags(trade, activeRules);
      if (newTags.length === 0) continue;
      const existing = new Set(trade.tags ?? []);
      const net = newTags.filter(t => !existing.has(t));
      if (net.length > 0) {
        willTag++;
        willAdd += net.length;
      }
    }
    return { willTag, willAdd };
  }, [trades, activeRules]);

  // ── Apply-run logic ─────────────────────────────────────────────────────────

  async function runApply() {
    setApplyStatus('running');
    setApplyProgress({ done: 0, total: trades.length });
    setApplyResult(null);

    let taggedTrades = 0;
    let addedTags = 0;

    try {
      const tradesNeedingUpdate = trades.filter(trade => {
        const newTags = computeAutoTags(trade, activeRules);
        if (newTags.length === 0) return false;
        const existing = new Set(trade.tags ?? []);
        return newTags.some(t => !existing.has(t));
      });

      await inChunks(tradesNeedingUpdate, 10, async trade => {
        const newTags = computeAutoTags(trade, activeRules);
        const existing = trade.tags ?? [];
        const existingSet = new Set(existing);
        const merged = [...existing, ...newTags.filter(t => !existingSet.has(t))];
        const netNew = merged.length - existing.length;

        await updateTrade.mutateAsync({ id: trade.id, data: { tags: merged } });

        taggedTrades++;
        addedTags += netNew;
        setApplyProgress(prev => (prev ? { ...prev, done: prev.done + 1 } : null));
      });

      setApplyResult({ taggedTrades, addedTags });
      setApplyStatus('done');
    } catch {
      setApplyStatus('error');
    } finally {
      setApplyProgress(null);
    }
  }

  // ── Edit / create helpers ───────────────────────────────────────────────────

  function handleSaveNew(tag: string, conditions: AutoTagCondition[]) {
    createRule(tag, conditions);
    setShowNewForm(false);
  }

  function handleSaveEdit(tag: string, conditions: AutoTagCondition[]) {
    if (!editingRule) return;
    updateRule(editingRule.id, { tag, conditions });
    setEditingRule(null);
  }

  function handleCancelEdit() {
    setEditingRule(null);
  }

  function handleNewRuleClick() {
    setEditingRule(null); // close any open edit
    setShowNewForm(true);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const canApply = activeRules.length > 0 && trades.length > 0 && applyStatus !== 'running';

  return (
    <div className="space-y-6">
      <PageTitle
        title="Auto-Tagger"
        subtitle="Automatically tag trades using deterministic, rule-based matching."
      />

      {/* ── Rules section ── */}
      <Card padding="default" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-primary">Rules</h3>
          {!showNewForm && !editingRule && (
            <Button
              variant="gold"
              size="compact"
              showArrow={false}
              onClick={handleNewRuleClick}
            >
              + New rule
            </Button>
          )}
        </div>

        {/* New-rule form */}
        {showNewForm && (
          <RuleBuilder
            onSave={handleSaveNew}
            onCancel={() => setShowNewForm(false)}
          />
        )}

        {/* Loading state */}
        {isLoading ? (
          <p className="text-xs text-ink-tertiary">Loading rules…</p>
        ) : (
          <RulesList
            rules={rules}
            matchCounts={matchCounts}
            onEdit={rule => {
              setShowNewForm(false);
              setEditingRule(rule);
            }}
            onDelete={rule => deleteRule(rule.id)}
            onToggle={rule => toggleRule(rule.id)}
          />
        )}

        {/* Edit form — rendered below the list */}
        {editingRule && (
          <RuleBuilder
            initial={editingRule}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}
      </Card>

      {/* ── Preview / Apply section ── */}
      <Card padding="default" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-ink-primary">Apply to all trades</h3>
            <p className="text-xs text-ink-tertiary mt-0.5">
              Tags are merged (union, no duplicates) into each trade's existing tags.
              Only active rules run. The operation is safe to repeat.
            </p>
            {applyStatus === 'idle' && previewImpact.willTag > 0 && (
              <p className="text-xs text-gold-primary mt-1">
                Preview: {previewImpact.willTag} trade
                {previewImpact.willTag !== 1 ? 's' : ''} will receive {previewImpact.willAdd}{' '}
                new tag{previewImpact.willAdd !== 1 ? 's' : ''}
              </p>
            )}
            {applyStatus === 'idle' && previewImpact.willTag === 0 && activeRules.length > 0 && (
              <p className="text-xs text-ink-tertiary mt-1">
                All matched tags are already applied — nothing to update.
              </p>
            )}
          </div>

          {/* CTA */}
          {applyStatus !== 'confirm' && (
            <Button
              variant="goldOutline"
              size="compact"
              showArrow={false}
              disabled={!canApply}
              onClick={() => setApplyStatus('confirm')}
            >
              <Play size={13} /> Run auto-tagger
            </Button>
          )}
        </div>

        {/* Confirm dialog (inline) */}
        {applyStatus === 'confirm' && (
          <div className="rounded-lg border border-gold-border bg-surface-1 p-4 space-y-3">
            <p className="text-sm font-medium text-ink-primary">Confirm batch tag update</p>
            <p className="text-xs text-ink-secondary">
              This will apply {activeRules.length} active rule
              {activeRules.length !== 1 ? 's' : ''} across {trades.length} trade
              {trades.length !== 1 ? 's' : ''}. Estimated changes:{' '}
              <span className="text-gold-primary font-medium">
                {previewImpact.willTag} trade{previewImpact.willTag !== 1 ? 's' : ''},{' '}
                {previewImpact.willAdd} tag addition{previewImpact.willAdd !== 1 ? 's' : ''}
              </span>
              . Existing tags are preserved.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="gold"
                size="compact"
                showArrow={false}
                onClick={runApply}
              >
                Confirm & run
              </Button>
              <Button
                variant="goldOutline"
                size="compact"
                onClick={() => setApplyStatus('idle')}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {applyStatus === 'running' && applyProgress && (
          <p className="text-xs text-ink-secondary">
            Applying… {applyProgress.done} / {applyProgress.total} trades processed
          </p>
        )}

        {/* Result summary */}
        {applyStatus === 'done' && applyResult && (
          <p className="text-xs text-emerald-400">
            Done — tagged {applyResult.taggedTrades} trade
            {applyResult.taggedTrades !== 1 ? 's' : ''}, added {applyResult.addedTags} tag
            {applyResult.addedTags !== 1 ? 's' : ''}.{' '}
            <button
              type="button"
              className="underline hover:no-underline"
              onClick={() => setApplyStatus('idle')}
            >
              Dismiss
            </button>
          </p>
        )}
        {applyStatus === 'error' && (
          <p className="text-xs text-red-400">
            Apply failed — check the console for details.{' '}
            <button
              type="button"
              className="underline hover:no-underline"
              onClick={() => setApplyStatus('idle')}
            >
              Retry
            </button>
          </p>
        )}
      </Card>

      {/* ── Preview impact (first 10 trades) ── */}
      <Card padding="default" className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">Preview impact</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">
            Auto-tags each of the 10 most recent trades would receive from active rules.
          </p>
        </div>

        {previewRows.length === 0 ? (
          <p className="text-xs text-ink-tertiary">No trades to preview.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-ink-tertiary border-b border-border-ds-subtle">
                  <th className="text-left pb-2 font-medium pr-3">Symbol</th>
                  <th className="text-left pb-2 font-medium pr-3">Side</th>
                  <th className="text-left pb-2 font-medium pr-3">Outcome</th>
                  <th className="text-left pb-2 font-medium">Auto-tags</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map(({ trade, autoTags }) => (
                  <tr
                    key={trade.id}
                    className="border-b border-border-ds-subtle/50 last:border-0"
                  >
                    <td className="py-1.5 pr-3 font-medium text-ink-primary">{trade.symbol}</td>
                    <td className="py-1.5 pr-3 text-ink-secondary">{trade.side}</td>
                    <td className="py-1.5 pr-3 text-ink-secondary">{trade.outcome ?? 'OPEN'}</td>
                    <td className="py-1.5">
                      {autoTags.length === 0 ? (
                        <span className="text-ink-tertiary italic">none</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {autoTags.map(t => (
                            <TagPill key={t} label={t} />
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
