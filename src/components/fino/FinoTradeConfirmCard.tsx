// src/components/fino/FinoTradeConfirmCard.tsx
// Editable confirmation card shown after FINO extracts a trade from a screenshot.
// Mirrors FinoActionBar's phase/auto-clear style; uses DS Button + Card + ui/Input/Select.

import { useCallback, useRef, useState } from 'react';
import { CheckCircle, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { TradeExtraction } from '@/services/aiCopilotApi';
import { uploadScreenshot } from '@/lib/trades';
import { createTrade } from '@/lib/trades';
import { compressImageFile, buildCompletedTradePayload } from '@/lib/fino/screenshotTrade';
import type { TradeConfirmFields } from '@/lib/fino/screenshotTrade';
import { useStrategiesOptimized, useCreateStrategyOptimized } from '@/hooks/useStrategies';
import { useAuth } from '@/hooks/useAuth';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FinoTradeConfirmCardProps {
  extraction: TradeExtraction;
  /** Original file so we can upload it on Approve */
  file: File;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Phase type
// ---------------------------------------------------------------------------

type Phase = 'editing' | 'submitting' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ASSET_CLASS_OPTIONS: { value: string; label: string }[] = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'futures', label: 'Futures' },
  { value: 'options', label: 'Options' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'forex', label: 'Forex' },
];

function numOrEmpty(v: number | null): string {
  return v != null ? String(v) : '';
}

function parseNum(s: string): number | null {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Fields that are required before Approve is enabled. */
const REQUIRED_FIELDS: (keyof TradeConfirmFields)[] = [
  'symbol',
  'side',
  'entry_price',
  'exit_price',
  'stop_price',
  'quantity',
];

function isReady(fields: TradeConfirmFields): boolean {
  return REQUIRED_FIELDS.every((k) => {
    const v = fields[k];
    if (v == null || v === '') return false;
    if (k === 'quantity') {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) && n > 0;
    }
    return true;
  });
}

/** Returns true if the field name is in the extraction.missing list. */
function isMissing(name: string, missing: string[]): boolean {
  return missing.includes(name);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FinoTradeConfirmCard({
  extraction,
  file,
  onClose,
}: FinoTradeConfirmCardProps) {
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed form from extraction
  const [form, setForm] = useState<TradeConfirmFields>({
    symbol: extraction.symbol ?? '',
    side: extraction.side ?? 'LONG',
    asset_class: extraction.asset_class ?? 'stock',
    entry_price: extraction.entry_price,
    exit_price: extraction.exit_price ?? extraction.take_profit_price ?? null,
    stop_price: extraction.stop_price,
    take_profit_price: extraction.take_profit_price,
    quantity: extraction.quantity,
    fees: null,
  });

  // Tags accepted by the user from FINO's suggested_tags (FINOTAUR-tier only).
  // Initialized empty — user must actively click chips to accept.
  const [acceptedTags, setAcceptedTags] = useState<string[]>([]);

  // Strategy linking — use the same proven hook + userId path as the journal.
  const { getEffectiveUserId } = useAuth();
  const userId = getEffectiveUserId();
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const { data: strategies = [] } = useStrategiesOptimized(userId ?? undefined);
  const createStrategy = useCreateStrategyOptimized();
  const [newStrategyName, setNewStrategyName] = useState('');

  const handleCreateStrategy = async () => {
    const name = newStrategyName.trim();
    if (!name || !userId) return;
    try {
      const created = await createStrategy.mutateAsync({ user_id: userId, name });
      if (created?.id) setStrategyId(created.id);
      setNewStrategyName('');
    } catch {
      // mutation already shows an error toast
    }
  };

  const toggleTag = (tag: string) => {
    setAcceptedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const [phase, setPhase] = useState<Phase>('editing');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const scheduleAutoClear = useCallback((ms: number) => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      onClose();
    }, ms);
  }, [onClose]);

  // ---- Setters ----

  const setField = <K extends keyof TradeConfirmFields>(
    key: K,
    value: TradeConfirmFields[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  // ---- Approve ----

  const handleApprove = useCallback(async () => {
    if (phase !== 'editing') return;
    setPhase('submitting');

    try {
      // 1. Re-compress the original file to get a clean jpeg for upload
      let screenshotUrl: string | null = null;
      try {
        const { imageBase64, mediaType } = await compressImageFile(file);
        // Convert base64 back to a Blob/File for uploadScreenshot
        const binary = atob(imageBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const uploadFile = new File([bytes], 'screenshot.jpg', { type: mediaType });
        screenshotUrl = await uploadScreenshot(uploadFile);
      } catch {
        // Non-fatal — proceed without screenshot
        screenshotUrl = null;
      }

      // 2. Build payload (merge accepted tags and strategy; buildCompletedTradePayload sets tags:[] by default)
      const payload = {
        ...buildCompletedTradePayload(form, screenshotUrl),
        ...(acceptedTags.length > 0 ? { tags: acceptedTags } : {}),
        ...(strategyId ? { strategy_id: strategyId } : {}),
      };

      // 3. Insert trade
      const result = await createTrade(payload);
      if (!result.success) throw new Error(result.error ?? 'Failed to create trade');

      setPhase('success');
      scheduleAutoClear(6_000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMsg(msg);
      setPhase('error');
      scheduleAutoClear(6_000);
    }
  }, [phase, form, file, acceptedTags, strategyId, scheduleAutoClear]);

  // ---- exitFromTarget: exit was auto-defaulted from take_profit_price ----
  const exitFromTarget =
    extraction.exit_price == null && extraction.take_profit_price != null;

  // ---- Highlight class for missing fields ----

  const missingCls = (name: string) =>
    isMissing(name, extraction.missing)
      ? 'border-amber-500/60 focus-visible:ring-amber-500/40'
      : '';

  // ---- Render: success ----

  if (phase === 'success') {
    return (
      <Card variant="featured" padding="compact" className="mx-4 mb-2 animate-in fade-in">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Trade added to your journal</span>
          <a
            href="/app/journal"
            className="ml-auto flex items-center gap-1 text-[11px] text-gold-primary hover:underline"
          >
            View journal <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </Card>
    );
  }

  // ---- Render: error ----

  if (phase === 'error') {
    return (
      <Card variant="default" padding="compact" className="mx-4 mb-2 animate-in fade-in">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span className="text-xs text-red-400">{errorMsg || 'Failed to add trade'}</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-[11px] text-ink-secondary hover:text-ink-primary"
          >
            Dismiss
          </button>
        </div>
      </Card>
    );
  }

  // ---- Render: editing / submitting ----

  const ready = isReady(form);

  return (
    <Card variant="featured" padding="compact" className="mx-4 mb-2 animate-in fade-in">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-gold-primary">Confirm extracted trade</span>
        <button
          type="button"
          onClick={onClose}
          disabled={phase === 'submitting'}
          className="text-[11px] text-ink-secondary hover:text-ink-primary disabled:opacity-40"
        >
          Cancel
        </button>
      </div>

      {/* Form grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Symbol */}
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-tertiary">
            Symbol {isMissing('symbol', extraction.missing) && <span className="text-amber-400">*</span>}
          </label>
          <Input
            value={form.symbol}
            onChange={(e) => setField('symbol', e.target.value.toUpperCase())}
            placeholder="e.g. NQ, AAPL"
            className={cn('h-8 text-xs', missingCls('symbol'))}
            disabled={phase === 'submitting'}
          />
        </div>

        {/* Side toggle */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-tertiary">Side</label>
          <div className="flex h-8 rounded-md border border-input overflow-hidden text-xs">
            {(['LONG', 'SHORT'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setField('side', s)}
                disabled={phase === 'submitting'}
                className={cn(
                  'flex-1 transition-colors font-medium',
                  form.side === s
                    ? s === 'LONG'
                      ? 'bg-emerald-600/80 text-white'
                      : 'bg-red-600/80 text-white'
                    : 'bg-background text-ink-secondary hover:bg-accent',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Asset class */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-tertiary">Asset class</label>
          <Select
            value={form.asset_class}
            onValueChange={(v) => setField('asset_class', v)}
            disabled={phase === 'submitting'}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_CLASS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Entry */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-tertiary">
            Entry {isMissing('entry_price', extraction.missing) && <span className="text-amber-400">*</span>}
          </label>
          <Input
            type="text"
            inputMode="decimal"
            value={numOrEmpty(form.entry_price)}
            onChange={(e) => setField('entry_price', parseNum(e.target.value))}
            placeholder="0.00"
            className={cn('h-8 text-xs no-spinner', missingCls('entry_price'))}
            disabled={phase === 'submitting'}
          />
        </div>

        {/* Exit */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-tertiary">
            Exit {(form.exit_price == null || form.exit_price === '') && <span className="text-amber-400">*</span>}
          </label>
          <Input
            type="text"
            inputMode="decimal"
            value={numOrEmpty(form.exit_price)}
            onChange={(e) => setField('exit_price', parseNum(e.target.value))}
            placeholder="0.00"
            className={cn('h-8 text-xs no-spinner', missingCls('exit_price'))}
            disabled={phase === 'submitting'}
          />
          {exitFromTarget && (
            <span className="mt-0.5 block text-[10px] text-amber-400">Exit set to target — edit if it closed elsewhere</span>
          )}
        </div>

        {/* Stop */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-tertiary">
            Stop {isMissing('stop_price', extraction.missing) && <span className="text-amber-400">*</span>}
          </label>
          <Input
            type="text"
            inputMode="decimal"
            value={numOrEmpty(form.stop_price)}
            onChange={(e) => setField('stop_price', parseNum(e.target.value))}
            placeholder="0.00"
            className={cn('h-8 text-xs no-spinner', missingCls('stop_price'))}
            disabled={phase === 'submitting'}
          />
        </div>

        {/* Take profit */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-tertiary">Target</label>
          <Input
            type="text"
            inputMode="decimal"
            value={numOrEmpty(form.take_profit_price)}
            onChange={(e) => setField('take_profit_price', parseNum(e.target.value))}
            placeholder="0.00"
            className="h-8 text-xs no-spinner"
            disabled={phase === 'submitting'}
          />
        </div>

        {/* Quantity */}
        <div className="flex flex-col gap-1">
          {(() => {
            const qtyInvalid = !(typeof form.quantity === 'number' && form.quantity > 0);
            return (
              <>
                <label className="text-[10px] uppercase tracking-wider text-ink-tertiary">
                  Position Size {qtyInvalid && <span className="text-amber-400">*</span>}
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={numOrEmpty(form.quantity)}
                  onChange={(e) => setField('quantity', parseNum(e.target.value))}
                  placeholder="1"
                  className={cn(
                    'h-8 text-xs no-spinner',
                    missingCls('quantity'),
                    qtyInvalid ? 'border-amber-500/60 focus-visible:ring-amber-500/40' : '',
                  )}
                  disabled={phase === 'submitting'}
                />
                {qtyInvalid && (
                  <span className="text-[10px] text-amber-400">Required for P&amp;L</span>
                )}
              </>
            );
          })()}
        </div>

        {/* Fees */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-tertiary">Fees</label>
          <Input
            type="text"
            inputMode="decimal"
            value={numOrEmpty(form.fees ?? null)}
            onChange={(e) => setField('fees', parseNum(e.target.value))}
            placeholder="0.00"
            className="h-8 text-xs no-spinner"
            disabled={phase === 'submitting'}
          />
        </div>

        {/* Strategy */}
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-tertiary">Strategy</label>
          <Select
            value={strategyId ?? 'none'}
            onValueChange={(v) => setStrategyId(v === 'none' ? null : v)}
            disabled={phase === 'submitting'}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">
                No strategy
              </SelectItem>
              {strategies.map((s: { id: string; name: string }) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-1 flex items-center gap-1.5">
            <Input
              type="text"
              value={newStrategyName}
              onChange={(e) => setNewStrategyName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateStrategy(); } }}
              placeholder="New strategy name"
              disabled={phase === 'submitting' || createStrategy.isPending}
              className="h-8 flex-1 text-xs no-spinner"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleCreateStrategy}
              disabled={!newStrategyName.trim() || !userId || phase === 'submitting' || createStrategy.isPending}
              className="h-8 px-2 text-xs"
            >
              {createStrategy.isPending ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      </div>

      {/* AI notes */}
      {extraction.notes && (
        <p className="mt-2 text-[10px] italic text-ink-tertiary">{extraction.notes}</p>
      )}

      {/* Missing fields hint */}
      {extraction.missing.length > 0 && (
        <p className="mt-1 text-[10px] text-amber-400">
          <span className="font-medium">Needs your input:</span>{' '}
          {extraction.missing.join(', ')}
        </p>
      )}

      {/* FINOTAUR-tier: FINO's read (analysis note) */}
      {extraction.analysis_note ? (
        <div className="mt-2 rounded-md border border-gold-primary/20 bg-gold-primary/5 px-2.5 py-2">
          <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold-primary">
            FINO&apos;s read
          </p>
          <p className="text-[10px] leading-relaxed text-ink-secondary">
            {extraction.analysis_note}
          </p>
        </div>
      ) : null}

      {/* FINOTAUR-tier: suggested tag chips */}
      {extraction.suggested_tags && extraction.suggested_tags.length > 0 ? (
        <div className="mt-2">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-ink-tertiary">
            Suggested tags — click to add
          </p>
          <div className="flex flex-wrap gap-1">
            {extraction.suggested_tags.map((tag) => {
              const selected = acceptedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  disabled={phase === 'submitting'}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40',
                    selected
                      ? 'border-gold-primary bg-gold-primary/15 text-gold-primary'
                      : 'border-input bg-background text-ink-secondary hover:border-gold-primary/50 hover:text-ink-primary',
                  )}
                >
                  {selected ? '✓ ' : ''}{tag}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Approve */}
      <Button
        variant="gold"
        size="sm"
        showArrow={false}
        onClick={handleApprove}
        disabled={!ready || phase === 'submitting'}
        className="mt-3 w-full"
      >
        {phase === 'submitting' ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Adding trade…
          </span>
        ) : (
          'Approve and add to journal'
        )}
      </Button>
    </Card>
  );
}
