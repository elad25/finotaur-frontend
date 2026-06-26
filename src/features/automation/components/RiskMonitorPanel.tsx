// src/features/automation/components/RiskMonitorPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Renders today's risk alerts as ok/warning/breach status cards.
// Uses ds/Card and standard colour conventions.
// ─────────────────────────────────────────────────────────────────────────────

import { ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { cn } from '@/lib/utils';
import type { RiskAlert } from '../lib/automationTypes';

// ── per-status styling ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  ok: {
    icon: ShieldCheck,
    label: 'OK',
    iconClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/20',
    bgClass: 'bg-emerald-500/5',
    textClass: 'text-emerald-400',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    iconClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    bgClass: 'bg-amber-500/5',
    textClass: 'text-amber-400',
  },
  breach: {
    icon: XCircle,
    label: 'Breach',
    iconClass: 'text-red-400',
    borderClass: 'border-red-500/40',
    bgClass: 'bg-red-500/8',
    textClass: 'text-red-400',
  },
} as const;

// ── single alert row ──────────────────────────────────────────────────────────
function AlertRow({ alert }: { alert: RiskAlert }) {
  const cfg = STATUS_CONFIG[alert.status];
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        cfg.borderClass,
        cfg.bgClass,
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', cfg.iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold uppercase tracking-wider', cfg.textClass)}>
            {cfg.label}
          </span>
          <span className="text-xs text-zinc-500">{alert.ruleLabel}</span>
        </div>
        <p className="mt-0.5 text-sm text-zinc-300">{alert.message}</p>
      </div>
    </div>
  );
}

// ── panel ─────────────────────────────────────────────────────────────────────
interface RiskMonitorPanelProps {
  alerts: RiskAlert[];
  /** When true, shows only breach + warning. Hides 'ok' items to reduce noise. */
  hideOk?: boolean;
}

export function RiskMonitorPanel({ alerts, hideOk = false }: RiskMonitorPanelProps) {
  const visible = hideOk ? alerts.filter((a) => a.status !== 'ok') : alerts;

  const breachCount = alerts.filter((a) => a.status === 'breach').length;
  const warningCount = alerts.filter((a) => a.status === 'warning').length;

  if (alerts.length === 0) {
    return (
      <Card padding="compact" className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden="true" />
        <p className="text-sm text-zinc-400">
          No risk rules configured yet. Add a rule below to start monitoring.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* summary banner */}
      {(breachCount > 0 || warningCount > 0) && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium',
            breachCount > 0
              ? 'border-red-500/40 bg-red-500/8 text-red-300'
              : 'border-amber-500/30 bg-amber-500/5 text-amber-300',
          )}
        >
          {breachCount > 0 ? (
            <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {breachCount > 0
            ? `${breachCount} limit${breachCount > 1 ? 's' : ''} breached — desktop agent will pause execution`
            : `${warningCount} limit${warningCount > 1 ? 's' : ''} approaching — review before trading more`}
        </div>
      )}

      {/* alert rows */}
      <div className="space-y-2">
        {visible.map((alert, i) => (
          <AlertRow key={`${alert.ruleId}-${alert.type}-${i}`} alert={alert} />
        ))}
      </div>

      {hideOk && visible.length === 0 && (
        <Card padding="compact" className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden="true" />
          <p className="text-sm text-zinc-400">All risk limits are within bounds.</p>
        </Card>
      )}
    </div>
  );
}
