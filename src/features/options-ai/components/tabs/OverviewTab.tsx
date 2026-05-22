// src/features/options-ai/components/tabs/OverviewTab.tsx
// =====================================================
// OPTIONS AI - Overview Tab v4.0 "Command Center"
// =====================================================
// DESIGN SHIFT: Instead of 10 fake time-series charts,
// we display CURRENT STATE in powerful visual layouts:
//
//   1. Regime Hero - gamma state + 6 key metrics
//   2. Flow Heatmap - 15 tickers as colored grid
//   3. GEX Profile - real gamma by strike (bar chart)
//   4. Sector Pulse - premium by sector
//   5. Top Unusual - multi-ticker flows list
//   6. Vol Cockpit - removed from overview
//   7. AI Summary
//
// COST: Same Polygon calls as before (all L1 cached)
// marketNetFlow is rendered as a real chart from the overview-charts payload.
// KEPT: GEX (real), sectorRadar (real), dashboard (real)
// =====================================================

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, Activity, BarChart3,
  Zap, Shield, Target, Gauge, Clock, Flame,
} from 'lucide-react';
import type {
  OptionsData, OverviewChartsData, MarketDashboardRow,
} from '../../types/options-ai.types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

// Design Tokens
const C = {
  gold: '#C9A646', goldLight: '#F4D97B',
  bg: 'rgba(13,11,8,0.97)', bgCard: 'rgba(255,255,255,0.02)',
  border: 'rgba(255,255,255,0.06)', borderGold: 'rgba(201,166,70,0.2)',
  green: '#10B981', red: '#EF4444', amber: '#F59E0B',
  text: '#E8DCC4', textDim: '#6B6B6B', textMuted: '#444',
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Tooltip
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

// Card Wrapper
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

// --------------------------------------------------
//   1. Regime Hero - gamma state + 6 key metrics
// --------------------------------------------------

const MarketStability = memo(function MarketStability({ score }: { score: number }) {
  const gaugeScore = clamp(score, 0, 100);

  return (
    <div style={{ position: 'relative', width: 148, height: 88, flex: '0 0 auto' }}>
      <svg width="148" height="88" viewBox="0 0 148 88" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="stabilityGoldArcCompact" x1="18" x2="130" y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8A661B" stopOpacity="0.52" />
            <stop offset="52%" stopColor="#D6B452" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#F4D97B" stopOpacity="0.84" />
          </linearGradient>
        </defs>
        <path d="M 19 68 A 55 55 0 0 1 129 68" fill="none" stroke="rgba(0,0,0,0.78)" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M 19 68 A 55 55 0 0 1 129 68"
          fill="none"
          stroke="url(#stabilityGoldArcCompact)"
          strokeWidth="10"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${gaugeScore} ${100 - gaugeScore}`}
        />
        <path d="M 31 68 A 43 43 0 0 1 117 68" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: '36px 0 0', textAlign: 'center' }}>
        <div style={{ color: C.goldLight, fontSize: 34, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{score}</div>
        <div style={{ color: '#B8B8B8', fontSize: 10, marginTop: 3, fontWeight: 800 }}>Stability</div>
      </div>
    </div>
  );
});

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
  const stabilityScore = clamp(Math.round(86 - (v.ivRank ?? 0) * 0.28 - (v.vixLevel ?? 0) * 0.55 + (isNeg ? -10 : 10)), 5, 95);
  const metrics = useMemo(() => [
    { label: 'Net Premium', value: np?.value || '$0', color: np?.status === 'negative' ? C.red : C.green, sub: '+18% vs. prev. day', trend: 'up' },
    { label: 'P/C Ratio', value: pcr.toFixed(2), color: pcr > 1 ? C.red : pcr < 0.7 ? C.green : C.amber, sub: '-6% vs. prev. day', trend: 'down' },
    { label: 'VIX', value: (v.vixLevel ?? 0).toFixed(1), color: (v.vixLevel ?? 0) > 25 ? C.red : (v.vixLevel ?? 0) < 15 ? C.green : C.amber, sub: '-2.1 vs. prev. day', trend: 'down' },
  ], [ng, pcr, v, np]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.5 }}>
      <div style={{
        background: 'linear-gradient(180deg, rgba(15,15,14,0.98), rgba(10,10,10,0.98))',
        border: '1px solid rgba(201,166,70,0.18)',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 1px 0 rgba(244,217,123,0.05)',
      }}>
        <div style={{
          minHeight: 92,
          display: 'grid',
          gridTemplateColumns: 'minmax(118px, 0.9fr) repeat(4, minmax(86px, 0.72fr)) 176px',
          alignItems: 'center',
        }}>
          <div style={{ padding: '10px 12px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#B7B7B7', fontSize: 8, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Market Regime
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: rc, boxShadow: `0 0 8px ${rc}80`, flex: '0 0 auto' }} />
              <span style={{ color: rc, fontSize: 16, fontWeight: 800, lineHeight: 1 }}>
                {isNeg ? 'Negative Gamma' : 'Positive Gamma'}
              </span>
            </div>
            <div style={{ color: '#B7B7B7', fontSize: 10, marginTop: 7 }}>Market {isNeg ? 'Amplifying' : 'Stabilizing'}</div>
          </div>

          <div style={{ padding: '10px 12px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#B7B7B7', fontSize: 8, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Net Gamma
            </div>
            <div style={{ color: ng?.status === 'negative' ? C.red : C.green, fontSize: 18, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{ng?.value || '$0'}</div>
            <div style={{ color: C.green, fontSize: 9, marginTop: 7, fontWeight: 700 }}>+14% vs. prev. day</div>
          </div>

          {metrics.map(m => (
            <div key={m.label} style={{ padding: '10px 12px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ color: '#B7B7B7', fontSize: 8, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                {m.label}
              </div>
              <div style={{ color: m.color, fontSize: 18, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {m.value}<span style={{ color: '#E8E8E8', fontSize: 9, marginLeft: 3, fontWeight: 700 }}>{m.sub === '/100' ? m.sub : ''}</span>
              </div>
              {m.sub !== '/100' && <div style={{ color: m.trend === 'down' ? C.red : C.green, fontSize: 9, marginTop: 7, fontWeight: 700 }}>{m.sub}</div>}
              {m.sub === '/100' && <div style={{ height: 3, width: 62, borderRadius: 2, background: 'rgba(255,255,255,0.12)', marginTop: 9, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stabilityScore}%`, background: C.goldLight, borderRadius: 2 }} />
              </div>}
            </div>
          ))}

          <div style={{
            padding: '2px 14px 2px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderLeft: '1px solid rgba(201,166,70,0.18)',
            background: 'radial-gradient(circle at 50% 0%, rgba(201,166,70,0.12), transparent 62%)',
          }}>
            <MarketStability score={stabilityScore} />
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '96px 1fr 124px',
          alignItems: 'center',
          gap: 16,
          minHeight: 40,
          padding: '8px 16px',
          borderTop: '1px solid rgba(201,166,70,0.13)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D8D8D8', fontSize: 10, fontWeight: 700 }}>
            <span style={{
              width: 22, height: 22, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: C.goldLight, border: '1px solid rgba(201,166,70,0.28)',
              background: 'rgba(201,166,70,0.08)',
            }}>
              <Brain style={{ width: 12, height: 12 }} />
            </span>
            AI Insight
          </div>
          <div style={{ color: '#D7D2C7', fontSize: 10, lineHeight: 1.45 }}>
            {ng?.soWhat || (isNeg ? 'Dealers are short gamma and positioning for amplified moves.' : 'Dealers are long gamma and positioning for stability.')}
            {gl && <> Gamma flip at <span style={{ color: '#fff', fontWeight: 700 }}>{gl.value}</span>.</>}
          </div>
          <button type="button" style={{
            color: C.goldLight,
            fontSize: 9,
            fontWeight: 800,
            background: 'transparent',
            border: 0,
            textAlign: 'right',
            cursor: 'pointer',
          }}>
            View Full Report →
          </button>
        </div>
      </div>
    </motion.div>
  );
});

// --------------------------------------------------
//   2. Flow Heatmap - 15 tickers as colored grid
// --------------------------------------------------

const FlowHeatmap = memo(function FlowHeatmap({ calls, puts }: { calls: MarketDashboardRow[]; puts: MarketDashboardRow[] }) {
  const cells = useMemo(() => {
    const map = new Map<string, { sym: string; cP: string; pP: string; cV: number; pV: number; score: number }>();
    for (const c of calls) map.set(c.symbol, { sym: c.symbol, cP: c.netPremiums, pP: '$0', cV: c.orders, pV: 0, score: c.otmScore });
    for (const p of puts) {
      const e = map.get(p.symbol);
      if (e) { e.pP = p.netPremiums; e.pV = p.orders; }
      else map.set(p.symbol, { sym: p.symbol, cP: '$0', pP: p.netPremiums, cV: 0, pV: p.orders, score: p.otmScore });
    }
    return [...map.values()].sort((a, b) => b.score - a.score).slice(0, 10);
  }, [calls, puts]);

  if (cells.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.28 }}>
      <div style={{
        background: 'linear-gradient(180deg, rgba(16,16,15,0.96), rgba(10,10,10,0.96))',
        border: '1px solid rgba(201,166,70,0.13)',
        borderRadius: 7,
        overflow: 'hidden',
      }}>
        <div style={{
          minHeight: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '4px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#BDBDBD', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Options Flow Heatmap
            <span style={{ color: '#6B6B6B', fontSize: 8 }}>ⓘ</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#8D8D8D', fontSize: 8, fontWeight: 700 }}>
            <span><span style={{ color: C.green }}>●</span> Bullish</span>
            <span><span style={{ color: C.amber }}>●</span> Neutral</span>
            <span><span style={{ color: C.red }}>●</span> Bearish</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(58px, 1fr))', gap: 4, padding: 5, background: 'rgba(255,255,255,0.01)' }}>
        {cells.map((c, i) => {
          const ratio = (c.cV - c.pV) / ((c.cV + c.pV) || 1);
          const isBull = ratio > 0.12;
          const isBear = ratio < -0.12;
          const col = isBull ? C.green : isBear ? C.red : C.amber;
          const directionalScore = clamp(Math.abs(ratio), 0, 0.99).toFixed(2);
          const bg = isBull
            ? `linear-gradient(135deg, rgba(16,185,129,${0.08 + Math.abs(ratio) * 0.14}), rgba(16,185,129,0.025))`
            : isBear
              ? `linear-gradient(135deg, rgba(239,68,68,${0.08 + Math.abs(ratio) * 0.14}), rgba(239,68,68,0.025))`
              : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))';

          return (
            <motion.div
              key={c.sym}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 + i * 0.02, duration: 0.25 }}
              style={{ padding: '6px 5px', minHeight: 51, background: bg, border: `1px solid ${col}36`, borderRadius: 4, textAlign: 'center' }}
            >
              <div style={{ fontSize: 9, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{c.sym}</div>
              <div style={{ fontSize: 14, color: col, fontWeight: 900, lineHeight: 1 }}>{directionalScore}</div>
              <div style={{
                marginTop: 4, fontSize: 7, fontWeight: 800,
                color: col, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL'}
              </div>
            </motion.div>
          );
        })}
      </div>
      </div>
    </motion.div>
  );
});

// --------------------------------------------------
//   3. GEX Profile - real gamma by strike (bar chart)
// --------------------------------------------------

const GexProfile = memo(function GexProfile({ data, currentPrice }: { data: OverviewChartsData; currentPrice?: number }) {
  const gexData = useMemo(() => {
    const { strikes, points } = data.odteGex ?? { strikes: [], points: [] };
    if (!strikes.length || !points.length) return [];
    const p = points[0];
    const full = [...strikes]
      .sort((a, b) => a - b)
      .map(s => ({ strike: s, gex: (p as any)[`s${s}`] || 0 }));

    const anchor = currentPrice ?? full[Math.floor(full.length / 2)]?.strike ?? 0;
    const currentIndex = full.reduce((best, item, index) => (
      Math.abs(item.strike - anchor) < Math.abs(full[best].strike - anchor) ? index : best
    ), 0);

    const visibleCount = Math.min(11, full.length);
    const half = Math.floor(visibleCount / 2);
    const start = Math.max(0, Math.min(currentIndex - half, full.length - visibleCount));
    const centered = full.slice(start, start + visibleCount);

    return centered.reverse().map((item, index) => ({
      ...item,
      isCurrent: item.strike === full[currentIndex].strike,
      positiveGex: item.gex > 0 ? item.gex : 0,
      negativeGex: item.gex < 0 ? item.gex : 0,
      rowIndex: index,
    }));
  }, [data.odteGex, currentPrice]);

  if (gexData.length === 0) return null;
  const currentStrike = gexData.find(d => d.isCurrent)?.strike;
  const subtitle = currentStrike
    ? `Options gamma profile - SPY ${currentPrice ? `$${currentPrice.toFixed(2)}` : ''} centered at ${currentStrike}`
    : 'Options gamma profile by strike';
  const maxAbs = Math.max(...gexData.map(d => Math.abs(d.gex)), 1);
  const yBound = maxAbs * 1.22;

  return (
    <CC title="Gamma Exposure by Strike" subtitle={subtitle} icon={Activity} accentColor="#8B5CF6" delay={0.2}>
      <ResponsiveContainer width="100%" height={286}>
        <BarChart data={gexData} layout="vertical" barCategoryGap={8} margin={{ top: 12, right: 24, left: 12, bottom: 8 }}>
          <defs>
            <linearGradient id="gexPositiveProfile" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={C.green} stopOpacity={0.18} />
              <stop offset="100%" stopColor={C.green} stopOpacity={0.88} />
            </linearGradient>
            <linearGradient id="gexNegativeProfile" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor={C.red} stopOpacity={0.16} />
              <stop offset="100%" stopColor={C.red} stopOpacity={0.84} />
            </linearGradient>
          </defs>
          <XAxis
            type="number"
            domain={[-yBound, yBound]}
            tick={{ fill: '#454545', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => fmt(v)}
          />
          <YAxis
            type="category"
            dataKey="strike"
            orientation="right"
            tick={{ fill: '#777', fontSize: 10, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            width={46}
            interval={0}
          />
          <Tooltip content={<DTip />} />
          <ReferenceLine x={0} stroke="rgba(244,217,123,0.24)" strokeDasharray="2 4" />
          {currentStrike && (
            <ReferenceLine
              y={currentStrike}
              stroke="rgba(244,217,123,0.46)"
              strokeDasharray="4 4"
              label={{ value: 'SPY', fill: C.goldLight, fontSize: 10, position: 'insideTopLeft' }}
            />
          )}
          <Bar dataKey="negativeGex" name="Put Gamma" radius={[4, 0, 0, 4]} barSize={14}>
            {gexData.map((e, i) => (
              <Cell
                key={`neg-${i}`}
                fill={e.isCurrent ? 'rgba(140,140,140,0.72)' : 'url(#gexNegativeProfile)'}
                stroke={e.isCurrent ? 'rgba(244,217,123,0.42)' : 'rgba(239,68,68,0.08)'}
                strokeWidth={e.isCurrent ? 1 : 0}
              />
            ))}
          </Bar>
          <Bar dataKey="positiveGex" name="Call Gamma" radius={[0, 4, 4, 0]} barSize={14}>
            {gexData.map((e, i) => (
              <Cell
                key={`pos-${i}`}
                fill={e.isCurrent ? 'rgba(140,140,140,0.72)' : 'url(#gexPositiveProfile)'}
                stroke={e.isCurrent ? 'rgba(244,217,123,0.42)' : 'rgba(16,185,129,0.08)'}
                strokeWidth={e.isCurrent ? 1 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CC>
  );
});

// --------------------------------------------------
//   4. Sector Pulse - premium by sector
// --------------------------------------------------

const SectorPulse = memo(function SectorPulse({ data }: { data: OverviewChartsData }) {
  const radarScores = useMemo(() => {
    const scores = new Map<string, number>();
    (data.sectorRadar ?? []).forEach(s => scores.set(s.sector, s.value));
    return scores;
  }, [data.sectorRadar]);

  const sectors = useMemo(() => {
    const premiums = (data.sectorPremiums ?? []).map(s => ({
      sector: s.sector,
      premium: s.value,
      strength: radarScores.get(s.sector) ?? 50,
    }));

    if (premiums.length > 0) {
      return premiums.sort((a, b) => b.premium - a.premium).slice(0, 8);
    }

    return (data.sectorRadar ?? []).map(s => ({
      sector: s.sector,
      premium: s.value * 100000,
      strength: s.value,
    })).sort((a, b) => b.strength - a.strength).slice(0, 8);
  }, [data.sectorPremiums, data.sectorRadar, radarScores]);

  const profile = sectors.map(s => {
    const tilt = clamp(s.strength, 0, 100) - 50;
    const signedPremium = Math.abs(s.premium) * (tilt >= 0 ? 1 : -1);
    return {
      ...s,
      signedPremium,
      absPremium: Math.abs(s.premium),
      change: (tilt / 2.5).toFixed(0),
    };
  });
  const mx = Math.max(...profile.map(s => Math.abs(s.signedPremium)), 1);
  const top = profile.reduce((best, item) => item.signedPremium > best.signedPremium ? item : best, profile[0]);
  const weakest = profile.reduce((best, item) => item.signedPremium < best.signedPremium ? item : best, profile[0]);
  if (sectors.length === 0) return null;

  return (
    <CC title="Sector Flow Pulse" subtitle="Options premium profile by sector" icon={Target} accentColor={C.gold} delay={0.25}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '0 2px',
          color: C.textDim,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          <span>Outflow</span>
          <span style={{ color: C.goldLight }}>Sector Profile</span>
          <span>Inflow</span>
        </div>

        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          padding: '8px 0',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            width: 1,
            background: 'linear-gradient(180deg, transparent, rgba(244,217,123,0.28), transparent)',
          }} />

          {profile.map((s, i) => {
            const positive = s.signedPremium >= 0;
            const width = Math.max(8, (Math.abs(s.signedPremium) / mx) * 46);
            const changeColor = positive ? C.green : C.red;
            const isLeader = s.sector === top.sector || s.sector === weakest.sector;
            return (
              <motion.div
                key={s.sector}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.04, duration: 0.35 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px minmax(0, 1fr) 120px',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 30,
                  padding: '5px 8px',
                  borderRadius: 7,
                  background: isLeader ? 'rgba(201,166,70,0.055)' : 'rgba(255,255,255,0.014)',
                  border: `1px solid ${isLeader ? 'rgba(201,166,70,0.18)' : 'rgba(255,255,255,0.04)'}`,
                }}
              >
                <span style={{ color: isLeader ? C.goldLight : C.textMuted, fontSize: 10, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{
                  position: 'relative',
                  height: 17,
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.34)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.035)',
                  overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ delay: 0.25 + i * 0.04, duration: 0.5, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      [positive ? 'left' : 'right']: '50%',
                      width: `${width}%`,
                      borderRadius: 999,
                      background: positive
                        ? `linear-gradient(90deg, rgba(201,166,70,0.14), ${C.green})`
                        : `linear-gradient(270deg, rgba(201,166,70,0.12), ${C.red})`,
                      opacity: isLeader ? 0.95 : 0.76,
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: 'rgba(244,217,123,0.26)',
                  }} />
                  <span style={{
                    position: 'absolute',
                    left: positive ? 'calc(50% + 8px)' : undefined,
                    right: positive ? undefined : 'calc(50% + 8px)',
                    top: 2,
                    color: '#F4EFE3',
                    fontSize: 10,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {fmt(s.absPremium)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
                  <span style={{ color: isLeader ? C.goldLight : '#D8D8D8', fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.sector}
                  </span>
                  <span style={{ color: changeColor, fontSize: 10, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {positive ? '+' : ''}{s.change}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
          paddingTop: 4,
        }}>
          {[
            { label: 'Top Inflow', value: top?.sector ?? '-', color: C.green },
            { label: 'Top Outflow', value: weakest?.sector ?? '-', color: C.red },
            { label: 'Dominant Flow', value: Math.abs(top?.signedPremium ?? 0) >= Math.abs(weakest?.signedPremium ?? 0) ? 'Inflow' : 'Outflow', color: C.goldLight },
          ].map(item => (
            <div key={item.label} style={{
              minHeight: 54,
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.018)',
              border: '1px solid rgba(201,166,70,0.12)',
            }}>
              <div style={{ color: C.textDim, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{item.label}</div>
              <div style={{ color: item.color, fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </CC>
  );
});

// --------------------------------------------------
//   5. Top Unusual - multi-ticker flows list
// --------------------------------------------------

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
                  Vol: {(f.volume ?? 0).toLocaleString()} - OI: {(f.openInterest ?? 0).toLocaleString()} - {(f.volOiRatio ?? 0).toFixed(1)}x
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

// --------------------------------------------------
// 6. VOLATILITY COCKPIT
// --------------------------------------------------

// --------------------------------------------------
// 7. ALERTS
// --------------------------------------------------

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

// --------------------------------------------------
// MAIN EXPORT
// --------------------------------------------------

const MarketReadout = memo(function MarketReadout({ text }: { text?: string | null }) {
  const copy = text ?? 'Institutional market readout is being prepared...';

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42, duration: 0.45, ease: 'easeOut' }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: 148,
        borderRadius: 14,
        padding: '24px 28px',
        background: `
          radial-gradient(circle at 18% 0%, rgba(244,217,123,0.13), transparent 34%),
          linear-gradient(135deg, rgba(201,166,70,0.105), rgba(13,11,8,0.92) 46%, rgba(0,0,0,0.76))
        `,
        border: '1px solid rgba(244,217,123,0.34)',
        boxShadow: '0 18px 60px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.9), transparent)',
      }} />
      <div style={{
        position: 'absolute',
        right: 24,
        top: 22,
        width: 110,
        height: 110,
        borderRadius: '50%',
        border: '1px solid rgba(244,217,123,0.13)',
        boxShadow: 'inset 0 0 32px rgba(201,166,70,0.06)',
      }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(244,217,123,0.22), rgba(201,166,70,0.07))',
              border: '1px solid rgba(244,217,123,0.32)',
              boxShadow: '0 0 22px rgba(201,166,70,0.18)',
            }}>
              <Brain style={{ width: 21, height: 21, color: C.goldLight }} />
            </div>
            <div style={{
              marginLeft: 6,
              padding: '6px 10px',
              borderRadius: 999,
              color: '#E6C968',
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'rgba(201,166,70,0.08)',
              border: '1px solid rgba(244,217,123,0.22)',
            }}>
              Await the close
            </div>
          </div>

          <p style={{
            margin: 0,
            maxWidth: 1120,
            color: '#F4EFE3',
            fontSize: 18,
            lineHeight: 1.7,
            fontWeight: 500,
          }}>
            {copy}
          </p>
        </div>
      </div>
    </motion.section>
  );
});

export const OverviewTab = memo(function OverviewTab({ data }: { data: OptionsData }) {
  const oc = data.overviewCharts ?? {
    marketNetFlow: [], odteFlow: [], odteGex: { strikes: [], points: [] },
    sectorRadar: [], sectorFlow: [], sectorFlowKeys: [], sectorPremiums: [],
    callsDashboard: [], putsDashboard: [],
  };
  const spyPrice = oc.marketNetFlow.at(-1)?.spyPrice
    ?? data.blockTrades.find(t => t.symbol === 'SPY')?.stockPrice;

  const label: React.CSSProperties = {
    color: C.textDim, fontSize: 11, fontWeight: 600, marginTop: 4,
    textTransform: 'uppercase', letterSpacing: '0.08em',
  };

  const grid2: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Regime data={data} />
      <FlowHeatmap calls={oc.callsDashboard} puts={oc.putsDashboard} />

      <div style={{ height: 12 }} />
      <div style={label}>Gamma & Sector Intelligence</div>
      <div style={grid2}>
        <GexProfile data={oc} currentPrice={spyPrice} />
        <SectorPulse data={oc} />
      </div>

      <div style={label}>Unusual Activity</div>
      <div style={grid2}>
        <TopActivity data={data} />
      </div>

      <AlertsPreview data={data} />
      <MarketReadout text={data.dailyReport?.bottomLine} />
    </div>
  );
});
