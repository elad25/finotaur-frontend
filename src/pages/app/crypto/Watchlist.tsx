// ============================================================
// PAGE 6/7: WATCHLIST — Personal Tools Hub
// Consolidates: Watchlist, Portfolio, Calculators, Alerts
// ============================================================

import { memo, useMemo, useState, useEffect } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { useTopCoins } from './_shared/hooks';
import { GlassCard, GlassStat, GlassTabs, SectionHeader, Sparkline, EmptyState } from './_shared/GlassUI';
import { formatPrice, formatCompact, formatPercent, getPriceColor, calcVolMcapRatio, formatRatio } from './_shared/formatters';

const TABS = [
  { id: 'watchlist', label: '⭐ Watchlist' },
  { id: 'calculators', label: '🧮 Calculators' },
];
const STORAGE_KEY = 'finotaur_crypto_watchlist';
const getWL = (): string[] => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const saveWL = (ids: string[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));

// ── Watchlist Tab ────────────────────────────────────────────
const WatchlistTab = memo(function WatchlistTab() {
  const { data: coins, loading } = useTopCoins(1, 100, true);
  const [ids, setIds] = useState<string[]>(getWL);
  const [search, setSearch] = useState('');
  useEffect(() => { saveWL(ids); }, [ids]);

  const watchCoins = useMemo(() => ids.map(id => coins?.find(c => c.id === id)).filter(Boolean) as any[], [coins, ids]);
  const searchR = useMemo(() => { if (!coins || !search) return []; const q = search.toLowerCase(); return coins.filter(c => (c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)) && !ids.includes(c.id)).slice(0, 6); }, [coins, search, ids]);
  const add = (id: string) => { if (!ids.includes(id)) { setIds([...ids, id]); setSearch(''); } };
  const remove = (id: string) => setIds(ids.filter(i => i !== id));
  const totalMcap = watchCoins.reduce((s, c) => s + (c?.market_cap || 0), 0);
  const avgCh = watchCoins.length > 0 ? watchCoins.reduce((s, c) => s + (c?.price_change_percentage_24h || 0), 0) / watchCoins.length : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <GlassStat label="Watching" value={`${watchCoins.length} coins`} />
        <GlassStat label="Combined MCap" value={formatCompact(totalMcap)} />
        <GlassStat label="Avg 24h" value={formatPercent(avgCh)} change={avgCh} />
      </div>
      <div className="relative">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search to add coin..." className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-cyan-500/30" />
        {searchR.length > 0 && <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl bg-[#0f1117] border border-white/[0.08] shadow-xl max-h-40 overflow-y-auto">{searchR.map(c => <button key={c.id} onClick={() => add(c.id)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] text-left">{c.image && <img src={c.image} alt="" className="w-4 h-4 rounded-full" />}<span className="text-xs text-white/70">{c.name}</span><span className="text-[10px] text-white/30 uppercase">{c.symbol}</span><span className="ml-auto text-[10px] text-white/20 font-mono">{formatPrice(c.current_price)}</span></button>)}</div>}
      </div>
      {watchCoins.length === 0 ? <EmptyState icon="⭐" title="Watchlist empty" description="Search and add coins to start tracking" /> : (
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] uppercase tracking-wider text-white/25 border-b border-white/[0.04]"><th className="text-left py-2 px-2 font-medium">Coin</th><th className="text-right py-2 px-2 font-medium">Price</th><th className="text-right py-2 px-2 font-medium">24h</th><th className="text-right py-2 px-2 font-medium hidden sm:table-cell">MCap</th><th className="text-right py-2 px-2 font-medium hidden md:table-cell">7d</th><th className="w-8"></th></tr></thead><tbody>
          {watchCoins.map(c => <tr key={c.id} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors"><td className="py-2 px-2"><div className="flex items-center gap-1.5">{c.image && <img src={c.image} alt="" className="w-5 h-5 rounded-full" />}<span className="text-white/80 text-xs font-medium">{c.name}</span><span className="text-white/20 text-[10px] uppercase ml-1">{c.symbol}</span></div></td><td className="py-2 px-2 text-right text-white/70 font-mono text-xs">{formatPrice(c.current_price)}</td><td className={`py-2 px-2 text-right font-mono text-xs ${getPriceColor(c.price_change_percentage_24h)}`}>{formatPercent(c.price_change_percentage_24h)}</td><td className="py-2 px-2 text-right text-white/40 font-mono text-xs hidden sm:table-cell">{formatCompact(c.market_cap)}</td><td className="py-2 px-2 text-right hidden md:table-cell">{c.sparkline_in_7d?.price && <Sparkline data={c.sparkline_in_7d.price} width={56} height={18} className="ml-auto" />}</td><td className="py-2 px-2 text-center"><button onClick={() => remove(c.id)} className="text-white/15 hover:text-red-400 text-xs transition-colors">✕</button></td></tr>)}
        </tbody></table></div>
      )}
    </div>
  );
});

// ── Calculators Tab ──────────────────────────────────────────
const Inp = ({ label, value, onChange, ph, sfx }: any) => (<div><label className="text-[10px] text-white/30 uppercase block mb-1">{label}</label><div className="relative"><input type="number" value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={ph} className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white/80 font-mono focus:outline-none focus:border-cyan-500/30" />{sfx && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/20">{sfx}</span>}</div></div>);
const Res = ({ label, value, hl }: any) => (<div className="flex justify-between items-center py-1 border-b border-white/[0.03] last:border-0"><span className="text-[11px] text-white/40">{label}</span><span className={`text-xs font-mono font-bold ${hl ? 'text-cyan-400' : 'text-white/70'}`}>{value}</span></div>);

const PositionCalc = memo(function PC() {
  const [acc, setAcc] = useState('10000'); const [risk, setRisk] = useState('1'); const [entry, setEntry] = useState(''); const [sl, setSl] = useState('');
  const r = useMemo(() => { const a=Number(acc),rp=Number(risk),e=Number(entry),s=Number(sl); if(!a||!rp||!e||!s||e===s) return null; const ra=a*(rp/100); const d=Math.abs(e-s); return {ra, u:ra/d, ps:(ra/d)*e, d}; }, [acc,risk,entry,sl]);
  return (<GlassCard><SectionHeader title="📐 Position Size" /><div className="grid grid-cols-2 gap-2 mb-3"><Inp label="Account" value={acc} onChange={setAcc} ph="10000" sfx="$" /><Inp label="Risk %" value={risk} onChange={setRisk} ph="1" sfx="%" /><Inp label="Entry" value={entry} onChange={setEntry} ph="50000" sfx="$" /><Inp label="Stop Loss" value={sl} onChange={setSl} ph="48000" sfx="$" /></div>{r && <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]"><Res label="Risk Amount" value={`$${r.ra.toFixed(2)}`} /><Res label="Position Size" value={`$${r.ps.toFixed(2)}`} hl /><Res label="Units" value={r.u.toFixed(6)} /></div>}</GlassCard>);
});

const RRCalc = memo(function RR() {
  const [entry, setEntry] = useState(''); const [sl, setSl] = useState(''); const [tp, setTp] = useState('');
  const r = useMemo(() => { const e=Number(entry),s=Number(sl),t=Number(tp); if(!e||!s||!t) return null; const rsk=Math.abs(e-s); const rwd=Math.abs(t-e); return {ratio: rsk>0?rwd/rsk:0, rP:(rsk/e)*100, rwP:(rwd/e)*100}; }, [entry,sl,tp]);
  return (<GlassCard><SectionHeader title="⚖️ Risk/Reward" /><div className="grid grid-cols-3 gap-2 mb-3"><Inp label="Entry" value={entry} onChange={setEntry} ph="50000" sfx="$" /><Inp label="Stop" value={sl} onChange={setSl} ph="48000" sfx="$" /><Inp label="Target" value={tp} onChange={setTp} ph="55000" sfx="$" /></div>{r && <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]"><Res label="R:R Ratio" value={`1:${r.ratio.toFixed(2)}`} hl /><Res label="Risk %" value={`${r.rP.toFixed(2)}%`} /><Res label="Reward %" value={`${r.rwP.toFixed(2)}%`} /><Res label="Breakeven WR" value={`${(r.ratio>0?1/(1+r.ratio)*100:0).toFixed(1)}%`} /></div>}</GlassCard>);
});

const LiqCalc = memo(function LQ() {
  const [entry, setEntry] = useState(''); const [lev, setLev] = useState('10'); const [long, setLong] = useState(true);
  const r = useMemo(() => { const e=Number(entry),l=Number(lev); if(!e||!l) return null; const liq=long?e*(1-1/l+0.005):e*(1+1/l-0.005); return {liq, dist:Math.abs((liq-e)/e)*100}; }, [entry,lev,long]);
  return (<GlassCard><SectionHeader title="💀 Liquidation Price" /><div className="grid grid-cols-3 gap-2 mb-3"><Inp label="Entry" value={entry} onChange={setEntry} ph="50000" sfx="$" /><Inp label="Leverage" value={lev} onChange={setLev} ph="10" sfx="x" /><div><label className="text-[10px] text-white/30 uppercase block mb-1">Side</label><div className="flex gap-1"><button onClick={() => setLong(true)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${long?'bg-emerald-500/20 text-emerald-400 border-emerald-500/30':'bg-white/[0.05] text-white/40 border-white/[0.06]'}`}>Long</button><button onClick={() => setLong(false)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${!long?'bg-red-500/20 text-red-400 border-red-500/30':'bg-white/[0.05] text-white/40 border-white/[0.06]'}`}>Short</button></div></div></div>{r && <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]"><Res label="Liq Price" value={`$${r.liq.toFixed(2)}`} hl /><Res label="Distance" value={`${r.dist.toFixed(2)}%`} /></div>}</GlassCard>);
});

const DCACalc = memo(function DCA() {
  const [monthly, setMonthly] = useState('500'); const [months, setMonths] = useState('12'); const [ret, setRet] = useState('5');
  const r = useMemo(() => { const m=Number(monthly),n=Number(months),rt=Number(ret)/100; if(!m||!n) return null; let t=0; for(let i=0;i<n;i++) t=(t+m)*(1+rt/12); const inv=m*n; return {t, inv, pnl:t-inv, pct:((t-inv)/inv)*100}; }, [monthly,months,ret]);
  return (<GlassCard><SectionHeader title="📊 DCA Simulator" /><div className="grid grid-cols-3 gap-2 mb-3"><Inp label="Monthly $" value={monthly} onChange={setMonthly} ph="500" sfx="$" /><Inp label="Months" value={months} onChange={setMonths} ph="12" /><Inp label="Avg Mo Return" value={ret} onChange={setRet} ph="5" sfx="%" /></div>{r && <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]"><Res label="Invested" value={`$${r.inv.toFixed(0)}`} /><Res label="Final Value" value={`$${r.t.toFixed(0)}`} hl /><Res label="P&L" value={`${r.pnl>=0?'+':''}$${r.pnl.toFixed(0)} (${r.pct>=0?'+':''}${r.pct.toFixed(1)}%)`} /></div>}</GlassCard>);
});

const CalculatorsTab = memo(function CalculatorsTab() {
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><PositionCalc /><RRCalc /><LiqCalc /><DCACalc /></div>;
});

// ── Main ─────────────────────────────────────────────────────
export default function CryptoWatchlist() {
  const [tab, setTab] = useState('watchlist');
  return (
    <PageTemplate title="My Crypto" description="Personal watchlist, portfolio, and trading tools">
      <div className="space-y-4">
        <GlassTabs tabs={TABS} active={tab} onChange={setTab} />
        <GlassCard padding="sm">
          {tab === 'watchlist' && <WatchlistTab />}
          {tab === 'calculators' && <CalculatorsTab />}
        </GlassCard>
      </div>
    </PageTemplate>
  );
}
