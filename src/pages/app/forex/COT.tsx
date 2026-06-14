// ============================================================
// src/pages/app/forex/COT.tsx
// CFTC Commitment of Traders — PREMIUM page.
// ============================================================

import { PageTemplate } from '@/components/PageTemplate';
import {
  GlassCard,
  GlassTableSkeleton,
  EmptyState,
} from '@/pages/app/crypto/_shared/GlassUI';
import { useForexCOT } from './_shared/hooks';
import { useSubscriptionStatus } from '@/hooks/useSubscription';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import type { COTPosition } from './_shared/types';

// ── Helpers ───────────────────────────────────────────────────

/** Format large numbers with K/M suffix. */
function fmtNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

/** U+2212 minus for negative values. */
function fmtSigned(n: number): string {
  return n < 0 ? `−${fmtNum(Math.abs(n))}` : `+${fmtNum(n)}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch {
    return iso;
  }
}

// ── Row ───────────────────────────────────────────────────────

function COTRow({ pos }: { pos: COTPosition }) {
  const netColor = pos.net >= 0 ? 'text-emerald-400' : 'text-red-400';
  const wowColor = pos.wowChange >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 px-3 text-xs font-bold text-white/80 uppercase">
        {pos.currency}
      </td>
      <td className={`py-2.5 px-3 text-xs font-mono font-semibold text-right ${netColor}`}>
        {pos.net >= 0 ? fmtNum(pos.net) : `−${fmtNum(Math.abs(pos.net))}`}
      </td>
      <td className={`py-2.5 px-3 text-xs font-mono font-semibold text-right ${wowColor}`}>
        {fmtSigned(pos.wowChange)}
      </td>
      <td className="py-2.5 px-3 text-xs font-mono text-white/50 text-right">
        {fmtNum(pos.noncommLong)}
      </td>
      <td className="py-2.5 px-3 text-xs font-mono text-white/50 text-right">
        {fmtNum(pos.noncommShort)}
      </td>
      <td className="py-2.5 px-3 text-xs font-mono text-white/40 text-right">
        {fmtNum(pos.openInterest)}
      </td>
      <td className="py-2.5 px-3 text-xs text-white/30 text-right whitespace-nowrap">
        {fmtDate(pos.reportDate)}
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function ForexCOT() {
  const { isPlatformPaid, isAdmin, isLoading: subLoading } = useSubscriptionStatus();
  const { isAdmin: isStaffAdmin, hasBetaAccess } = useAdminAuth();
  const entitled = isPlatformPaid || isAdmin || isStaffAdmin || hasBetaAccess;

  const { data, loading } = useForexCOT();

  if (!subLoading && !entitled) {
    return (
      <PageTemplate
        title="COT Positioning"
        description="CFTC Commitment of Traders — speculative net positioning in FX futures."
      >
        <UpgradeGate feature="COT Positioning" upgradeTarget="core" />
      </PageTemplate>
    );
  }

  const unavailable =
    !loading && (!data || data.source === 'unavailable' || data.positions.length === 0);

  return (
    <PageTemplate
      title="COT Positioning"
      description="CFTC Commitment of Traders — speculative net positioning in FX futures."
    >
      <GlassCard padding="md">
        {loading || subLoading ? (
          <GlassTableSkeleton rows={8} />
        ) : unavailable ? (
          <EmptyState
            icon="📊"
            title="COT data is temporarily unavailable."
            description="CFTC positioning data refreshes weekly after Friday's close."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {[
                    { label: 'Currency', align: 'left' },
                    { label: 'Net Position', align: 'right' },
                    { label: 'WoW Change', align: 'right' },
                    { label: 'Non-Comm Long', align: 'right' },
                    { label: 'Non-Comm Short', align: 'right' },
                    { label: 'Open Interest', align: 'right' },
                    { label: 'Report Date', align: 'right' },
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
                {data!.positions.map((pos) => (
                  <COTRow key={pos.currency} pos={pos} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.source !== 'unavailable' && (
          <p className="mt-3 text-[10px] text-white/20 text-right">
            Source: {data.source} &middot; updated {new Date(data.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        )}
      </GlassCard>
    </PageTemplate>
  );
}
