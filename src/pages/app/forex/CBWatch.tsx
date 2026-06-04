// ============================================================
// src/pages/app/forex/CBWatch.tsx
// Central Bank Watch — PREMIUM page.
// ============================================================

import { PageTemplate } from '@/components/PageTemplate';
import {
  GlassCard,
  SectionHeader,
  GlassTableSkeleton,
  EmptyState,
} from '@/pages/app/crypto/_shared/GlassUI';
import { useForexCBRates } from './_shared/hooks';
import { useSubscription } from '@/hooks/useSubscription';
import ForexUpsellGate from './components/ForexUpsellGate';
import type { CBRate, CarryEntry } from './_shared/types';

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function fmtMeeting(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

/** Format a symbol like "EURJPY" → "EUR/JPY". */
function fmtSymbol(sym: string): string {
  if (sym.length === 6) return `${sym.slice(0, 3)}/${sym.slice(3)}`;
  return sym;
}

// ── Last-change direction badge ───────────────────────────────

function DirBadge({ dir }: { dir: string | null }) {
  if (!dir) return <span className="text-white/20">—</span>;
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

// ── CB rate row ───────────────────────────────────────────────

function CBRow({ bank }: { bank: CBRate }) {
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 px-3 text-xs font-semibold text-white/80">
        {bank.bank}
      </td>
      <td className="py-2.5 px-3 text-xs font-bold text-amber-400 uppercase">
        {bank.currency}
      </td>
      <td className="py-2.5 px-3 text-xs font-mono font-semibold text-white/80 text-right">
        {bank.rate !== null ? `${bank.rate.toFixed(2)}%` : '—'}
      </td>
      <td className="py-2.5 px-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-white/30">{fmtDate(bank.lastChangeDate)}</span>
          <DirBadge dir={bank.lastChangeDir} />
        </div>
      </td>
      <td className="py-2.5 px-3 text-xs text-white/40 text-right whitespace-nowrap">
        {fmtMeeting(bank.nextMeeting)}
      </td>
    </tr>
  );
}

// ── Carry row ─────────────────────────────────────────────────

function CarryRow({ entry }: { entry: CarryEntry }) {
  const color = entry.differential >= 0 ? 'text-emerald-400' : 'text-red-400';
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 px-3 text-xs font-mono font-semibold text-white/80">
        {fmtSymbol(entry.symbol)}
      </td>
      <td className="py-2.5 px-3 text-xs font-bold text-amber-400 uppercase">
        {entry.base}
      </td>
      <td className="py-2.5 px-3 text-xs font-bold text-white/50 uppercase">
        {entry.quote}
      </td>
      <td className={`py-2.5 px-3 text-xs font-mono font-semibold text-right ${color}`}>
        {entry.differential >= 0 ? '+' : '−'}{Math.abs(entry.differential).toFixed(2)}%
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function ForexCBWatch() {
  const { isPremium, isAdmin, isLifetimeUser, isLoading: subLoading } = useSubscription();
  const entitled = isPremium || isAdmin || isLifetimeUser;

  const { data, loading } = useForexCBRates();

  if (!subLoading && !entitled) {
    return (
      <PageTemplate
        title="Central Bank Watch"
        description="Policy rates, upcoming decisions, and carry differentials across the 8 majors."
      >
        <ForexUpsellGate feature="Central Bank Watch" />
      </PageTemplate>
    );
  }

  const unavailable =
    !loading && (!data || data.source === 'unavailable');

  return (
    <PageTemplate
      title="Central Bank Watch"
      description="Policy rates, upcoming decisions, and carry differentials across the 8 majors."
    >
      {loading || subLoading ? (
        <GlassCard padding="md">
          <GlassTableSkeleton rows={8} />
        </GlassCard>
      ) : unavailable ? (
        <GlassCard padding="md">
          <EmptyState
            icon="🏦"
            title="Central bank data is temporarily unavailable."
            description="Rate data refreshes hourly."
          />
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {/* Section 1 — Policy Rates */}
          <GlassCard padding="md">
            <SectionHeader
              title="Policy Rates"
              subtitle="Current benchmark rates for the 8 major central banks"
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {[
                      { label: 'Bank', align: 'left' },
                      { label: 'Currency', align: 'left' },
                      { label: 'Policy Rate', align: 'right' },
                      { label: 'Last Change', align: 'right' },
                      { label: 'Next Meeting', align: 'right' },
                    ].map(({ label, align }) => (
                      <th
                        key={label}
                        className={`pb-2.5 px-3 text-[10px] uppercase tracking-wider text-white/30 font-medium text-${align}`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data!.banks.map((bank) => (
                    <CBRow key={bank.currency} bank={bank} />
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Section 2 — Carry Differentials */}
          {data!.carry.length > 0 && (
            <GlassCard padding="md">
              <SectionHeader
                title="Carry Differentials"
                subtitle="Rate spread between base and quote currency"
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {[
                        { label: 'Pair', align: 'left' },
                        { label: 'Base', align: 'left' },
                        { label: 'Quote', align: 'left' },
                        { label: 'Differential', align: 'right' },
                      ].map(({ label, align }) => (
                        <th
                          key={label}
                          className={`pb-2.5 px-3 text-[10px] uppercase tracking-wider text-white/30 font-medium text-${align}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data!.carry.map((entry) => (
                      <CarryRow key={entry.symbol} entry={entry} />
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* As-of stamp */}
          <p className="text-[10px] text-white/20 text-right">
            As of {data!.asOf} &middot; Source: {data!.source}
          </p>
        </div>
      )}
    </PageTemplate>
  );
}
