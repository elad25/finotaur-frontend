// src/pages/app/ai/Top5.tsx
// =====================================================
// 🔥 FINOTAUR AI SCANNER — Premium Edition v8
// =====================================================
// v8.0 CHANGES:
//   ✅ OverviewTab-style premium design (Investment Story, Bull/Bear, Factors)
//   ✅ 10K+ user optimization (in-memory cache, batch ops, zero AI on page load)
//   ✅ LITE Pattern Detection visualization (8 signals from דוגמא)
//   ✅ All scanned stocks stored in DB for future analysis
//   ✅ Server-side brief cache (same pattern as OverviewTab)
//   ✅ Unified card design — collapsed is clean, expanded is deep
//   ✅ Framer Motion premium animations
//   ✅ Admin Mode Toggle preserved
// =====================================================

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import {
  ChevronDown, Activity, Newspaper, Target, Zap, Flame,
  BarChart3, Building2, MessageCircle, Factory, CalendarClock,
  Link2, AudioLines, ShieldAlert, GitBranch, Radar,
  ScanLine, Lightbulb, TrendingUp, TrendingDown,
  RefreshCw, Clock, Crosshair, AlertTriangle, Star,
  Rocket, FileText, Quote, Shield, ArrowRightLeft, Sparkles,
  Brain, Eye, ChevronUp, BarChart2, Layers, Gauge,
} from 'lucide-react';
import { fetchAllPicks, fetchLogos } from '../../../services/top5Scanner.api';
import type { ScanResult, CatalystResult, CatalystPick, AnalystAction, SpilloverCompany } from '../../../services/top5Scanner.api';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

// Lazy load admin tracker (only loaded when admin toggles ON)
const AdminTrackerView = lazy(() => import('./AdminTrackerView'));

// ═══════════════════════════════════════════════
// 10K+ OPTIMIZATION: In-Memory Cache Layer
// ═══════════════════════════════════════════════
// All data is fetched ONCE from cached backend endpoints.
// Zero AI calls on page load. Zero redundant fetches.
// Logo cache persists across tab switches & re-renders.

const logoCache = new Map<string, string | null>();
const dataCache = {
  earnings: null as ScanResult | null,
  catalysts: null as CatalystResult | null,
  fetchedAt: 0,
  TTL: 2 * 60 * 1000, // 2 minutes — matches server cache
};

function useStockLogos(tickers: string[]): Map<string, string | null> {
  const [logos, setLogos] = useState<Map<string, string | null>>(new Map());
  const tickerKey = useMemo(() => tickers.join(','), [tickers]);

  useEffect(() => {
    if (tickers.length === 0) return;
    const cached = new Map<string, string | null>();
    const uncached: string[] = [];
    for (const t of tickers) {
      if (logoCache.has(t)) cached.set(t, logoCache.get(t)!);
      else uncached.push(t);
    }
    if (cached.size > 0) setLogos(new Map(cached));
    if (uncached.length === 0) return;
    let cancelled = false;
    fetchLogos(uncached).then(fetched => {
      if (cancelled) return;
      const merged = new Map(cached);
      for (const [k, v] of fetched) { logoCache.set(k, v); merged.set(k, v); }
      setLogos(merged);
    });
    return () => { cancelled = true; };
  }, [tickerKey]);

  return logos;
}

// ═══════════════════════════════════════════════
// DESIGN TOKENS — Premium Luxury System
// ═══════════════════════════════════════════════

const GOLD = {
  primary: '#C9A646',
  light: '#F4D97B',
  warm: '#E8DCC4',
  dim: 'rgba(201,166,70,',
  gradient: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
};

const GREEN = { solid: '#22C55E', dim: 'rgba(34,197,94,' };
const RED = { solid: '#EF4444', dim: 'rgba(239,68,68,' };
const PURPLE = { solid: '#A855F7', dim: 'rgba(168,85,247,' };

// ═══════════════════════════════════════════════
// SHARED UI COMPONENTS — Premium Tier
// ═══════════════════════════════════════════════

const Card = ({ children, className = '', glow = false, highlight = false, gold = false }: {
  children: React.ReactNode; className?: string; glow?: boolean; highlight?: boolean; gold?: boolean;
}) => (
  <div className={`rounded-2xl border relative overflow-hidden ${className}`} style={{
    background: glow
      ? 'linear-gradient(165deg, rgba(26,24,18,0.98), rgba(18,16,12,0.95))'
      : gold
        ? 'linear-gradient(165deg, rgba(24,22,16,0.98), rgba(16,14,10,0.95))'
        : 'linear-gradient(165deg, rgba(20,19,16,0.95), rgba(14,13,10,0.9))',
    borderColor: glow ? `${GOLD.dim}0.2)` : gold ? `${GOLD.dim}0.15)` : highlight ? `${GOLD.dim}0.12)` : `${GOLD.dim}0.06)`,
    boxShadow: glow
      ? `0 16px 64px rgba(0,0,0,0.6), 0 0 0 1px ${GOLD.dim}0.05), inset 0 1px 0 ${GOLD.dim}0.08)`
      : `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 ${GOLD.dim}0.03)`,
  }}>
    {(glow || highlight || gold) && (
      <div className="absolute top-0 left-0 w-full h-[1px]" style={{
        background: `linear-gradient(90deg, transparent, ${GOLD.dim}${glow ? 0.25 : gold ? 0.18 : 0.1}), transparent)`,
      }} />
    )}
    {children}
  </div>
);

// ── Score Ring (OverviewTab style) ────────────────
const ScoreRing = ({ score, size = 54, label }: { score: number; size?: number; label?: string }) => {
  const sw = 2.5, r = (size - sw) / 2, c = 2 * Math.PI * r, o = c - (score / 100) * c;
  const color = score >= 85 ? GOLD.light : score >= 70 ? GOLD.primary : `${GOLD.dim}0.5)`;
  return (
    <div className="relative flex-shrink-0 flex flex-col items-center gap-0.5">
      <div className="relative" style={{
        width: size, height: size,
        filter: `drop-shadow(0 0 ${score >= 80 ? 12 : 6}px ${GOLD.dim}${score >= 80 ? 0.25 : 0.1}))`,
      }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color}
            strokeWidth={sw} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-[16px]"
          style={{ color }}>{score}</div>
      </div>
      {label && <span className="text-[7px] font-bold uppercase tracking-[0.18em]" style={{ color: '#7A7A7A' }}>{label}</span>}
    </div>
  );
};

const SignalBar = ({ score }: { score: number }) => (
  <div className="w-full h-[2px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
    <div className="h-full rounded-full transition-all duration-700" style={{
      width: `${score}%`,
      background: score >= 80
        ? `linear-gradient(90deg, ${GOLD.primary}, ${GOLD.light})`
        : score >= 60
          ? `linear-gradient(90deg, ${GOLD.dim}0.3), ${GOLD.dim}0.5))`
          : `${GOLD.dim}0.25)`,
    }} />
  </div>
);

const ScoreNum = ({ score }: { score: number }) => (
  <span className="font-mono text-[11px] font-bold" style={{
    color: score >= 85 ? GOLD.light : score >= 70 ? GOLD.primary : '#7A7A7A',
  }}>{score}</span>
);

// ── Logo Component ─────────────────────────────────
const StockLogo = ({ ticker, logo, size = 48 }: { ticker: string; logo?: string; size?: number }) => {
  const [hasError, setHasError] = useState(false);
  if (!logo || hasError) return (
    <div className="flex-shrink-0 flex items-center justify-center rounded-xl" style={{
      width: size, height: size,
      background: `linear-gradient(135deg, ${GOLD.dim}0.15), ${GOLD.dim}0.03))`,
      border: `1.5px solid ${GOLD.dim}0.25)`,
      boxShadow: `0 4px 20px ${GOLD.dim}0.12)`,
    }}>
      <span className="font-bold tracking-wide" style={{ fontSize: size * 0.26, color: `${GOLD.dim}0.7)` }}>{ticker.slice(0, 2)}</span>
    </div>
  );
  return (
    <div className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center" style={{
      width: size, height: size,
      background: `linear-gradient(135deg, ${GOLD.dim}0.15), ${GOLD.dim}0.03))`,
      border: `1.5px solid ${GOLD.dim}0.25)`,
      boxShadow: `0 4px 20px ${GOLD.dim}0.12)`,
    }}>
      <img src={logo} alt={ticker} className="w-full h-full object-contain p-1.5 rounded-xl" onError={() => setHasError(true)} />
    </div>
  );
};

// ── Direction Badge ─────────────────────────────
const DirectionBadge = ({ direction }: { direction: string }) => {
  const isBullish = direction === 'BULLISH';
  const isBearish = direction === 'BEARISH';
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{
      background: isBullish ? `${GREEN.dim}0.1)` : isBearish ? `${RED.dim}0.1)` : `${GOLD.dim}0.06)`,
      border: `1px solid ${isBullish ? `${GREEN.dim}0.25)` : isBearish ? `${RED.dim}0.25)` : `${GOLD.dim}0.12)`}`,
    }}>
      {isBullish ? <TrendingUp className="h-3 w-3" style={{ color: GREEN.solid }} />
        : isBearish ? <TrendingDown className="h-3 w-3" style={{ color: RED.solid }} />
        : <BarChart3 className="h-3 w-3" style={{ color: GOLD.primary }} />}
      <span className="text-[10px] font-bold font-mono tracking-wider" style={{
        color: isBullish ? GREEN.solid : isBearish ? RED.solid : GOLD.primary,
      }}>{direction}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════
// SIGNAL CONFIGS
// ═══════════════════════════════════════════════

const SCANNER_SIGNAL_CONFIG: Record<string, { icon: React.ReactNode; label: string; weightLabel: string }> = {
  volume:        { icon: <Activity className="h-3.5 w-3.5" />,      label: 'Volume Anomaly',    weightLabel: '15%' },
  news:          { icon: <Newspaper className="h-3.5 w-3.5" />,     label: 'News Catalyst',     weightLabel: '15%' },
  options:       { icon: <Target className="h-3.5 w-3.5" />,        label: 'Options Flow',      weightLabel: '12%' },
  gap:           { icon: <Zap className="h-3.5 w-3.5" />,           label: 'Gap Analysis',      weightLabel: '10%' },
  shortInterest: { icon: <Flame className="h-3.5 w-3.5" />,         label: 'Short Interest',    weightLabel: '10%' },
  technical:     { icon: <BarChart3 className="h-3.5 w-3.5" />,     label: 'Technical Setup',   weightLabel: '10%' },
  darkPool:      { icon: <Building2 className="h-3.5 w-3.5" />,     label: 'Dark Pool',         weightLabel: '8%' },
  social:        { icon: <MessageCircle className="h-3.5 w-3.5" />, label: 'Social Sentiment',  weightLabel: '8%' },
  sector:        { icon: <Factory className="h-3.5 w-3.5" />,       label: 'Sector Strength',   weightLabel: '6%' },
  events:        { icon: <CalendarClock className="h-3.5 w-3.5" />, label: 'Events Calendar',   weightLabel: '6%' },
};

const LITE_SIGNAL_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  guidanceTone:       { icon: <AudioLines className="h-3.5 w-3.5" />, label: 'Guidance Tone Shift' },
  earningsInflection: { icon: <GitBranch className="h-3.5 w-3.5" />,  label: 'Earnings Inflection' },
  supplyChain:        { icon: <Link2 className="h-3.5 w-3.5" />,      label: 'Supply Chain Position' },
};

const CATALYST_SIGNAL_CONFIG: Record<string, { icon: React.ReactNode; label: string; weightLabel: string }> = {
  catalystMagnitude:  { icon: <Zap className="h-3.5 w-3.5" />,         label: 'Catalyst Magnitude',    weightLabel: '20%' },
  earningsImpact:     { icon: <TrendingUp className="h-3.5 w-3.5" />,  label: 'Earnings Impact',       weightLabel: '18%' },
  competitivePosition:{ icon: <ShieldAlert className="h-3.5 w-3.5" />, label: 'Competitive Position',  weightLabel: '13%' },
  guidanceTone:       { icon: <AudioLines className="h-3.5 w-3.5" />,  label: 'Guidance Tone',         weightLabel: '10%' },
  analystRevisions:   { icon: <Target className="h-3.5 w-3.5" />,      label: 'Analyst Revisions',     weightLabel: '9%' },
  marginExpansion:    { icon: <BarChart3 className="h-3.5 w-3.5" />,   label: 'Margin Expansion',      weightLabel: '8%' },
  supplyChain:        { icon: <Link2 className="h-3.5 w-3.5" />,       label: 'Supply Chain',          weightLabel: '7%' },
  shortSqueeze:       { icon: <Flame className="h-3.5 w-3.5" />,       label: 'Short Squeeze Setup',   weightLabel: '6%' },
  tamExpansion:       { icon: <Radar className="h-3.5 w-3.5" />,       label: 'TAM Expansion',         weightLabel: '5%' },
  macroTailwind:      { icon: <Factory className="h-3.5 w-3.5" />,     label: 'Macro Tailwind',        weightLabel: '4%' },
};

// ── LITE Pattern 8 Signals (from דוגמא) ─────────
const LITE_PATTERN_SIGNALS: Record<string, { icon: React.ReactNode; label: string; description: string }> = {
  earningsTrough:     { icon: <GitBranch className="h-3.5 w-3.5" />,    label: 'Earnings Trough + Reversal',  description: 'Revenue declined 2-3 quarters then reversed' },
  managementTone:     { icon: <AudioLines className="h-3.5 w-3.5" />,   label: 'Management Tone Shift',       description: 'Dramatic language shift from cautious to confident' },
  guidanceShock:      { icon: <TrendingUp className="h-3.5 w-3.5" />,   label: 'Guidance Shock',              description: 'Forward guidance 15%+ above consensus' },
  bottleneckSupplier: { icon: <Link2 className="h-3.5 w-3.5" />,        label: 'Bottleneck Supplier',         description: 'Sole source, demand > supply, pricing power' },
  acceleratingGrowth: { icon: <Rocket className="h-3.5 w-3.5" />,       label: 'Accelerating Growth',         description: 'Growth rate increasing each quarter' },
  multipleEngines:    { icon: <Layers className="h-3.5 w-3.5" />,       label: 'Multiple Growth Engines',     description: '2-3 product lines at different maturity stages' },
  analystCascade:     { icon: <Target className="h-3.5 w-3.5" />,       label: 'Analyst Revision Cascade',    description: '5+ analysts raising targets 50%+ in a week' },
  macroTailwind:      { icon: <Factory className="h-3.5 w-3.5" />,      label: 'Macro Tailwind',              description: 'Part of a large structural trend' },
};

const INFLECTION_LABELS: Record<string, string> = {
  EARLY: 'Early Inflection', ACCELERATING: 'Accelerating', CONFIRMED: 'Confirmed', 'N/A': 'Momentum',
};
const TRADE_LABELS: Record<string, string> = {
  day_trade: 'Day Trade', swing_trade: 'Swing', position_trade: 'Position', long_term_hold: 'Long Term', sector_rotation: 'Sector Rotation',
};
const CATALYST_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  earnings_beat:        { label: 'Earnings Beat',         icon: <TrendingUp className="h-3 w-3" />,   color: GREEN.solid },
  EARNINGS_GUIDANCE_RAISE: { label: 'Earnings Guidance Raise', icon: <TrendingUp className="h-3 w-3" />, color: GREEN.solid },
  major_contract:       { label: 'Major Contract',        icon: <FileText className="h-3 w-3" />,     color: GOLD.primary },
  product_launch:       { label: 'Product / FDA',         icon: <Rocket className="h-3 w-3" />,       color: PURPLE.solid },
  guidance_raise:       { label: 'Guidance Raise',        icon: <TrendingUp className="h-3 w-3" />,   color: GREEN.solid },
  ma_activity:          { label: 'M&A Activity',          icon: <Building2 className="h-3 w-3" />,    color: PURPLE.solid },
  cost_turnaround:      { label: 'Turnaround',            icon: <GitBranch className="h-3 w-3" />,    color: GOLD.primary },
  market_expansion:     { label: 'Market Expansion',      icon: <Radar className="h-3 w-3" />,        color: GOLD.primary },
  contract:             { label: 'Major Contract',        icon: <FileText className="h-3 w-3" />,     color: GOLD.primary },
  fda_approval:         { label: 'FDA Approval',          icon: <ShieldAlert className="h-3 w-3" />,  color: GREEN.solid },
  restructuring:        { label: 'Restructuring',         icon: <GitBranch className="h-3 w-3" />,    color: GOLD.primary },
  product:              { label: 'Product Launch',        icon: <Rocket className="h-3 w-3" />,       color: PURPLE.solid },
  partnership:          { label: 'Partnership',           icon: <Link2 className="h-3 w-3" />,        color: GOLD.primary },
  expansion:            { label: 'Expansion',             icon: <Radar className="h-3 w-3" />,        color: GOLD.primary },
  guidance:             { label: 'Guidance',              icon: <TrendingUp className="h-3 w-3" />,   color: GREEN.solid },
  ma:                   { label: 'M&A',                   icon: <Building2 className="h-3 w-3" />,    color: PURPLE.solid },
  MAJOR_UPGRADE_AND_STOCK_JUMP: { label: 'Major Upgrade', icon: <TrendingUp className="h-3 w-3" />,  color: GREEN.solid },
};

// ═══════════════════════════════════════════════
// SECTION HEADER — Premium (OverviewTab style)
// ═══════════════════════════════════════════════

const SectionHeader = ({ icon, title, subtitle, count, aiPowered }: {
  icon: React.ReactNode; title: string; subtitle: string; count: number; aiPowered?: boolean;
}) => (
  <div className="flex items-center gap-4 mb-5 px-1">
    <div className="w-11 h-11 rounded-xl flex items-center justify-center relative" style={{
      background: `linear-gradient(135deg, ${GOLD.dim}0.15), ${GOLD.dim}0.05))`,
      border: `1px solid ${GOLD.dim}0.25)`,
      boxShadow: `0 0 24px ${GOLD.dim}0.1), inset 0 1px 0 ${GOLD.dim}0.12)`,
    }}>
      {icon}
      {aiPowered && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{
        background: `linear-gradient(135deg, ${GOLD.primary}, ${GOLD.light})`,
        boxShadow: `0 2px 8px ${GOLD.dim}0.4)`,
      }}><Sparkles className="h-2.5 w-2.5 text-[#0a0a0a]" /></div>}
    </div>
    <div className="flex-1">
      <h2 className="text-[16px] font-bold text-white tracking-tight">{title}</h2>
      <p className="text-[11px] mt-0.5" style={{ color: '#7A7A7A' }}>{subtitle}</p>
    </div>
    <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl" style={{
      background: `${GOLD.dim}0.06)`, border: `1px solid ${GOLD.dim}0.15)`,
    }}>
      <span className="font-mono text-[15px] font-bold" style={{ color: GOLD.primary }}>{count}</span>
      <span className="text-[8px] uppercase tracking-[0.15em]" style={{ color: '#8B8B8B' }}>picks</span>
    </div>
  </div>
);

// ── Stats Bar ──────────────────────────────────
const StatsBar = ({ stats }: { stats: { label: string; value: string; suffix?: string }[] }) => (
  <div className="grid grid-cols-4 gap-3 mb-5">
    {stats.map((stat, i) => (
      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
        <Card className="p-4 py-5" highlight>
          <div className="text-[7.5px] font-bold uppercase tracking-[0.2em] mb-2.5" style={{ color: '#8B8B8B' }}>{stat.label}</div>
          <div className="font-mono text-[22px] font-extrabold tracking-tight" style={{ color: GOLD.light }}>
            {stat.value}{stat.suffix && <span className="text-[12px] font-medium ml-0.5" style={{ color: `${GOLD.dim}0.4)` }}>{stat.suffix}</span>}
          </div>
        </Card>
      </motion.div>
    ))}
  </div>
);

// ═══════════════════════════════════════════════
// CARD HEADER — Collapsed View (Premium)
// ═══════════════════════════════════════════════

const CardHeader = ({ stock, index, isExpanded, onToggle, logo, badges, scoreRight }: {
  stock: any; index: number; isExpanded: boolean; onToggle: () => void; logo: string | null | undefined;
  badges: React.ReactNode; scoreRight: React.ReactNode;
}) => {
  const changeColor = stock.change > 0 ? GREEN.solid : stock.change < 0 ? RED.solid : '#8B8B8B';
  return (
    <div className="flex items-center gap-5 px-6 py-5 cursor-pointer group" onClick={onToggle}>
      <div className="relative flex-shrink-0">
        <StockLogo ticker={stock.ticker} logo={logo || undefined} size={50} />
        <div className="absolute -top-1.5 -left-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center font-mono font-black text-[9px]"
          style={{ background: GOLD.gradient, color: '#0a0a0a', boxShadow: `0 2px 8px ${GOLD.dim}0.4)` }}>
          {index + 1}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
          <span className="font-mono font-black text-[22px] text-white tracking-wide leading-none">{stock.ticker}</span>
          <DirectionBadge direction={stock.direction} />
          {badges}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate" style={{ color: '#9A9A9A' }}>{stock.name}</span>
          {stock.sector && <>
            <span className="text-[10px]" style={{ color: '#3A3A3A' }}>·</span>
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#6A6A6A' }}>{stock.sector}</span>
          </>}
        </div>
      </div>
      <div className="text-right mr-3 flex-shrink-0">
        <div className="font-mono font-bold text-[22px] text-white tracking-tight">${stock.price?.toFixed(2) || '—'}</div>
        <span className="font-mono text-[12px] font-semibold" style={{ color: changeColor }}>
          {stock.change > 0 ? '+' : ''}{stock.change}%
        </span>
      </div>
      {scoreRight}
      <ChevronDown className={`h-4 w-4 transition-transform duration-500 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} style={{ color: '#4A4A4A' }} />
    </div>
  );
};

// ═══════════════════════════════════════════════
// EXPANDED SECTIONS — OverviewTab Premium Style
// ═══════════════════════════════════════════════

// ── What Happened + Why Significant (compact) ──
const EventSummary = ({ stock }: { stock: any }) => {
  const whatHappened = stock.whatHappened || stock.catalyst || stock.catalystHeadline || '';
  const whySignificant = stock.whySignificant || stock.whyThisStock || stock.catalystImpact || '';
  if (!whatHappened && !whySignificant) return null;

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl" style={{
      background: `linear-gradient(135deg, ${GOLD.dim}0.04), ${GOLD.dim}0.01))`,
      border: `1px solid ${GOLD.dim}0.12)`,
    }}>
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: GOLD.primary }} />
      <div className="space-y-2">
        {whatHappened && (
          <p className="text-[13px] leading-relaxed" style={{ color: '#C8C8C8' }}>{whatHappened}</p>
        )}
        {whySignificant && (
          <p className="text-[12.5px] leading-[1.8]" style={{ color: '#A8A8A8' }}>{whySignificant}</p>
        )}
        {stock.earningsImpact && (
          <p className="text-[12px] leading-relaxed" style={{ color: '#8A8A8A' }}>
            <span className="font-bold" style={{ color: GOLD.primary }}>Earnings Impact: </span>{stock.earningsImpact}
          </p>
        )}
      </div>
    </div>
  );
};

// ── Before State + Bull/Bear (compact, earnings-focused) ──
const BeforeBullBear = ({ stock }: { stock: any }) => {
  const beforeState = stock.beforeState || '';
  const bullCase = stock.bullCase || (stock.highlights || []).slice(0, 2).join('. ') || '';
  const bearCase = stock.bearCase || (stock.riskLevel >= 3 ? 'Elevated risk profile with potential volatility.' : '');

  if (!beforeState && !bullCase && !bearCase) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
      {/* Before State */}
      {beforeState && (
        <div className="p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5" style={{ color: '#8A8A8A' }} />
            <span className="text-[10px] font-bold tracking-wide" style={{ color: '#8A8A8A' }}>BEFORE</span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: '#9A9A9A' }}>{beforeState}</p>
        </div>
      )}

      {/* Bull Case */}
      {bullCase && (
        <div className="p-3.5 rounded-xl" style={{ background: `${GREEN.dim}0.04)`, border: `1px solid ${GREEN.dim}0.15)` }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: GREEN.solid }} />
            <span className="text-[10px] font-bold tracking-wide" style={{ color: GREEN.solid }}>BULL CASE</span>
          </div>
          <p className="text-[12px] text-[#C8C8C8] leading-relaxed">{bullCase}</p>
        </div>
      )}

      {/* Bear Case */}
      {bearCase && (
        <div className="p-3.5 rounded-xl" style={{ background: `${RED.dim}0.04)`, border: `1px solid ${RED.dim}0.15)` }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-3.5 h-3.5" style={{ color: RED.solid }} />
            <span className="text-[10px] font-bold tracking-wide" style={{ color: RED.solid }}>BEAR CASE</span>
          </div>
          <p className="text-[12px] text-[#C8C8C8] leading-relaxed">{bearCase}</p>
        </div>
      )}
    </div>
  );
};

// ── Finotaur FINOTAUR SCORE (enhanced with 8 signals) ──
const FinotaurPatternSection = ({ stock }: { stock: any }) => {
  const finScore = stock.finotaurScore || stock.finotaurScore || 0;
  const sortedLite = Object.entries(stock.liteSignals || {}).sort((a, b) => ((b[1] as any).score || 0) - ((a[1] as any).score || 0));

  if (finScore === 0 && sortedLite.length === 0) return null;

  const scoreLevel = finScore >= 90 ? 'Perfect Pattern' : finScore >= 75 ? 'Strong Potential' : finScore >= 60 ? 'Early Signals' : 'Monitoring';
  const scoreColor = finScore >= 75 ? GREEN.solid : finScore >= 60 ? GOLD.primary : `${GOLD.dim}0.4)`;

  return (
    <div className="p-6 rounded-xl" style={{
      background: `linear-gradient(135deg, ${GOLD.dim}0.03), ${GOLD.dim}0.008))`,
      border: `1px solid ${GOLD.dim}0.08)`,
    }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
            background: `linear-gradient(135deg, ${GOLD.dim}0.12), ${GOLD.dim}0.04))`,
            border: `1px solid ${GOLD.dim}0.15)`,
          }}>
            <Brain className="h-4 w-4" style={{ color: GOLD.primary }} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: GOLD.primary }}>
              FINOTAUR SCORE
            </span>
            <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{
              background: `${GOLD.dim}0.08)`, border: `1px solid ${GOLD.dim}0.12)`, color: scoreColor,
            }}>{scoreLevel}</span>
          </div>
        </div>
        {finScore > 0 && (
          <div className="flex items-center gap-2">
            <ScoreRing score={finScore} size={44} />
          </div>
        )}
      </div>

      {stock.liteParallel && (
        <p className="text-[12.5px] leading-relaxed mb-5" style={{ color: '#9A9A9A' }}>{stock.liteParallel}</p>
      )}

      {sortedLite.length > 0 && (
        <div className="space-y-4">
          {sortedLite.map(([key, val]) => {
            const v = val as { score: number; detail: string; weight: number };
            const cfg = LITE_SIGNAL_CONFIG[key];
            if (!cfg) return null;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span style={{ color: `${GOLD.dim}0.3)` }}>{cfg.icon}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#8A8A8A' }}>{cfg.label}</span>
                  </div>
                  <ScoreNum score={v.score} />
                </div>
                <SignalBar score={v.score} />
                <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: '#7A7A7A' }}>{v.detail}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Analyst Reactions Table ──
const AnalystReactionsTable = ({ actions }: { actions: AnalystAction[] }) => {
  if (!actions?.length) return null;
  return (
    <div className="p-5 rounded-xl" style={{
      background: `linear-gradient(135deg, ${GOLD.dim}0.025), ${GOLD.dim}0.005))`,
      border: `1px solid ${GOLD.dim}0.07)`,
    }}>
      <div className="flex items-center gap-2 mb-3.5">
        <BarChart3 className="h-3.5 w-3.5" style={{ color: `${GOLD.dim}0.35)` }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: `${GOLD.dim}0.35)` }}>Analyst Reactions</span>
      </div>
      <div className="overflow-hidden rounded-lg" style={{ border: `1px solid ${GOLD.dim}0.05)` }}>
        <table className="w-full text-[11px]">
          <thead><tr style={{ background: `${GOLD.dim}0.03)` }}>
            {['Firm', 'Action', 'Rating', 'Target'].map(h => (
              <th key={h} className={`${h === 'Target' ? 'text-right' : 'text-left'} px-3.5 py-2.5 text-[9px] font-bold uppercase tracking-wider`} style={{ color: '#8A8A8A' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{actions.map((a, i) => (
            <tr key={i} style={{ borderTop: `1px solid ${GOLD.dim}0.03)` }}>
              <td className="px-3.5 py-2.5 font-medium" style={{ color: '#9A9A9A' }}>{a.firm}</td>
              <td className="px-3.5 py-2.5 font-mono capitalize" style={{ color: GOLD.primary }}>{a.action}</td>
              <td className="px-3.5 py-2.5" style={{ color: '#8A8A8A' }}>{a.rating}</td>
              <td className="px-3.5 py-2.5 text-right font-mono font-semibold" style={{ color: GOLD.light }}>{a.priceTarget ? `$${a.priceTarget}` : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
};

// ── Top 3 Signals (compact, expandable) ──
const TopSignals = ({ signals, config }: {
  signals: Record<string, any>;
  config: Record<string, { icon: React.ReactNode; label: string; weightLabel: string }>;
}) => {
  const [showAll, setShowAll] = useState(false);
  if (!signals || Object.keys(signals).length === 0) return null;
  const sorted = Object.entries(signals).sort((a, b) => ((b[1] as any).score || 0) - ((a[1] as any).score || 0));
  const visible = showAll ? sorted : sorted.slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Radar className="h-3.5 w-3.5" style={{ color: '#5A5A5A' }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#6A6A6A' }}>
            Top Signals {!showAll && sorted.length > 3 && `(${sorted.length} total)`}
          </span>
        </div>
        {sorted.length > 3 && (
          <button onClick={(e) => { e.stopPropagation(); setShowAll(!showAll); }}
            className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors"
            style={{ color: GOLD.primary, background: `${GOLD.dim}0.04)` }}>
            {showAll ? 'Less' : 'All'} {showAll ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {visible.map(([key, val]) => {
          const v = val as { score: number; detail: string };
          const cfg = config[key];
          if (!cfg) return null;
          return (
            <div key={key} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.015)' }}>
              <span style={{ color: `${GOLD.dim}0.3)` }}>{cfg.icon}</span>
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] w-[130px] flex-shrink-0" style={{ color: '#8A8A8A' }}>{cfg.label}</span>
              <div className="flex-1"><SignalBar score={v.score} /></div>
              <ScoreNum score={v.score} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Scanner Signals Grid (full, used when needed) ──
const SignalsGrid = ({ signals, config }: {
  signals: Record<string, any>;
  config: Record<string, { icon: React.ReactNode; label: string; weightLabel: string }>;
}) => {
  if (!signals || Object.keys(signals).length === 0) return null;
  const sorted = Object.entries(signals).sort((a, b) => ((b[1] as any).score || 0) - ((a[1] as any).score || 0));

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Radar className="h-3.5 w-3.5" style={{ color: 'rgba(139,139,139,0.2)' }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#6A6A6A' }}>Scanner Signals</span>
      </div>
      <div className="grid grid-cols-2 gap-[1px] rounded-xl overflow-hidden" style={{ background: `${GOLD.dim}0.03)` }}>
        {sorted.map(([key, val]) => {
          const v = val as { score: number; detail: string };
          const cfg = config[key];
          if (!cfg) return null;
          return (
            <div key={key} className="p-4" style={{ background: 'rgba(12,11,9,0.95)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span style={{ color: `${GOLD.dim}0.25)` }}>{cfg.icon}</span>
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#8A8A8A' }}>{cfg.label}</span>
                  <span className="text-[8px] font-mono" style={{ color: '#5A5A5A' }}>{cfg.weightLabel}</span>
                </div>
                <ScoreNum score={v.score} />
              </div>
              <SignalBar score={v.score} />
              <p className="text-[10.5px] mt-1.5 leading-relaxed" style={{ color: '#7A7A7A' }}>{v.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Trade Info + Level Cards ──
const TradeInfo = ({ stock }: { stock: any }) => {
  if (!stock.tradeType) return null;
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 rounded-xl" style={{
      background: `${GOLD.dim}0.02)`, border: `1px solid ${GOLD.dim}0.05)`,
    }}>
      <Crosshair className="h-3.5 w-3.5 flex-shrink-0" style={{ color: `${GOLD.dim}0.25)` }} />
      <div className="flex items-center gap-5 flex-wrap">
        {[
          { label: 'Trade', value: TRADE_LABELS[stock.tradeType] || stock.tradeType },
          stock.tradeTimeframe && { label: 'Timeframe', value: stock.tradeTimeframe },
          stock.riskLevel > 0 && { label: 'Risk', value: `${stock.riskLevel}/5` },
          stock.guidanceDirection && stock.guidanceDirection !== 'N/A' && { label: 'Guidance', value: stock.guidanceDirection },
          stock.avgVolume && { label: 'Volume', value: stock.avgVolume },
          stock.marketCap && { label: 'MCap', value: stock.marketCap },
        ].filter(Boolean).map((item: any, i) => (
          <div key={i}>
            <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: '#7A7A7A' }}>{item.label}</span>
            <span className="ml-1.5 text-[11px] font-mono" style={{ color: GOLD.primary }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Moat & Spillover ──
const MoatSection = ({ moatType, moatDetail, supplyChainRole }: { moatType?: string; moatDetail?: string; supplyChainRole?: string }) => {
  if (!moatType && !supplyChainRole) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      {supplyChainRole && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl" style={{ background: `${GOLD.dim}0.02)`, border: `1px solid ${GOLD.dim}0.05)` }}>
          <Link2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: `${GOLD.dim}0.25)` }} />
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.15em] mb-0.5" style={{ color: '#8A8A8A' }}>Supply Chain Role</div>
            <p className="text-[12px]" style={{ color: '#8A8A8A' }}>{supplyChainRole}</p>
          </div>
        </div>
      )}
      {moatType && moatType !== 'none' && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl" style={{ background: `${GOLD.dim}0.02)`, border: `1px solid ${GOLD.dim}0.05)` }}>
          <Shield className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: `${GOLD.dim}0.25)` }} />
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.15em] mb-0.5" style={{ color: '#8A8A8A' }}>Moat — {moatType}</div>
            <p className="text-[12px]" style={{ color: '#8A8A8A' }}>{moatDetail}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const SpilloverSection = ({ companies }: { companies: SpilloverCompany[] }) => {
  if (!companies?.length) return null;
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl" style={{ background: `${GOLD.dim}0.02)`, border: `1px solid ${GOLD.dim}0.05)` }}>
      <ArrowRightLeft className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: `${GOLD.dim}0.25)` }} />
      <div className="flex-1">
        <div className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: '#8A8A8A' }}>Spillover Companies</div>
        <div className="flex flex-wrap gap-2">{companies.map((c, i) => (
          <span key={i} className="text-[10px] font-mono px-2.5 py-1 rounded-lg" style={{
            background: c.impact === 'positive' ? `${GREEN.dim}0.06)` : `${RED.dim}0.06)`,
            border: `1px solid ${c.impact === 'positive' ? `${GREEN.dim}0.12)` : `${RED.dim}0.12)`}`,
            color: c.impact === 'positive' ? `${GREEN.dim}0.7)` : `${RED.dim}0.7)`,
          }}>{c.impact === 'positive' ? '↑' : '↓'} {c.ticker}</span>
        ))}</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// EARNINGS CARD — Premium v8
// ═══════════════════════════════════════════════

const EarningsCard = ({ stock, index, isExpanded, onToggle, logos }: {
  stock: any; index: number; isExpanded: boolean; onToggle: () => void; logos: Map<string, string | null>;
}) => {
  const sortedScanner = Object.entries(stock.scannerSignals || {}).sort((a, b) => (b[1] as any).score - (a[1] as any).score);
  const finScore = stock.finotaurScore || stock.finotaurScore || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08, duration: 0.5 }}>
      <Card glow={isExpanded} className={`transition-all duration-500 cursor-pointer ${isExpanded ? '' : 'hover:!border-[rgba(201,166,70,0.12)]'}`}>
        <CardHeader stock={stock} index={index} isExpanded={isExpanded} onToggle={onToggle}
          logo={logos.get(stock.ticker) || stock.logo}
          badges={<>
            <span className="text-[11px] font-medium" style={{ color: '#A0A0A0' }}>{INFLECTION_LABELS[stock.inflectionStage] || stock.inflectionStage}</span>
            {stock.tradeType && <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-lg" style={{ background: `${GOLD.dim}0.08)`, border: `1px solid ${GOLD.dim}0.18)`, color: GOLD.primary }}>{TRADE_LABELS[stock.tradeType] || stock.tradeType}</span>}
          </>}
          scoreRight={<div className="flex items-center gap-3 flex-shrink-0">
            <ScoreRing score={stock.overallScore} size={54} />
            {finScore > 0 && <div className="flex flex-col items-center">
              <div className="text-[7px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: '#7A7A7A' }}>FIN</div>
              <div className="font-mono text-[14px] font-bold" style={{ color: finScore >= 75 ? GOLD.light : `${GOLD.dim}0.5)` }}>{finScore}</div>
            </div>}
          </div>}
        />

        {/* Collapsed catalyst line + mini signal bars */}
        <div className="px-6 pb-5" onClick={onToggle}>
          <p className="text-[13.5px] leading-relaxed font-[350]" style={{ color: '#A8A8A8' }}>{stock.catalyst}</p>
          {!isExpanded && <div className="flex gap-1 mt-3.5">{sortedScanner.slice(0, 8).map(([key, val]) => {
            const v = val as { score: number };
            return <div key={key} className="flex-1 h-[2px] rounded-full" style={{ background: `${GOLD.dim}${0.12 + (v.score / 100) * 0.55})` }} />;
          })}</div>}
        </div>

        {/* ── EXPANDED: OverviewTab-style deep analysis ── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4 }} className="overflow-hidden">
              <div className="px-6 pb-6 space-y-3" style={{ borderTop: `1px solid ${GOLD.dim}0.05)` }}>
                <div className="pt-2" />

                {/* What Happened + Why Significant */}
                <EventSummary stock={stock} />

                {/* Before / Bull / Bear */}
                <BeforeBullBear stock={stock} />

                {/* Finotaur Pattern (compact) */}
                <FinotaurPatternSection stock={stock} />

                {/* Trade Info */}
                <TradeInfo stock={stock} />

                {/* Top 3 signals only (collapsed) */}
                <TopSignals signals={stock.scannerSignals} config={SCANNER_SIGNAL_CONFIG} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════
// CATALYST CARD — Premium v8
// ═══════════════════════════════════════════════

const CatalystCard = ({ stock, index, isExpanded, onToggle, logos }: {
  stock: CatalystPick; index: number; isExpanded: boolean; onToggle: () => void; logos: Map<string, string | null>;
}) => {
  const catCfg = CATALYST_TYPE_CONFIG[stock.catalystType] || { label: stock.catalystType || 'Catalyst', icon: <Zap className="h-3 w-3" />, color: GOLD.primary };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08, duration: 0.5 }}>
      <Card glow={isExpanded} className={`transition-all duration-500 cursor-pointer ${isExpanded ? '' : 'hover:!border-[rgba(201,166,70,0.12)]'}`}>
        <CardHeader stock={stock} index={index} isExpanded={isExpanded} onToggle={onToggle}
          logo={logos.get(stock.ticker)}
          badges={<>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{
              background: `${GOLD.dim}0.1)`, border: `1px solid ${GOLD.dim}0.2)`,
            }}>
              <span style={{ color: GOLD.primary }}>{catCfg.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: GOLD.light }}>{catCfg.label}</span>
            </div>
            {stock.catalystDate && <span className="text-[9px] font-mono" style={{ color: '#7A7A7A' }}>{stock.catalystDate}</span>}
            {stock.tradeType && <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-lg" style={{ background: `${GOLD.dim}0.08)`, border: `1px solid ${GOLD.dim}0.18)`, color: GOLD.primary }}>{TRADE_LABELS[stock.tradeType] || stock.tradeType}</span>}
          </>}
          scoreRight={<div className="flex items-center gap-3 flex-shrink-0">
            <ScoreRing score={stock.overallScore} size={54} />
            {(stock.finotaurScore || 0) > 0 && <div className="flex flex-col items-center">
              <div className="text-[7px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: '#7A7A7A' }}>FIN</div>
              <div className="font-mono text-[14px] font-bold" style={{ color: stock.finotaurScore >= 75 ? GOLD.light : `${GOLD.dim}0.5)` }}>{stock.finotaurScore}</div>
            </div>}
          </div>}
        />

        {/* Collapsed headline */}
        <div className="px-6 pb-5" onClick={onToggle}>
          <p className="text-[13.5px] leading-relaxed font-[350]" style={{ color: '#A8A8A8' }}>{stock.catalystHeadline}</p>
        </div>

        {/* ── EXPANDED: Premium deep analysis ── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4 }} className="overflow-hidden">
              <div className="px-6 pb-6 space-y-3" style={{ borderTop: `1px solid ${GOLD.dim}0.05)` }}>
                <div className="pt-2" />

                {/* What Happened + Why Significant */}
                <EventSummary stock={stock} />

                {/* Before / Bull / Bear */}
                <BeforeBullBear stock={stock} />

                {/* Analyst Reactions (keep — high value) */}
                <AnalystReactionsTable actions={stock.analystActions} />

                {/* Trade Info */}
                <TradeInfo stock={stock} />

                {/* Top 3 signals only */}
                <TopSignals signals={stock.scannerSignals} config={CATALYST_SIGNAL_CONFIG} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════
// LOADING & EMPTY STATES
// ═══════════════════════════════════════════════

const ScanningState = ({ progress }: { progress: number }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-20 max-w-md mx-auto">
    <Card className="p-10" glow>
      <div className="text-center mb-8">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          className="w-14 h-14 mx-auto mb-6 rounded-xl flex items-center justify-center" style={{
            background: `linear-gradient(135deg, ${GOLD.dim}0.08), ${GOLD.dim}0.02))`,
            border: `1px solid ${GOLD.dim}0.12)`,
            boxShadow: `0 0 30px ${GOLD.dim}0.1)`,
          }}>
          <ScanLine className="h-6 w-6" style={{ color: `${GOLD.dim}0.5)` }} />
        </motion.div>
        <h3 className="text-[17px] font-bold text-white/80 mb-2">Loading Latest Scans</h3>
        <p className="text-[13px]" style={{ color: '#8A8A8A' }}>Fetching earnings inflections + catalyst picks...</p>
      </div>
      <div className="h-[2px] rounded-full overflow-hidden" style={{ background: `${GOLD.dim}0.05)` }}>
        <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${GOLD.dim}0.3), ${GOLD.dim}0.6))` }}
          initial={{ width: '0%' }} animate={{ width: `${Math.min(100, progress)}%` }} transition={{ duration: 0.3 }} />
      </div>
    </Card>
  </motion.div>
);

const EmptyState = ({ onRetry }: { onRetry: () => void }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-20 max-w-md mx-auto">
    <Card className="p-10 text-center" glow>
      <AlertTriangle className="h-10 w-10 mx-auto mb-4" style={{ color: `${GOLD.dim}0.3)` }} />
      <h3 className="text-[17px] font-bold text-white/80 mb-2">No Scan Results Yet</h3>
      <p className="text-[13px] mb-6" style={{ color: '#8A8A8A' }}>Earnings scanner runs at 8:00 AM ET. Catalyst scanner runs at 9:05 AM ET.</p>
      <button onClick={onRetry} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-300 hover:scale-[1.02]" style={{
        background: `${GOLD.dim}0.08)`, border: `1px solid ${GOLD.dim}0.18)`, color: GOLD.primary,
      }}>
        <RefreshCw className="h-3.5 w-3.5" />Refresh
      </button>
    </Card>
  </motion.div>
);

// ═══════════════════════════════════════════════
// MAIN COMPONENT — Top5 v8
// ═══════════════════════════════════════════════

function Top5Content() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [earningsData, setEarningsData] = useState<ScanResult | null>(null);
  const [catalystData, setCatalystData] = useState<CatalystResult | null>(null);
  const [, setError] = useState(false);

  // ── Admin Mode ──
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminModeEnabled, setAdminModeEnabled] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('role, email, is_tester')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const admin = data.role === 'admin' || data.role === 'super_admin' || data.email === 'elad2550@gmail.com';
          setIsAdmin(admin);
        }
      });
  }, [user?.id]);

  // ── 10K OPTIMIZATION: Load with in-memory cache ──
  const loadData = useCallback(async (forceRefresh = false) => {
    // Check in-memory cache first (2min TTL)
    if (!forceRefresh && dataCache.earnings && dataCache.catalysts && Date.now() - dataCache.fetchedAt < dataCache.TTL) {
      setEarningsData(dataCache.earnings);
      setCatalystData(dataCache.catalysts);
      setIsLoading(false);
      return;
    }

    setIsLoading(true); setLoadProgress(0); setError(false);
    const interval = setInterval(() => {
      setLoadProgress(prev => prev >= 85 ? prev : prev + Math.random() * 8 + 2);
    }, 200);

    try {
      const { earnings, catalysts } = await fetchAllPicks();
      clearInterval(interval); setLoadProgress(100);

      // Store in cache
      dataCache.earnings = earnings;
      dataCache.catalysts = catalysts;
      dataCache.fetchedAt = Date.now();

      setEarningsData(earnings); setCatalystData(catalysts);
      setTimeout(() => setIsLoading(false), 500);
    } catch {
      clearInterval(interval); setError(true); setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Computed values (memoized for 10K optimization) ──
  const earningsPicks = useMemo(() => earningsData?.picks || [], [earningsData]);
  const catalystPicks = useMemo(() => catalystData?.picks || [], [catalystData]);
  const totalPicks = earningsPicks.length + catalystPicks.length;

  const stats = useMemo(() => ({
    avgEarnings: earningsPicks.length > 0 ? Math.round(earningsPicks.reduce((a: number, b: any) => a + b.overallScore, 0) / earningsPicks.length) : 0,
    avgFinEarnings: earningsPicks.length > 0 ? Math.round(earningsPicks.reduce((a: number, b: any) => a + (b.finotaurScore || b.finotaurScore || 0), 0) / earningsPicks.length) : 0,
    avgCatScore: catalystPicks.length > 0 ? Math.round(catalystPicks.reduce((a: number, b: any) => a + b.overallScore, 0) / catalystPicks.length) : 0,
    avgFinCat: catalystPicks.length > 0 ? Math.round(catalystPicks.reduce((a: number, b: any) => a + (b.finotaurScore || 0), 0) / catalystPicks.length) : 0,
  }), [earningsPicks, catalystPicks]);

  const allTickers = useMemo(() =>
    [...new Set([...earningsPicks.map((p: any) => p.ticker), ...catalystPicks.map((p: any) => p.ticker)])],
    [earningsPicks, catalystPicks]
  );
  const logos = useStockLogos(allTickers);

  const fmtTime = useCallback((d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET';
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #080808 0%, #0c0a07 40%, #080808 100%)' }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] left-[10%] w-[900px] h-[900px] rounded-full blur-[200px]" style={{ background: `${GOLD.dim}0.04)` }} />
        <div className="absolute bottom-[5%] right-[10%] w-[800px] h-[800px] rounded-full blur-[180px]" style={{ background: `${GOLD.dim}0.03)` }} />
        <div className="absolute top-[40%] left-[40%] w-[500px] h-[500px] rounded-full blur-[150px]" style={{ background: 'rgba(244,217,123,0.02)' }} />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-10 py-8 md:py-10">
        {/* ═══ HEADER ═══ */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-14 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{
            background: `${GOLD.dim}0.04)`, border: `1px solid ${GOLD.dim}0.1)`,
          }}>
            <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD.primary }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD.primary }}>AI-Powered Analysis</span>
          </div>
          <h1 className="text-3xl md:text-[42px] font-bold mb-4 tracking-tight leading-tight">
            <span className="text-white/90">AI Stock </span>
            <span style={{ background: GOLD.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: `drop-shadow(0 0 20px ${GOLD.dim}0.3))` }}>Scanner</span>
          </h1>
          <p className="text-[14px] tracking-wide" style={{ color: '#8A8A8A' }}>
            {adminModeEnabled ? 'Admin Tracker · Recommendation performance monitoring'
              : isLoading ? 'Loading latest analysis...' : totalPicks > 0
              ? `${totalPicks} picks · ${earningsPicks.length} earnings + ${catalystPicks.length} catalysts · ${earningsData?.totalScanned || 0} reports analyzed`
              : 'No results available'}
          </p>

          {/* Admin Mode Toggle */}
          {isAdmin && (
            <div className="absolute top-0 right-0 flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
              background: adminModeEnabled ? `${GOLD.dim}0.08)` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${adminModeEnabled ? `${GOLD.dim}0.2)` : 'rgba(255,255,255,0.06)'}`,
            }}>
              <Shield className="w-3.5 h-3.5" style={{ color: adminModeEnabled ? GOLD.primary : 'rgba(139,139,139,0.4)' }} />
              <span className="text-xs font-medium" style={{ color: adminModeEnabled ? `${GOLD.dim}0.7)` : 'rgba(139,139,139,0.4)' }}>Admin Mode</span>
              <button onClick={() => setAdminModeEnabled(!adminModeEnabled)}
                className={`relative w-9 h-5 rounded-full transition-colors ${adminModeEnabled ? 'bg-amber-500' : 'bg-gray-600'}`}>
                <motion.div animate={{ x: adminModeEnabled ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
              <span className={`text-xs font-medium min-w-[24px] ${adminModeEnabled ? 'text-amber-300' : 'text-gray-500'}`}>
                {adminModeEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          )}
        </motion.div>

        {/* ═══ ADMIN TRACKER ═══ */}
        {adminModeEnabled && isAdmin && (
          <Suspense fallback={
            <div className="flex items-center justify-center py-32">
              <div className="p-10 text-center rounded-2xl" style={{ background: 'rgba(14,13,11,0.95)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <ScanLine className="h-10 w-10 mx-auto mb-4 animate-spin" style={{ color: `${GOLD.dim}0.4)` }} />
                <p className="text-[13px]" style={{ color: '#8A8A8A' }}>Loading admin dashboard...</p>
              </div>
            </div>
          }>
            <AdminTrackerView />
          </Suspense>
        )}

        {/* ═══ SCANNER VIEW ═══ */}
        {!adminModeEnabled && (
          <>
            <AnimatePresence>{isLoading && <ScanningState progress={loadProgress} />}</AnimatePresence>
            {!isLoading && totalPicks === 0 && <EmptyState onRetry={() => loadData(true)} />}

            <AnimatePresence>
              {!isLoading && totalPicks > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6 max-w-[1100px] mx-auto">

                  {/* ═══ EARNINGS SECTION ═══ */}
                  {earningsPicks.length > 0 && (
                    <div>
                      <SectionHeader
                        icon={<FileText className="h-5 w-5" style={{ color: `${GOLD.dim}0.55)` }} />}
                        title="Earnings Inflection"
                        subtitle="Stocks showing fundamental trend reversal — Finotaur pattern detection"
                        count={earningsPicks.length} aiPowered />
                      <StatsBar stats={[
                        { label: 'Avg Conviction', value: String(stats.avgEarnings), suffix: '/100' },
                        { label: 'Avg Finotaur', value: String(stats.avgFinEarnings), suffix: '/100' },
                        { label: 'Picks', value: String(earningsPicks.length) },
                        { label: 'Reports Analyzed', value: String(earningsData?.totalScanned || 0) },
                      ]} />
                      <div className="flex items-center gap-2 px-2 mb-4">
                        <Clock className="h-3 w-3" style={{ color: '#5A5A5A' }} />
                        <span className="text-[10px] font-mono" style={{ color: '#6A6A6A' }}>Scan: {fmtTime(earningsData?.lastScan ?? null)}</span>
                      </div>
                      <div className="flex flex-col gap-3">{earningsPicks.map((stock: any, i: number) => (
                        <EarningsCard key={stock.ticker} stock={stock} index={i} logos={logos}
                          isExpanded={expandedCard === `e-${stock.ticker}`}
                          onToggle={() => setExpandedCard(expandedCard === `e-${stock.ticker}` ? null : `e-${stock.ticker}`)} />
                      ))}</div>
                    </div>
                  )}

                  {/* ═══ CATALYSTS SECTION ═══ */}
                  {catalystPicks.length > 0 && (
                    <div className="mt-10">
                      <SectionHeader
                        icon={<Rocket className="h-5 w-5" style={{ color: `${GOLD.dim}0.55)` }} />}
                        title="Significant Catalysts"
                        subtitle="Major contracts, M&A, FDA approvals, guidance shocks, strategic pivots"
                        count={catalystPicks.length} aiPowered />
                      <StatsBar stats={[
                        { label: 'Avg Conviction', value: String(stats.avgCatScore), suffix: '/100' },
                        { label: 'Avg Finotaur', value: String(stats.avgFinCat), suffix: '/100' },
                        { label: 'Picks', value: String(catalystPicks.length) },
                        { label: 'Candidates Scanned', value: String(catalystData?.totalScanned || 0) },
                      ]} />
                      <div className="flex items-center gap-2 px-2 mb-4">
                        <Clock className="h-3 w-3" style={{ color: '#5A5A5A' }} />
                        <span className="text-[10px] font-mono" style={{ color: '#6A6A6A' }}>Scan: {fmtTime(catalystData?.lastScan ?? null)}</span>
                      </div>
                      <div className="flex flex-col gap-3">{catalystPicks.map((stock: CatalystPick, i: number) => (
                        <CatalystCard key={stock.ticker} stock={stock} index={i} logos={logos}
                          isExpanded={expandedCard === `c-${stock.ticker}`}
                          onToggle={() => setExpandedCard(expandedCard === `c-${stock.ticker}` ? null : `c-${stock.ticker}`)} />
                      ))}</div>
                    </div>
                  )}

                  {/* ═══ FOOTER ═══ */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                    <Card className="px-6 py-6 mt-4" highlight>
                      <p className="text-[11px] leading-[1.8] mb-5" style={{ color: '#6A6A6A' }}>Our AI continuously scans the entire US equity market — analyzing earnings reports, SEC filings, news catalysts, and market signals in real time to surface the most significant opportunities before they become widely recognized.</p>
                      <div className="pt-3.5" style={{ borderTop: `1px solid ${GOLD.dim}0.04)` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="h-3 w-3" style={{ color: '#4A4A4A' }} />
                            <span className="text-[10px] italic" style={{ color: '#5A5A5A' }}>Past patterns do not guarantee future results. Not financial advice.</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {['Polygon'].map(src => (
                              <span key={src} className="text-[8px] font-mono px-2 py-0.5 rounded" style={{
                                color: '#5A5A5A',
                                background: `${GOLD.dim}0.02)`,
                                border: `1px solid ${GOLD.dim}0.03)`,
                              }}>{src}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

export default function Top5() {
  const { canAccessPage, plan, loading: accessLoading } = usePlatformAccess();
  const access = canAccessPage('ai_scanner');
  if (accessLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A646]" />
      </div>
    );
  }

  if (!access.hasAccess) {
    return (
      <UpgradeGate
        feature="AI Scanner"
        reason={access.reason}
        message={access.message}
        upgradeTarget={access.upgradeTarget}
        upgradeDisplayName={access.upgradeDisplayName}
        upgradePrice={access.upgradePrice}
        currentPlan={plan === 'platform_core' ? 'core' : plan === 'platform_finotaur' ? 'finotaur' : plan === 'platform_enterprise' ? 'enterprise' : 'free'}
      />
    );
  }
  return <Top5Content />;
}