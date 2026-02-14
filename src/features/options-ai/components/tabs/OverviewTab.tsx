// src/features/options-ai/components/tabs/OverviewTab.tsx
// =====================================================
// OPTIONS AI — Overview Tab v4.0 "Command Center"
// =====================================================
// DESIGN SHIFT: Instead of 10 fake time-series charts,
// we display CURRENT STATE in powerful visual layouts:
//
//   1. Regime Hero — gamma state + 6 key metrics
//   2. Flow Heatmap — 15 tickers as colored grid
//   3. GEX Profile — real gamma by strike (bar chart)
//   4. Sector Pulse — radar + premium bars
//   5. Top Unusual — multi-ticker flows list
//   6. Vol Cockpit — animated circular gauges
//   7. AI Summary
//
// COST: Same Polygon calls as before (all L1 cached)
// REMOVED: marketNetFlow, odteFlow, sector5day (all fake)
// KEPT: GEX (real), sectorRadar (real), dashboard (real)
// =====================================================

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, Activity, BarChart3,
  Zap, Shield, Target, Gauge, Clock, Flame, Eye,
} from 'lucide-react';
import type {
  OptionsData, OverviewChartsData, MarketDashboardRow,
} from '../../types/options-ai.types';
import { AIInsight } from '../ui';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Cell, ReferenceLine,
} from 'recharts';

// ── Design Tokens ──
const C = {
  gold: '#C9A646', goldLight: '#F4D97B',
  bg: 'rgba(13,11,8,0.97)', bgCard: 'rgba(255,255,255,0.02)',
  border: 'rgba(255,255,255,0.06)', borderGold: 'rgba(201,166,70,0.2)',
  green: '#10B981', red: '#EF4444', amber: '#F59E0B',
  text: '#E8DCC4', textDim: '#6B6B6B', textMuted: '#444',
};

const SECTOR_COLORS: Record<string, string> = {
  Technology:'#EC4899', Financials:'#60A5FA', Healthcare:'#10B981',
  Energy:'#F59E0B', Industrials:'#F97316', 'Consumer Disc':'#22C55E',
  'Consumer Staples':'#A855F7', Utilities:'#06B6D4', 'Real Estate':'#FB923C',
  Comms:'#8B5CF6', Materials:'#14B8A6',
};

const fmt = (v: number | string | undefined | null): string => {
  if (v == null) return '$0';
  if (typeof v === 'string') return v.startsWith('$') ? v : `$${v}`;
  if (typeof v !== 'number' || isNaN(v)) return '$0';
  const a = Math.abs(v);
  if (a >= 1e9) return `${v < 0 ? '-' : ''}$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${v < 0 ? '-' : ''}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${v < 0 ? '-' : ''}$${(a / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

const DEFAULT_VOL = {
  ivRank: 0, ivPercentile: 0, skew: 'neutral' as const, termStructure: 'contango' as const,
  vixLevel: 0, vixChange: 0, vixTermStructure: 'contango' as const, skewIndex: 120,
  zeroDteRatio: 0, interpretation: 'Loading...',
};

// ── Tooltip ──
const DTip = memo(function DTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(13,11,8,0.96)', border: `1px solid ${C.borderGold}`,
      borderRadius: 10, padding: '10px 14px', fontSize: 11, backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ color: C.textDim, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ color: C.textDim, minWidth: 60 }}>{p.name}</span>
          <span style={{ color: p.color, fontWeight: 600 }}>
            {typeof p.value === 'number' ? (Math.abs(p.value) > 999 ? fmt(p.value) : p.value.toFixed(2)) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
});

// ── Card Wrapper ──
const CC = memo(function CC({ title, subtitle, children, delay = 0, icon: Icon, accentColor, noPad }: {
  title: string; subtitle?: string; children: React.ReactNode; delay?: number;
  icon?: any; accentColor?: string; noPad?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`,
        borderRadius: 14, overflow: 'hidden', position: 'relative', height: '100%',
      }}>
        {accentColor && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }} />
        )}
        <div style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          {Icon && <Icon style={{ width: 14, height: 14, color: accentColor || C.gold, opacity: 0.8 }} />}
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h3>
            {subtitle && <span style={{ color: '#555', fontSize: 10 }}>{subtitle}</span>}
          </div>
        </div>
        <div style={{ padding: noPad ? 0 : '14px 10px 10px' }}>{children}</div>
      </div>
    </motion.div>
  );
});

// ══════════════════════════════════════════
// 1. REGIME HERO
// ══════════════════════════════════════════

const Regime = memo(function Regime({ data }: { data: OptionsData }) {
  const v = data.volRegime ?? DEFAULT_VOL;
  const dl = data.dealerPositioning ?? [];
  const ng = dl.find(d => d.metric === 'Net Gamma');
  const np = dl.find(d => d.metric === 'Net Premium');
  const pc = dl.find(d => d.metric === 'Put/Call Ratio');
  const gl = dl.find(d => d.metric === 'Key Gamma Level');
  const isNeg = ng?.status === 'negative';
  const rc = isNeg ? C.red : C.green;
  const pcr = pc?.value ? parseFloat(pc.value) : 0;

  const metrics = useMemo(() => [
    { label: 'Net Gamma', value: ng?.value || '$0', color: ng?.status === 'negative' ? C.red : C.green, icon: Activity },
    { label: 'P/C Ratio', value: pcr.toFixed(2), color: pcr > 1 ? C.red : pcr < 0.7 ? C.green : C.amber, icon: BarChart3 },
    { label: 'IV Rank', value: `${v.ivRank ?? 0}`, color: (v.ivRank ?? 0) > 70 ? C.red : (v.ivRank ?? 0) < 30 ? C.green : C.amber, icon: Gauge },
    { label: 'VIX', value: (v.vixLevel ?? 0).toFixed(1), color: (v.vixLevel ?? 0) > 25 ? C.red : (v.vixLevel ?? 0) < 15 ? C.green : C.amber, icon: Flame },
    { label: 'Net Premium', value: np?.value || '$0', color: np?.status === 'positive' ? C.green : np?.status === 'negative' ? C.red : C.amber, icon: TrendingUp },
    { label: '0DTE', value: `${((v.zeroDteRatio ?? 0) * 100).toFixed(0)}%`, color: (v.zeroDteRatio ?? 0) > 0.5 ? C.amber : C.textDim, icon: Clock },
  ], [ng, pcr, v, np]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.5 }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.bg}, rgba(21,18,16,0.97))`,
        border: `1px solid ${C.borderGold}`, borderRadius: 16, overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.gold}, ${C.goldLight}, ${C.gold}, transparent)` }} />
        <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 500, height: 200, borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none', background: 'rgba(201,166,70,0.05)' }} />

        <div style={{ position: 'relative', padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))',
                border: '1px solid rgba(201,166,70,0.3)',
              }}>
                <Brain style={{ width: 20, height: 20, color: C.gold }} />
              </div>
              <div>
                <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Market Regime Analysis</h3>
                <p style={{ color: '#555', fontSize: 10, margin: '2px 0 0' }}>
                  {new Date(data.lastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} • SPY Options
                  {(() => {
                    const now = new Date();
                    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
                    const h = et.getHours(), m = et.getMinutes(), day = et.getDay();
                    const mins = h * 60 + m;
                    const isOpen = day >= 1 && day <= 5 && mins >= 570 && mins < 960; // 9:30-16:00
                    return isOpen
                      ? <span style={{ color: C.green, marginLeft: 6 }}>● LIVE</span>
                      : <span style={{ color: C.amber, marginLeft: 6 }}>● MARKET CLOSED — Last session data</span>;
                  })()}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: rc, boxShadow: `0 0 8px ${rc}60` }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: rc, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {isNeg ? 'Negative γ' : 'Positive γ'}
              </span>
            </div>
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px',
            borderRadius: 12, marginBottom: 16, background: `${rc}10`, border: `1px solid ${rc}25`,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: rc }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: rc }}>
              {isNeg ? 'NEGATIVE GAMMA — AMPLIFIED MOVES' : 'POSITIVE GAMMA — STABILIZING'}
            </span>
          </div>

          <p style={{ color: C.text, fontSize: 13, lineHeight: 1.75, margin: '0 0 20px', maxWidth: 800 }}>
            {ng?.soWhat}{' '}
            {gl && <>Gamma flip at <span style={{ color: '#fff', fontWeight: 600 }}>{gl.value}</span>. {gl.soWhat}</>}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {metrics.map(m => (
              <div key={m.label} style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <m.icon style={{ width: 11, height: 11, color: '#555' }} />
                  <span style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ══════════════════════════════════════════
// 2. FLOW HEATMAP
// ══════════════════════════════════════════

const FlowHeatmap = memo(function FlowHeatmap({ calls, puts }: { calls: MarketDashboardRow[]; puts: MarketDashboardRow[] }) {
  const cells = useMemo(() => {
    const map = new Map<string, { sym: string; cP: string; pP: string; cV: number; pV: number; score: number }>();
    for (const c of calls) map.set(c.symbol, { sym: c.symbol, cP: c.netPremiums, pP: '$0', cV: c.orders, pV: 0, score: c.otmScore });
    for (const p of puts) {
      const e = map.get(p.symbol);
      if (e) { e.pP = p.netPremiums; e.pV = p.orders; }
      else map.set(p.symbol, { sym: p.symbol, cP: '$0', pP: p.netPremiums, cV: 0, pV: p.orders, score: p.otmScore });
    }
    return [...map.values()].sort((a, b) => b.score - a.score);
  }, [calls, puts]);

  if (cells.length === 0) return null;

  return (
    <CC title="Options Flow Heatmap" subtitle={`${cells.length} tickers • color = directional bias`} icon={Eye} accentColor={C.gold} delay={0.1} noPad>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: 1, padding: 1, background: 'rgba(255,255,255,0.02)' }}>
        {cells.map((c, i) => {
          const ratio = (c.cV - c.pV) / ((c.cV + c.pV) || 1);
          const isBull = ratio > 0.12;
          const isBear = ratio < -0.12;
          const col = isBull ? C.green : isBear ? C.red : C.amber;
          const bg = isBull
            ? `rgba(16,185,129,${0.04 + Math.abs(ratio) * 0.1})`
            : isBear
              ? `rgba(239,68,68,${0.04 + Math.abs(ratio) * 0.1})`
              : 'rgba(255,255,255,0.015)';

          return (
            <motion.div
              key={c.sym}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 + i * 0.02, duration: 0.25 }}
              style={{ padding: '14px 8px', background: bg, borderLeft: `2px solid ${col}25`, textAlign: 'center' }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 5 }}>{c.sym}</div>
              <div style={{ fontSize: 10, color: C.green, fontWeight: 600 }}>C {c.cP}</div>
              <div style={{ fontSize: 10, color: C.red, fontWeight: 600 }}>P {c.pP}</div>
              <div style={{
                marginTop: 6, fontSize: 9, fontWeight: 700,
                color: col, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL'}
              </div>
              <div style={{ marginTop: 6, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(c.score, 100)}%`, background: `linear-gradient(90deg, ${C.gold}40, ${C.gold})`, borderRadius: 1 }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </CC>
  );
});

// ══════════════════════════════════════════
// 3. GEX PROFILE
// ══════════════════════════════════════════

const GexProfile = memo(function GexProfile({ data }: { data: OverviewChartsData }) {
  const gexData = useMemo(() => {
    const { strikes, points } = data.odteGex ?? { strikes: [], points: [] };
    if (!strikes.length || !points.length) return [];
    const p = points[0];
    return strikes.map(s => ({ strike: s, gex: (p as any)[`s${s}`] || 0 }));
  }, [data.odteGex]);

  if (gexData.length === 0) return null;

  return (
    <CC title="Gamma Exposure by Strike" subtitle="SPY • gamma × OI per strike" icon={Activity} accentColor="#8B5CF6" delay={0.2}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={gexData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <XAxis dataKey="strike" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={50} />
          <Tooltip content={<DTip />} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <Bar dataKey="gex" name="GEX" radius={[4, 4, 0, 0]}>
            {gexData.map((e, i) => <Cell key={i} fill={e.gex >= 0 ? C.green : C.red} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CC>
  );
});

// ══════════════════════════════════════════
// 4. SECTOR PULSE
// ══════════════════════════════════════════

const SectorPulse = memo(function SectorPulse({ data }: { data: OverviewChartsData }) {
  const rd = data.sectorRadar ?? [];
  const pd = (data.sectorPremiums ?? []).slice(0, 8);
  const mx = Math.max(...pd.map(s => s.value), 1);
  if (rd.length === 0) return null;

  return (
    <CC title="Sector Flow Pulse" subtitle="Sentiment radar + premium by sector" icon={Target} accentColor="#EC4899" delay={0.25}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={rd}>
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis dataKey="sector" tick={{ fill: '#555', fontSize: 8 }} />
            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
            <Radar dataKey="value" stroke={C.gold} fill={C.gold} fillOpacity={0.15} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {pd.map((s, i) => (
            <div key={s.sector} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: C.textDim, width: 78, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.sector}
              </span>
              <div style={{ flex: 1, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.value / mx) * 100}%` }}
                  transition={{ delay: 0.3 + i * 0.04, duration: 0.5 }}
                  style={{ height: '100%', borderRadius: 5, background: `linear-gradient(90deg, ${SECTOR_COLORS[s.sector] || C.gold}40, ${SECTOR_COLORS[s.sector] || C.gold})` }}
                />
              </div>
              <span style={{ fontSize: 10, color: SECTOR_COLORS[s.sector] || C.gold, fontWeight: 600, minWidth: 48, textAlign: 'right' }}>
                {fmt(s.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </CC>
  );
});

// ══════════════════════════════════════════
// 5. TOP UNUSUAL ACTIVITY
// ══════════════════════════════════════════

const TopActivity = memo(function TopActivity({ data }: { data: OptionsData }) {
  const flows = useMemo(() => {
    const parsePrem = (p: string) => {
      const s = p.replace(/[$,]/g, '');
      if (s.endsWith('B')) return parseFloat(s) * 1e9;
      if (s.endsWith('M')) return parseFloat(s) * 1e6;
      if (s.endsWith('K')) return parseFloat(s) * 1e3;
      return parseFloat(s) || 0;
    };
    return [...(data.unusualFlows ?? [])].sort((a, b) => parsePrem(b.premium) - parsePrem(a.premium)).slice(0, 6);
  }, [data.unusualFlows]);
  if (flows.length === 0) return null;

  return (
    <CC title="Top Unusual Activity" subtitle={`${flows.length} notable flows`} icon={Zap} accentColor={C.amber} delay={0.3}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {flows.map((f, i) => {
          const col = f.type === 'call' ? C.green : C.red;
          return (
            <motion.div
              key={`${f.symbol}-${f.strike}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, background: `${col}04`, border: `1px solid ${col}10`,
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${col}12`, border: `1px solid ${col}20`,
                fontSize: 12, fontWeight: 700, color: col, flexShrink: 0,
              }}>
                {f.unusualScore ?? 0}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{f.symbol}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: `${col}15`, color: col, textTransform: 'uppercase',
                  }}>
                    {f.type} {f.strike}
                  </span>
                  <span style={{ fontSize: 9, color: C.textDim }}>{f.expiry}</span>
                </div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                  Vol: {(f.volume ?? 0).toLocaleString()} • OI: {(f.openInterest ?? 0).toLocaleString()} • {(f.volOiRatio ?? 0).toFixed(1)}x
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: col }}>{f.premium}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </CC>
  );
});

// ══════════════════════════════════════════
// 6. VOLATILITY COCKPIT
// ══════════════════════════════════════════

const VolCockpit = memo(function VolCockpit({ data }: { data: OptionsData }) {
  const v = data.volRegime ?? DEFAULT_VOL;
  const gauges = useMemo(() => [
    { label: 'IV Rank', value: v.ivRank ?? 0, max: 100, color: (v.ivRank ?? 0) > 70 ? C.red : (v.ivRank ?? 0) < 30 ? C.green : C.amber },
    { label: 'IV Pctl', value: v.ivPercentile ?? 0, max: 100, color: (v.ivPercentile ?? 0) > 70 ? C.red : (v.ivPercentile ?? 0) < 30 ? C.green : C.amber },
    { label: 'VIX', value: v.vixLevel ?? 0, max: 50, color: (v.vixLevel ?? 0) > 25 ? C.red : (v.vixLevel ?? 0) < 15 ? C.green : C.amber },
    { label: 'Skew', value: v.skewIndex ?? 120, max: 220, color: C.gold },
  ], [v]);

  const circ = 2 * Math.PI * 28;

  return (
    <CC title="Volatility Cockpit" subtitle={v.interpretation?.slice(0, 80)} icon={Gauge} accentColor="#8B5CF6" delay={0.35}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '4px 6px' }}>
        {gauges.map(g => (
          <div key={g.label} style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 68, height: 68, margin: '0 auto 6px' }}>
              <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                <motion.circle
                  cx="34" cy="34" r="28" fill="none" stroke={g.color} strokeWidth="5" strokeLinecap="round"
                  initial={{ strokeDasharray: `0 ${circ}` }}
                  animate={{ strokeDasharray: `${Math.min(g.value / g.max, 1) * circ} ${circ}` }}
                  transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: g.color }}>
                {Math.round(g.value)}
              </div>
            </div>
            <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{g.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Skew', value: v.skew ?? 'neutral', c: v.skew === 'put' ? C.red : v.skew === 'call' ? C.green : C.amber },
          { label: 'Term', value: v.termStructure ?? 'contango', c: v.termStructure === 'backwardation' ? C.red : C.green },
          { label: '0DTE', value: `${((v.zeroDteRatio ?? 0) * 100).toFixed(0)}%`, c: (v.zeroDteRatio ?? 0) > 0.5 ? C.amber : C.textDim },
        ].map(x => (
          <div key={x.label} style={{ padding: '4px 10px', borderRadius: 6, background: `${x.c}08`, border: `1px solid ${x.c}18`, fontSize: 10, color: x.c, fontWeight: 600 }}>
            {x.label}: {x.value}
          </div>
        ))}
      </div>
    </CC>
  );
});

// ══════════════════════════════════════════
// 7. ALERTS
// ══════════════════════════════════════════

const AlertsPreview = memo(function AlertsPreview({ data }: { data: OptionsData }) {
  const alerts = useMemo(() => (data.alerts ?? []).filter(a => !a.read).slice(0, 4), [data.alerts]);
  if (alerts.length === 0) return null;
  const sc = (s: string) => s === 'critical' ? C.red : s === 'high' ? C.amber : C.gold;

  return (
    <CC title="Active Alerts" subtitle={`${alerts.length} unread`} icon={Shield} accentColor={C.red} delay={0.4}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {alerts.map(a => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
            borderRadius: 8, background: `${sc(a.severity)}06`, border: `1px solid ${sc(a.severity)}15`,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: sc(a.severity), boxShadow: `0 0 6px ${sc(a.severity)}60` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 600, marginBottom: 2 }}>{a.title}</div>
              <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.5 }}>{a.summary.slice(0, 100)}</div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: sc(a.severity), textTransform: 'uppercase', flexShrink: 0 }}>{a.severity}</span>
          </div>
        ))}
      </div>
    </CC>
  );
});

// ══════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════

export const OverviewTab = memo(function OverviewTab({ data }: { data: OptionsData }) {
  const oc = data.overviewCharts ?? {
    marketNetFlow: [], odteFlow: [], odteGex: { strikes: [], points: [] },
    sectorRadar: [], sectorFlow: [], sectorFlowKeys: [], sectorPremiums: [],
    callsDashboard: [], putsDashboard: [],
  };

  const label: React.CSSProperties = {
    color: C.textDim, fontSize: 11, fontWeight: 600, marginTop: 4,
    textTransform: 'uppercase', letterSpacing: '0.08em',
  };

  const grid2: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Regime data={data} />

      <div style={label}>Options Flow Overview</div>
      <FlowHeatmap calls={oc.callsDashboard} puts={oc.putsDashboard} />

      <div style={label}>Gamma & Sector Intelligence</div>
      <div style={grid2}>
        <GexProfile data={oc} />
        <SectorPulse data={oc} />
      </div>

      <div style={label}>Activity & Volatility</div>
      <div style={grid2}>
        <TopActivity data={data} />
        <VolCockpit data={data} />
      </div>

      <AlertsPreview data={data} />
      <AIInsight label="AI Market Summary">{data.dailyReport?.bottomLine ?? 'Analysis loading...'}</AIInsight>
    </div>
  );
});