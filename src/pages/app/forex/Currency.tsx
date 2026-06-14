// ============================================================
// src/pages/app/forex/Currency.tsx
// Currency Macro Cockpit — PREMIUM page.
// Route: /app/forex/currency/:code
// ============================================================

import { useParams } from 'react-router-dom';
import { PageTemplate } from '@/components/PageTemplate';
import {
  GlassCard,
  GlassStat,
  GlassStatSkeleton,
  SectionHeader,
  EmptyState,
} from '@/pages/app/crypto/_shared/GlassUI';
import { useForexMacro } from './_shared/hooks';
import { useSubscriptionStatus } from '@/hooks/useSubscription';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import type { MacroIndicator } from './_shared/types';

// ── Constants ─────────────────────────────────────────────────

const VALID_CURRENCIES = new Set(['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD']);

const CURRENCY_NAMES: Record<string, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  JPY: 'Japanese Yen',
  GBP: 'British Pound',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
  NZD: 'New Zealand Dollar',
};

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function fmtIndicatorValue(val: string | number | null): string {
  if (val === null || val === undefined) return '—';
  return String(val);
}

// ── Direction badge ───────────────────────────────────────────

function DirBadge({ dir }: { dir: string | null }) {
  if (!dir) return null;
  const lower = dir.toLowerCase();
  if (lower === 'hike' || lower === 'up') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase border text-emerald-400 border-emerald-400/30 bg-emerald-400/10">
        Hike
      </span>
    );
  }
  if (lower === 'cut' || lower === 'down') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase border text-red-400 border-red-400/30 bg-red-400/10">
        Cut
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase border text-white/40 border-white/10 bg-white/5">
      Hold
    </span>
  );
}

// ── Indicator card ────────────────────────────────────────────

function IndicatorCard({ ind }: { ind: MacroIndicator }) {
  return (
    <GlassStat
      label={ind.label}
      value={fmtIndicatorValue(ind.value)}
      subValue={ind.date ? `As of ${fmtDate(ind.date)}` : undefined}
    />
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function ForexCurrency() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = (rawCode ?? '').toUpperCase();

  const { isPlatformPaid, isAdmin, isLoading: subLoading } = useSubscriptionStatus();
  const { isAdmin: isStaffAdmin, hasBetaAccess } = useAdminAuth();
  const entitled = isPlatformPaid || isAdmin || isStaffAdmin || hasBetaAccess;

  const fullName = CURRENCY_NAMES[code] ?? code;

  // Render gating before the data hook fires for invalid/unauthorized — keep
  // hook call unconditional to satisfy Rules of Hooks.
  const { data, loading } = useForexMacro(code);

  // Invalid currency — show immediately, no sub check needed
  if (!VALID_CURRENCIES.has(code)) {
    return (
      <PageTemplate
        title="Macro Cockpit"
        description="Policy stance, key indicators, positioning, and AI macro summary."
      >
        <GlassCard padding="md">
          <EmptyState
            icon="❓"
            title="Unknown currency."
            description={`"${code}" is not a supported major. Choose from: USD, EUR, JPY, GBP, AUD, CAD, CHF, NZD.`}
          />
        </GlassCard>
      </PageTemplate>
    );
  }

  // Premium gate
  if (!subLoading && !entitled) {
    return (
      <PageTemplate
        title={`${code} Macro Cockpit`}
        description="Policy stance, key indicators, positioning, and AI macro summary."
      >
        <UpgradeGate feature={`${code} Macro Cockpit`} upgradeTarget="core" />
      </PageTemplate>
    );
  }

  const unavailable = !loading && (!data || data.source === 'unavailable');

  return (
    <PageTemplate
      title={`${code} Macro Cockpit`}
      description="Policy stance, key indicators, positioning, and AI macro summary."
    >
      {/* Currency header */}
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-3xl font-extrabold text-amber-400">{code}</span>
        <span className="text-lg text-white/40">{fullName}</span>
      </div>

      {loading || subLoading ? (
        <div className="space-y-6">
          {/* AI summary skeleton */}
          <GlassCard padding="md">
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-32 bg-white/10 rounded" />
              <div className="h-3 w-full bg-white/[0.06] rounded" />
              <div className="h-3 w-5/6 bg-white/[0.06] rounded" />
              <div className="h-3 w-4/6 bg-white/[0.06] rounded" />
            </div>
          </GlassCard>
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <GlassStatSkeleton key={i} />)}
          </div>
        </div>
      ) : unavailable ? (
        <GlassCard padding="md">
          <EmptyState
            icon="📉"
            title={`Macro data for ${code} is temporarily unavailable.`}
            description="Data refreshes hourly."
          />
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {/* AI Macro Stance */}
          <GlassCard padding="md" glow="amber">
            <SectionHeader title="AI Macro Stance" />
            {data!.aiSummary ? (
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
                {data!.aiSummary}
              </p>
            ) : (
              <EmptyState title="No AI summary available for this currency at this time." />
            )}
          </GlassCard>

          {/* Policy Rate */}
          {data!.policyRate && (
            <GlassCard padding="md">
              <SectionHeader title="Policy Rate" subtitle={data!.policyRate.bank} />
              <div className="flex flex-wrap gap-6 items-start">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
                    Current Rate
                  </p>
                  <p className="text-2xl font-bold font-mono text-amber-400 mt-0.5">
                    {data!.policyRate.rate !== null
                      ? `${data!.policyRate.rate.toFixed(2)}%`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
                    Last Change
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-white/60">
                      {fmtDate(data!.policyRate.lastChangeDate)}
                    </span>
                    <DirBadge dir={data!.policyRate.lastChangeDir} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
                    Next Meeting
                  </p>
                  <p className="text-sm text-white/60 mt-1">
                    {fmtDate(data!.policyRate.nextMeeting)}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Key Indicators */}
          {data!.indicators.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                Key Indicators
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data!.indicators.map((ind) => (
                  <IndicatorCard key={ind.label} ind={ind} />
                ))}
              </div>
            </div>
          )}

          {/* COT Positioning */}
          {data!.cot && (
            <GlassCard padding="md">
              <SectionHeader
                title="Positioning (COT)"
                subtitle={`Report date: ${fmtDate(data!.cot.reportDate)}`}
              />
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
                    Net Position
                  </p>
                  <p
                    className={`text-xl font-bold font-mono mt-0.5 ${
                      data!.cot.net >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {data!.cot.net >= 0
                      ? data!.cot.net.toLocaleString('en-US')
                      : `−${Math.abs(data!.cot.net).toLocaleString('en-US')}`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
                    WoW Change
                  </p>
                  <p
                    className={`text-xl font-bold font-mono mt-0.5 ${
                      data!.cot.wowChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {data!.cot.wowChange >= 0 ? '+' : '−'}
                    {Math.abs(data!.cot.wowChange).toLocaleString('en-US')}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Footer */}
          <p className="text-[10px] text-white/20 text-right">
            Source: {data!.source} &middot; Generated {fmtDate(data!.generated_at)}
          </p>
        </div>
      )}
    </PageTemplate>
  );
}
