// ============================================================
// PAGE 7/7: ACADEMY — Education + Reports + Calendar
// Consolidates: Academy, Reports, Calendar, Catalysts
// ============================================================

import { memo, useMemo, useState, useEffect } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { api } from '@/lib/apiBase';
import { GlassCard, GlassTabs, SectionHeader, EmptyState } from './_shared/GlassUI';
import { timeAgo } from './_shared/formatters';

const TABS = [
  { id: 'learn', label: '📚 Learn' },
  { id: 'reports', label: '📊 Reports' },
  { id: 'calendar', label: '📅 Calendar' },
];

const Topic = memo(function Topic({ icon, title, content }: { icon: string; title: string; content: string }) {
  return <GlassCard hover padding="sm"><div className="flex items-start gap-2.5"><span className="text-xl">{icon}</span><div><h3 className="text-xs text-white/80 font-semibold mb-0.5">{title}</h3><p className="text-[10px] text-white/35 leading-relaxed">{content}</p></div></div></GlassCard>;
});

const Term = memo(function Term({ term, def }: { term: string; def: string }) {
  return <div className="py-1.5 border-b border-white/[0.03] last:border-0"><span className="text-[11px] text-cyan-400 font-medium">{term}</span><p className="text-[10px] text-white/35 mt-0.5">{def}</p></div>;
});

// ── Learn Tab ────────────────────────────────────────────────
const LearnTab = memo(function LearnTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <Topic icon="📈" title="RSI" content="0-100 scale. Below 30 = oversold (bounce zone). Above 70 = overbought. Divergence from price = strongest reversal signal." />
        <Topic icon="🔀" title="MACD" content="MACD crosses above signal = bullish. Below = bearish. Histogram = momentum. Divergences with price = early warning." />
        <Topic icon="📊" title="Bollinger Bands" content="Squeeze (narrow) = breakout incoming. Touch upper band = strength in uptrend, not sell signal. Width measures volatility." />
        <Topic icon="💰" title="Funding Rate" content="Positive = longs pay shorts. >0.05% = overheated (sell signal). Negative = short-heavy (squeeze potential)." />
        <Topic icon="📉" title="Open Interest" content="Rising OI + rising price = new money (strong). Rising OI + falling price = shorts building. Falling OI = exiting." />
        <Topic icon="⚡" title="Volume" content="Confirms moves. High vol + rise = strong. Low vol + rise = suspect. Spike >200% avg = significant event." />
        <Topic icon="🎯" title="Support/Resistance" content="Pivot Points calculate mathematically. Old support becomes new resistance. More touches = stronger level." />
        <Topic icon="🔗" title="On-Chain" content="Exchange inflows = selling. Whale accumulation = bullish. NVT = P/E for crypto. MVRV >3.5 = top signal." />
        <Topic icon="🐋" title="Whale Watching" content="Track >1000 BTC wallets. Accumulation during dips leads to recovery. Large exchange deposits signal selling." />
      </div>

      <GlassCard>
        <SectionHeader title="📖 Glossary" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <Term term="ATH" def="All-Time High — highest price ever reached" />
          <Term term="FDV" def="Fully Diluted Valuation — market cap if all tokens existed" />
          <Term term="Liquidation" def="Forced closure of leveraged position" />
          <Term term="DCA" def="Dollar-Cost Averaging — fixed amounts at intervals" />
          <Term term="TVL" def="Total Value Locked in DeFi protocols" />
          <Term term="Vol/MCap" def="Volume relative to market cap — high = active" />
          <Term term="Impermanent Loss" def="Loss from LP vs simply holding" />
          <Term term="Gas Fees" def="Transaction fees to blockchain validators" />
          <Term term="Slippage" def="Difference between expected and actual price" />
          <Term term="Market Cap" def="Price × circulating supply" />
        </div>
      </GlassCard>

      <GlassCard glow="purple">
        <SectionHeader title="🎯 Trading Strategies" />
        <div className="space-y-2.5 text-xs text-white/40 leading-relaxed">
          <p><strong className="text-white/65">Trend Following:</strong> Buy when EMA 20 &gt; EMA 50 &gt; EMA 200. Exit when structure breaks.</p>
          <p><strong className="text-white/65">Mean Reversion:</strong> RSI extremes + volume spike → price reverts to mean. Use Bollinger Bands for overextension.</p>
          <p><strong className="text-white/65">Breakout:</strong> Bollinger squeeze → breakout with volume. Stop below breakout level.</p>
          <p><strong className="text-white/65">Funding Fade:</strong> Funding &gt;0.05% → short/take profit. Funding &lt;-0.03% → look for longs.</p>
        </div>
      </GlassCard>
    </div>
  );
});

// ── Reports Tab ──────────────────────────────────────────────
const ReportsTab = memo(function ReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(api('/api/crypto/reports'))
      .then(r => r.json())
      .then(d => { if (alive) setReports(d?.reports || d || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/[0.04] rounded-xl" />)}</div>;
  if (reports.length === 0) return <EmptyState icon="📑" title="No reports yet" description="AI crypto reports generated bi-monthly by our 18 AI agents" />;

  return (
    <div className="space-y-3">
      {reports[0]?.central_thesis && (
        <GlassCard glow="cyan">
          <SectionHeader title="📊 Latest Report" subtitle={timeAgo(reports[0].created_at)} />
          <h3 className="text-sm text-white/85 font-semibold mb-1">{reports[0].title}</h3>
          <p className="text-xs text-white/45 leading-relaxed">{reports[0].central_thesis}</p>
          {reports[0].pdf_url && (
            <a href={reports[0].pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-[11px] font-medium hover:bg-cyan-500/30 transition-colors">
              📄 Download PDF
            </a>
          )}
        </GlassCard>
      )}
      <div className="divide-y divide-white/[0.03]">
        {reports.map(r => (
          <div key={r.id} className="flex items-center gap-3 px-2 py-2.5 hover:bg-white/[0.03] rounded-lg transition-colors">
            <span className="text-lg">📊</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs text-white/75 font-medium truncate">{r.title}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-white/20">{timeAgo(r.created_at)}</span>
                {r.visibility === 'live' && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />Live</span>}
              </div>
            </div>
            {r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/25 hover:text-white/60 transition-colors">📄</a>}
          </div>
        ))}
      </div>
    </div>
  );
});

// ── Calendar Tab ─────────────────────────────────────────────
const CalendarTab = memo(function CalendarTab() {
  const [now] = useState(new Date());
  const y = now.getFullYear(), m = now.getMonth();
  const days = useMemo(() => {
    const fd = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const c: (number | null)[] = [];
    for (let i = 0; i < fd; i++) c.push(null);
    for (let i = 1; i <= dim; i++) c.push(i);
    while (c.length % 7) c.push(null);
    return c;
  }, [y, m]);
  const today = now.getDate();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const types = [
    { c: 'bg-red-400', l: 'Token Unlock' },
    { c: 'bg-purple-400', l: 'Upgrade/Fork' },
    { c: 'bg-cyan-400', l: 'Listing' },
    { c: 'bg-amber-400', l: 'Airdrop' },
    { c: 'bg-emerald-400', l: 'Conference' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GlassCard>
            <SectionHeader title={monthName} />
            <div className="grid grid-cols-7 gap-px">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="text-center text-[10px] text-white/25 font-medium py-1 uppercase">{d}</div>
              ))}
              {days.map((d, i) => (
                <div key={i} className={`text-center py-2 rounded-lg text-xs transition-colors ${
                  !d ? '' :
                  d === today ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30' :
                  'text-white/45 hover:bg-white/[0.04] cursor-pointer'
                }`}>{d || ''}</div>
              ))}
            </div>
          </GlassCard>
        </div>
        <div className="space-y-3">
          <GlassCard padding="sm">
            <SectionHeader title="Event Types" />
            <div className="space-y-1.5">
              {types.map(t => (
                <div key={t.l} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${t.c}`} />
                  <span className="text-[10px] text-white/45">{t.l}</span>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard padding="sm" glow="amber">
            <SectionHeader title="💡 Pro Tip" />
            <p className="text-[10px] text-white/35 leading-relaxed">
              Token unlocks releasing &gt;2% of supply often create selling pressure.
              Monitor the calendar to position ahead of these events.
            </p>
          </GlassCard>
        </div>
      </div>
      <GlassCard padding="sm">
        <SectionHeader title="Upcoming Events" subtitle="Next 30 days" />
        <EmptyState icon="📅" title="No events scheduled" description="Connect events API for token unlocks, protocol upgrades, airdrops, and conferences" />
      </GlassCard>
    </div>
  );
});

// ── Main ─────────────────────────────────────────────────────
export default function CryptoAcademy() {
  const [tab, setTab] = useState('learn');
  return (
    <PageTemplate title="Academy & Research" description="Learn, read reports, and track events">
      <div className="space-y-4">
        <GlassTabs tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'learn' && <LearnTab />}
        {tab === 'reports' && <GlassCard padding="sm"><ReportsTab /></GlassCard>}
        {tab === 'calendar' && <CalendarTab />}
      </div>
    </PageTemplate>
  );
}
