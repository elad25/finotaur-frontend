// src/pages/app/journal/PropRiskPage.tsx
// ═══════════════════════════════════════════════════════════════════
// Prop Risk dashboard — live drawdown, target progress & recommended
// risk across all prop accounts.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { Gauge, Settings, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePropRisk } from '@/features/prop-risk/usePropRisk';
import { AssignPlanDialog } from '@/features/prop-risk/AssignPlanDialog';
import { PROP_STATUS_META } from '@/features/prop-risk/computePropStatus';
import type { PropRiskRow } from '@/features/prop-risk/usePropRisk';
import type { PropStatus } from '@/features/prop-risk/computePropStatus';

// ── Helpers ───────────────────────────────────────────────────────

function fmtUsd(v: number | null | undefined): string {
  if (v == null) return '--';
  return '$' + Math.round(v).toLocaleString();
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

const TONE_CLASSES: Record<string, string> = {
  good: 'text-green-400',
  warn: 'text-yellow-400',
  danger: 'text-red-400',
  neutral: 'text-muted-foreground',
};

const TONE_BG_CLASSES: Record<string, string> = {
  good: 'bg-green-400/10 text-green-400 border-green-400/30',
  warn: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  danger: 'bg-red-400/10 text-red-400 border-red-400/30',
  neutral: 'bg-base-800 text-muted-foreground border-border',
};

function StatusPill({ status }: { status: PropStatus }) {
  const meta = PROP_STATUS_META[status];
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TONE_BG_CLASSES[meta.tone]}`}
    >
      {meta.label}
    </span>
  );
}

function ProgressBar({
  value,
  colorClass,
}: {
  value: number;
  colorClass: string;
}) {
  const pct = Math.round(clamp01(value) * 100);
  return (
    <div className="h-2 w-full rounded-full bg-base-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ddBarColor(pct: number): string {
  if (pct > 0.5) return 'bg-green-400';
  if (pct > 0.25) return 'bg-yellow-400';
  return 'bg-red-400';
}

// ── Auto-detect hint pill ─────────────────────────────────────────

function AutoDetectPill({ source }: { source: PropRiskRow['resolvedSource'] }) {
  if (source === 'manual') {
    return (
      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-base-800 text-muted-foreground border-border">
        Custom
      </span>
    );
  }
  if (source === 'broker') {
    return (
      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-green-400/10 text-green-400 border-green-400/30">
        Auto · Tradovate
      </span>
    );
  }
  if (source === 'balance') {
    return (
      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-base-800 text-muted-foreground border-border">
        Auto · detected
      </span>
    );
  }
  // 'default' or null with computed data still present
  return (
    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-base-800 text-muted-foreground border-border">
      Auto
    </span>
  );
}

// ── Alert banner ──────────────────────────────────────────────────

function AlertBanner({ rows }: { rows: PropRiskRow[] }) {
  const breached = rows.filter((r) => r.computed?.status === 'breached');
  const atRisk = rows.filter(
    (r) => r.computed?.status === 'at_risk' && !breached.some((b) => b.accountName === r.accountName),
  );

  if (breached.length === 0 && atRisk.length === 0) return null;

  return (
    <div className="space-y-2">
      {breached.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">
              Drawdown breached on {breached.length} account{breached.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {breached.map((r) => r.accountName).join(', ')}
            </p>
          </div>
        </div>
      )}
      {atRisk.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3">
          <ShieldAlert className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">
              At risk on {atRisk.length} account{atRisk.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {atRisk.map((r) => r.accountName).join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary strip ─────────────────────────────────────────────────

function SummaryStrip({ rows }: { rows: PropRiskRow[] }) {
  const mapped = rows.filter((r) => r.computed !== null);
  const onTrack = mapped.filter(
    (r) => r.computed?.status === 'on_track' || r.computed?.status === 'funded' || r.computed?.status === 'target_hit',
  ).length;
  const atRisk = mapped.filter((r) => r.computed?.status === 'at_risk').length;
  const breached = mapped.filter((r) => r.computed?.status === 'breached').length;

  const stats = [
    { label: 'Mapped accounts', value: mapped.length, colorClass: 'text-foreground' },
    { label: 'On track / funded', value: onTrack, colorClass: 'text-green-400' },
    { label: 'At risk', value: atRisk, colorClass: 'text-yellow-400' },
    { label: 'Breached', value: breached, colorClass: 'text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-base-800/50 border border-border rounded-xl p-4"
        >
          <div className={`text-2xl font-bold ${s.colorClass}`}>{s.value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Mapped account card ───────────────────────────────────────────

interface CardProps {
  row: PropRiskRow;
  onEdit: (row: PropRiskRow) => void;
  onAssign: (row: PropRiskRow) => void;
}

function MappedAccountCard({ row, onEdit }: { row: PropRiskRow; onEdit: (r: PropRiskRow) => void }) {
  const c = row.computed!;
  const meta = PROP_STATUS_META[c.status];
  const ddPct = clamp01(c.ddBufferPct);
  const dayPnlVal = c.dayPnl;
  const dayPnlColor = dayPnlVal == null ? '' : dayPnlVal >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="bg-base-800/50 border border-border rounded-xl p-5 space-y-4 hover:border-gold/20 transition-colors">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gold/80 bg-gold/10 border border-gold/20 rounded px-1.5 py-0.5">
              {row.detectedFirmLabel}
            </span>
            {row.planLabel && (
              <span className="text-[10px] text-muted-foreground bg-base-800 border border-border rounded px-1.5 py-0.5">
                {row.planLabel}
              </span>
            )}
            <AutoDetectPill source={row.resolvedSource} />
          </div>
          <p className="text-sm font-semibold text-foreground mt-1 truncate">{row.accountName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {row.env && (
              <span className="text-[10px] text-muted-foreground bg-base-800 border border-border rounded px-1.5 py-0.5 uppercase">
                {row.env}
              </span>
            )}
            <span
              className={`inline-block w-2 h-2 rounded-full ${row.online ? 'bg-green-400' : 'bg-base-600'}`}
              title={row.online ? 'Agent online' : 'Agent offline'}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusPill status={c.status} />
          <button
            onClick={() => onEdit(row)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-base-800 transition-colors"
            title="Override plan manually (optional)"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Equity + day P&L */}
      {c.hasData ? (
        <div className="flex items-baseline gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Current equity</div>
            <div className="text-xl font-bold text-foreground">{fmtUsd(c.currentEquity)}</div>
          </div>
          {dayPnlVal != null && (
            <div>
              <div className="text-xs text-muted-foreground">Day P&amp;L</div>
              <div className={`text-base font-semibold ${dayPnlColor}`}>
                {dayPnlVal >= 0 ? '+' : ''}{fmtUsd(dayPnlVal)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Awaiting live balance sync</p>
      )}

      {/* Drawdown block */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Drawdown buffer</span>
          <span className={TONE_CLASSES[meta.tone]}>
            {fmtUsd(c.ddBufferUsd)} to breach
          </span>
        </div>
        <ProgressBar value={ddPct} colorClass={ddBarColor(ddPct)} />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Buffer {fmtUsd(c.ddBufferUsd)}</span>
          <span>Floor {fmtUsd(c.drawdownFloor)}</span>
        </div>
      </div>

      {/* Target block */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Profit target</span>
          <span>
            {c.passed ? (
              <span className="text-green-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Passed
              </span>
            ) : (
              <span>{fmtUsd(c.profitMade)} / {fmtUsd(c.targetEquity - (c.currentEquity - c.profitMade))}</span>
            )}
          </span>
        </div>
        <ProgressBar value={clamp01(c.targetProgressPct)} colorClass="bg-gold/70" />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Profit {fmtUsd(c.profitMade)}</span>
          <span>Target {fmtUsd(c.recommendation.remainingToTarget)} remaining</span>
        </div>
      </div>

      {/* Daily block */}
      {c.dailyLossLimit != null && (
        <div className="text-xs flex justify-between items-center bg-base-900/50 rounded-lg px-3 py-2">
          <span className="text-muted-foreground">Daily room</span>
          <span className={c.dailyBreached ? 'text-red-400 font-medium' : 'text-foreground font-medium'}>
            {c.dailyBreached ? 'Limit hit' : `${fmtUsd(c.dailyRemaining)} / ${fmtUsd(c.dailyLossLimit)}`}
          </span>
        </div>
      )}

      {/* Recommendation box */}
      <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 space-y-1">
        <div className="text-[10px] font-semibold text-gold uppercase tracking-wide">Recommendation</div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Remaining to target</span>
          <span className="text-foreground font-medium">{fmtUsd(c.recommendation.remainingToTarget)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Risk per trade</span>
          <span className="text-gold font-semibold">{fmtUsd(c.recommendation.recommendedRiskPerTrade)}</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
          {c.recommendation.rationale}
        </p>
      </div>
    </div>
  );
}

function UnsupportedFirmCard({ row, onAssign }: { row: PropRiskRow; onAssign: (r: PropRiskRow) => void }) {
  return (
    <div className="bg-base-800/30 border border-border rounded-xl p-5 space-y-3 opacity-75">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-base-800 border border-border rounded px-1.5 py-0.5">
              {row.detectedFirmLabel || 'Unknown firm'}
            </span>
            {row.env && (
              <span className="text-[10px] text-muted-foreground uppercase">{row.env}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground mt-1">{row.accountName}</p>
        </div>
        <span
          className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1 ${row.online ? 'bg-green-400' : 'bg-base-600'}`}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Unsupported firm — {row.detectedFirmLabel || 'not recognized'}. Set the plan manually to track this account.
      </p>
      <button
        onClick={() => onAssign(row)}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border bg-base-800 text-muted-foreground text-xs font-medium py-2 hover:text-foreground hover:bg-base-700 transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
        Set plan manually
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function PropRiskPage() {
  const { rows, isLoading, assignPlan, removePlan } = usePropRisk();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogRow, setDialogRow] = useState<PropRiskRow | null>(null);

  const openDialog = (row: PropRiskRow) => {
    setDialogRow(row);
    setDialogOpen(true);
  };

  const handleSave = async (firmKey: string, planKey: string, phase: 'evaluation' | 'funded') => {
    if (!dialogRow) return;
    try {
      await assignPlan(dialogRow.accountName, firmKey, planKey, phase);
      toast({ title: 'Plan assigned', description: `${dialogRow.accountName} → ${planKey}` });
    } catch (err) {
      toast({ title: 'Failed to assign plan', description: String(err) });
    }
  };

  // Track previous statuses for transition toasts
  const prevStatusRef = useRef<Record<string, PropStatus>>({});
  useEffect(() => {
    const prev = prevStatusRef.current;
    const next: Record<string, PropStatus> = {};
    for (const row of rows) {
      if (!row.computed) continue;
      const st = row.computed.status;
      next[row.accountName] = st;
      const prevSt = prev[row.accountName];
      if (prevSt && prevSt !== st) {
        if (st === 'breached') {
          toast({ title: `Drawdown breached — ${row.accountName}`, description: 'Do not add more risk.' });
        } else if (st === 'at_risk') {
          toast({ title: `At risk — ${row.accountName}`, description: 'Buffer below 25% of trailing amount.' });
        }
      }
    }
    prevStatusRef.current = next;
  }, [rows]);

  const trackedRows = rows.filter((r) => r.computed !== null);
  const unsupportedRows = rows.filter((r) => r.computed === null);

  return (
    <div className="flex-1 overflow-auto">
      <div className="container max-w-7xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
            <Gauge className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prop Risk</h1>
            <p className="text-sm text-muted-foreground">
              Live drawdown, target progress &amp; recommended risk across your prop accounts
            </p>
          </div>
        </div>

        {/* Alert banner */}
        <AlertBanner rows={rows} />

        {/* Summary strip */}
        <SummaryStrip rows={rows} />

        {/* Loading */}
        {isLoading && rows.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">Loading accounts…</div>
        )}

        {/* No accounts at all */}
        {!isLoading && rows.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Gauge className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No active Tradovate or broker accounts found.</p>
            <p className="text-xs mt-1">Connect an account in the Connections tab to get started.</p>
          </div>
        )}

        {/* Tracked accounts — fully auto-resolved, no user action required */}
        {trackedRows.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Tracked accounts ({trackedRows.length})
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {trackedRows.map((row) => (
                <MappedAccountCard key={row.accountName} row={row} onEdit={openDialog} />
              ))}
            </div>
          </div>
        )}

        {/* Unsupported firm — rare: no catalog match, plan must be set manually */}
        {unsupportedRows.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Unsupported firm ({unsupportedRows.length})
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {unsupportedRows.map((row) => (
                <UnsupportedFirmCard key={row.accountName} row={row} onAssign={openDialog} />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Assign plan dialog */}
      {dialogRow && (
        <AssignPlanDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          accountName={dialogRow.accountName}
          detectedFirmKey={dialogRow.detectedFirmKey}
          currentFirmKey={dialogRow.config?.firm_key}
          currentPlanKey={dialogRow.config?.plan_key}
          currentPhase={
            dialogRow.config?.phase === 'funded' ? 'funded' : 'evaluation'
          }
          onSave={handleSave}
        />
      )}
    </div>
  );
}
