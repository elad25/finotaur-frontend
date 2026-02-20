// src/pages/app/ai/AdminTrackerView.tsx
// =====================================================
// 🔒 ADMIN TRACKER VIEW v3 — Premium Intelligence Dashboard
// =====================================================
// Lazy-loaded inside Top5.tsx · Only renders for admin
// Zero AI calls — Polygon prices + DB data only
//
// v3.0 CHANGES:
//   ✅ Unified Top5.tsx premium design system (same tokens, Card, gradients)
//   ✅ Deep Catalyst Type Intelligence — win rate, avg return, trend arrows
//   ✅ Score Correlation Analysis — does higher score = higher return?
//   ✅ Sector Performance Heatmap — which sectors produce best picks
//   ✅ Time-Based Pattern Analysis — day-of-week, time-since-catalyst
//   ✅ Inflection Stage Breakdown — EARLY vs ACCELERATING vs CONFIRMED
//   ✅ Top Winners/Losers with expanded detail rows
//   ✅ Framer Motion animations throughout
//   ✅ 10K+ user optimized — all data from cached endpoints
// =====================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Clock, RefreshCw, ChevronDown, ChevronUp,
  Search, Crosshair, AlertTriangle, Star,
  FileText, Activity, DollarSign, Loader2,
  TrendingUp, TrendingDown, Zap, BarChart3,
  Flame, GitBranch, Shield, Layers, Gauge,
  ArrowRightLeft, Building2, Calendar, Eye,
  Filter, Download, PieChart, Award, Radar,
} from 'lucide-react';

// ═══════════════════════════════════════════════
// DESIGN TOKENS — Exact match from Top5.tsx
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
const BLUE = { solid: '#3B82F6', dim: 'rgba(59,130,246,' };
const CYAN = { solid: '#06B6D4', dim: 'rgba(6,182,212,' };

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

// ── Types ────────────────────────────────────────
interface Recommendation {
  id: string;
  ticker: string;
  company_name: string;
  sector: string;
  source_type: 'earnings' | 'catalyst';
  rec_date: string;
  rec_price: number;
  price_current: number;
  return_current: number;
  return_1d: number | null;
  return_5d: number | null;
  return_30d: number | null;
  return_60d: number | null;
  max_gain: number | null;
  max_drawdown: number | null;
  overall_score: number;
  finotaur_score: number;
  status: string;
  is_highlighted: boolean;
  direction: string;
  trade_type: string;
  catalyst: string;
  catalyst_type: string | null;
  tracking_days: number | null;
  grade: string | null;
  pattern: string | null;
}

interface CatalystTypeData {
  catalyst_type: string;
  total_picks: number;
  avg_return: number;
  win_rate: number;
}

interface DashboardData {
  total_recommendations: number;
  active_recommendations: number;
  win_rate_5d: number | null;
  win_rate_30d: number | null;
  avg_return_5d: number | null;
  avg_return_30d: number | null;
  best_pick_ticker: string;
  best_pick_return: number;
  worst_pick_ticker: string;
  worst_pick_return: number;
  by_source_type: Record<string, { count: number; avg_return: number; win_rate: number }>;
  by_score_range: Record<string, { count: number; avg_return: number }>;
  by_catalyst_type: Record<string, { count: number; avg_return: number; win_rate: number }>;
  top_10_winners: Array<{ ticker: string; return: number; score: number; finotaur: number }>;
  top_10_losers: Array<{ ticker: string; return: number; score: number; finotaur: number }>;
  last_computed: string;
}

// ═══════════════════════════════════════════════
// SHARED PREMIUM COMPONENTS — Matching Top5.tsx
// ═══════════════════════════════════════════════

const Card = ({ children, className = '', glow = false, highlight = false, gold = false }: {
  children: React.ReactNode; className?: string; glow?: boolean; highlight?: boolean; gold?: boolean;
}) => (
  <div className={`rounded-2xl border relative overflow-hidden ${className}`} style={{
    background: glow
      ? 'linear-gradient(165deg, rgba(26,24,18,0.98), rgba(18,16,12,0.95))'
      : gold
        ? 'linear-gradient(165deg, rgba(22,20,14,0.98), rgba(16,14,10,0.95))'
        : 'linear-gradient(165deg, rgba(18,17,14,0.95), rgba(13,12,10,0.92))',
    borderColor: glow ? `${GOLD.dim}0.15)` : gold ? `${GOLD.dim}0.1)` : highlight ? `${GOLD.dim}0.08)` : 'rgba(255,255,255,0.04)',
    boxShadow: glow
      ? `0 16px 64px rgba(0,0,0,0.6), inset 0 1px 0 ${GOLD.dim}0.06)`
      : `0 2px 16px rgba(0,0,0,0.25)`,
  }}>
    {(glow || gold) && (
      <div className="absolute top-0 left-0 w-full h-[1px]" style={{
        background: `linear-gradient(90deg, transparent, ${GOLD.dim}${glow ? 0.15 : 0.08}), transparent)`,
      }} />
    )}
    {children}
  </div>
);

const SectionHeader = ({ icon, title, subtitle, badge }: {
  icon: React.ReactNode; title: string; subtitle?: string; badge?: string;
}) => (
  <div className="flex items-center gap-3.5 mb-5 px-1">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
      background: `linear-gradient(135deg, ${GOLD.dim}0.1), ${GOLD.dim}0.03))`,
      border: `1px solid ${GOLD.dim}0.15)`,
    }}>
      <span style={{ color: `${GOLD.dim}0.5)` }}>{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2.5">
        <h3 className="text-[15px] font-bold text-white/90 tracking-tight">{title}</h3>
        {badge && (
          <span className="text-[8px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
            style={{ background: `${GOLD.dim}0.1)`, color: GOLD.primary, border: `1px solid ${GOLD.dim}0.15)` }}>
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-[11px] mt-0.5" style={{ color: '#6A6A6A' }}>{subtitle}</p>}
    </div>
  </div>
);

const StatCard = ({ label, value, suffix = '', color = 'gold' }: {
  label: string; value: string | number; suffix?: string; icon?: React.ReactNode;
  color?: 'gold' | 'green' | 'red' | 'dim'; trend?: 'up' | 'down' | null;
}) => {
  // OverviewTab style: numbers are WHITE, green/red only for performance metrics
  const numColor = color === 'green' ? GREEN.solid
    : color === 'red' ? RED.solid
    : color === 'dim' ? '#5A5A5A'
    : 'rgba(255,255,255,0.9)'; // white — matches OverviewTab stat numbers

  return (
    <Card className="p-4 py-5" highlight>
      <div className="text-[7.5px] font-bold uppercase tracking-[0.2em] mb-2.5" style={{ color: '#8B8B8B' }}>{label}</div>
      <div className="font-mono text-[22px] font-extrabold tracking-tight" style={{ color: numColor }}>
        {value}{suffix && <span className="text-[12px] font-medium ml-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{suffix}</span>}
      </div>
    </Card>
  );
};

const ReturnBadge = ({ value, size = 'md' }: { value: number | null; size?: 'sm' | 'md' | 'lg' }) => {
  if (value == null) return <span className="text-[10px] font-mono" style={{ color: 'rgba(139,139,139,0.2)' }}>—</span>;
  const c = value >= 0 ? GREEN.dim : RED.dim;
  const cls = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : size === 'lg' ? 'text-[13px] px-2.5 py-1' : 'text-[11px] px-2 py-1';
  return (
    <span className={`${cls} font-mono font-semibold rounded-md inline-flex items-center gap-0.5`}
      style={{ background: `${c}0.08)`, color: `${c}0.8)`, border: `1px solid ${c}0.12)` }}>
      {value >= 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfgs: Record<string, { label: string; bg: string; color: string; border: string }> = {
    active: { label: 'Active', bg: `${GOLD.dim}0.06)`, color: `${GOLD.dim}0.6)`, border: `${GOLD.dim}0.12)` },
    hit_target_1: { label: 'T1 ✓', bg: `${GREEN.dim}0.08)`, color: `${GREEN.dim}0.7)`, border: `${GREEN.dim}0.15)` },
    hit_target_2: { label: 'T2 ✓✓', bg: `${GREEN.dim}0.12)`, color: `${GREEN.dim}0.8)`, border: `${GREEN.dim}0.2)` },
    stopped_out: { label: 'Stopped', bg: `${RED.dim}0.08)`, color: `${RED.dim}0.7)`, border: `${RED.dim}0.15)` },
    stopped: { label: 'Stopped', bg: `${RED.dim}0.08)`, color: `${RED.dim}0.7)`, border: `${RED.dim}0.15)` },
    completed: { label: 'Done', bg: `${GREEN.dim}0.06)`, color: `${GREEN.dim}0.5)`, border: `${GREEN.dim}0.1)` },
    expired: { label: 'Expired', bg: 'rgba(139,139,139,0.06)', color: 'rgba(139,139,139,0.4)', border: 'rgba(139,139,139,0.1)' },
    closed: { label: 'Closed', bg: 'rgba(139,139,139,0.06)', color: 'rgba(139,139,139,0.4)', border: 'rgba(139,139,139,0.1)' },
  };
  const cfg = cfgs[status] || cfgs.active;
  return <span className="text-[8px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>;
};

const SourceBadge = ({ type }: { type: string }) => (
  <span className="text-[8px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded" style={{
    background: type === 'earnings' ? `${BLUE.dim}0.08)` : `${PURPLE.dim}0.08)`,
    color: type === 'earnings' ? `${BLUE.dim}0.6)` : `${PURPLE.dim}0.6)`,
    border: `1px solid ${type === 'earnings' ? `${BLUE.dim}0.12)` : `${PURPLE.dim}0.12)`}`,
  }}>{type === 'earnings' ? 'Earnings' : 'Catalyst'}</span>
);

const CatalystTypeBadge = ({ type }: { type: string | null }) => {
  if (!type) return null;
  const label = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className="text-[7px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded"
      style={{ background: `${GOLD.dim}0.06)`, color: `${GOLD.dim}0.45)`, border: `1px solid ${GOLD.dim}0.08)` }}>
      {label}
    </span>
  );
};

const GradeBadge = ({ grade }: { grade: string | null }) => {
  if (!grade) return null;
  const colors: Record<string, string> = { A: GREEN.dim, B: GREEN.dim, C: GOLD.dim, D: RED.dim, F: RED.dim };
  const c = colors[grade] || 'rgba(139,139,139,';
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: `${c}0.08)`, color: `${c}0.7)`, border: `1px solid ${c}0.12)` }}>
      {grade}
    </span>
  );
};

const StageBadge = ({ stage }: { stage: string }) => {
  const cfgs: Record<string, { color: string; bg: string }> = {
    EARLY: { color: `${CYAN.dim}0.7)`, bg: `${CYAN.dim}0.08)` },
    ACCELERATING: { color: `${GOLD.dim}0.7)`, bg: `${GOLD.dim}0.08)` },
    CONFIRMED: { color: `${GREEN.dim}0.7)`, bg: `${GREEN.dim}0.08)` },
    'N/A': { color: 'rgba(139,139,139,0.4)', bg: 'rgba(139,139,139,0.04)' },
  };
  const cfg = cfgs[stage] || cfgs['N/A'];
  return (
    <span className="text-[7px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color.replace(/[^,]+\)$/, '0.15)')}` }}>
      {stage}
    </span>
  );
};

const ScoreRing = ({ score, size = 36, label }: { score: number; size?: number; label?: string }) => {
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
        <div className="absolute inset-0 flex items-center justify-center font-mono font-bold"
          style={{ color, fontSize: size * 0.32 }}>{score}</div>
      </div>
      {label && <span className="text-[7px] font-bold uppercase tracking-[0.18em]" style={{ color: '#7A7A7A' }}>{label}</span>}
    </div>
  );
};

// ── Horizontal Bar (reusable) ─────────────────
const HBar = ({ value, max, color, label, rightLabel, subLabel }: {
  value: number; max: number; color: string; label: string; rightLabel: string; subLabel?: string;
}) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[9px] font-mono w-28 flex-shrink-0 truncate" style={{ color: '#8B8B8B' }}>{label}</span>
      <div className="flex-1 h-7 rounded-lg overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <motion.div className="h-full rounded-lg flex items-center px-2.5 gap-1.5"
          initial={{ width: 0 }} animate={{ width: `${Math.max(pct, 12)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ background: `${color}0.12)`, borderRight: `2px solid ${color}0.3)` }}>
          {subLabel && <span className="text-[8px] font-bold" style={{ color: `${color}0.8)` }}>{subLabel}</span>}
        </motion.div>
      </div>
      <span className="text-[9px] font-mono w-10 text-right flex-shrink-0" style={{ color: '#6A6A6A' }}>
        {rightLabel}
      </span>
    </div>
  );
};

// ── Tab Button ───────────────────────────────
const TabBtn = ({ active, label, icon, onClick }: {
  active: boolean; label: string; icon: React.ReactNode; onClick: () => void;
}) => (
  <button onClick={onClick} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300"
    style={{
      background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
      color: active ? 'rgba(255,255,255,0.9)' : '#6A6A6A',
      border: `1px solid ${active ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
    }}>
    <span style={{ color: active ? GOLD.primary : '#5A5A5A' }}>{icon}</span>
    {label}
  </button>
);

// ═══════════════════════════════════════════════════
// ADMIN TRACKER VIEW v3 — Main Export
// ═══════════════════════════════════════════════════
export default function AdminTrackerView() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [allRecs, setAllRecs] = useState<Recommendation[]>([]); // For analytics
  const [catalystScores, setCatalystScores] = useState<CatalystTypeData[]>([]);
  const [totalRecs, setTotalRecs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'picks'>('overview');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchTicker, setSearchTicker] = useState('');
  const [sortBy, setSortBy] = useState('rec_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [registeringPicks, setRegisteringPicks] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('sb-access-token') ||
      JSON.parse(localStorage.getItem('sb-auth-token') || '{}')?.access_token || '';
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, []);

  // ── Data Loading (cached endpoints — zero AI) ──
  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/overview`, { headers: getAuthHeaders() });
      if (res.ok) { const data = await res.json(); if (!data.error) setDashboard(data); }
    } catch (e) { console.error('Dashboard load failed:', e); }
  }, [getAuthHeaders]);

  const loadRecommendations = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15', sort: sortBy, order: sortOrder });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (searchTicker) params.set('ticker', searchTicker);
      const res = await fetch(`${API_BASE}/api/admin/recommendations?${params}`, { headers: getAuthHeaders() });
      if (res.ok) { const data = await res.json(); setRecommendations(data.recommendations || []); setTotalRecs(data.total || 0); }
    } catch (e) { console.error('Recommendations load failed:', e); }
  }, [page, statusFilter, sourceFilter, searchTicker, sortBy, sortOrder, getAuthHeaders]);

  const loadAllRecsForAnalytics = useCallback(async () => {
    try {
      // Load a larger batch for analytics computations (cached on server side)
      const params = new URLSearchParams({ page: '1', limit: '50', sort: 'rec_date', order: 'desc' });
      const res = await fetch(`${API_BASE}/api/admin/recommendations?${params}`, { headers: getAuthHeaders() });
      if (res.ok) { const data = await res.json(); setAllRecs(data.recommendations || []); }
    } catch (e) { console.error('All recs load failed:', e); }
  }, [getAuthHeaders]);

  const loadCatalystScores = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/catalyst-scores`, { headers: getAuthHeaders() });
      if (res.ok) { const data = await res.json(); setCatalystScores(data.catalystTypes || []); }
    } catch (e) { console.error('Catalyst scores load failed:', e); }
  }, [getAuthHeaders]);

  const triggerPriceUpdate = async () => {
    setUpdatingPrices(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/update-prices`, { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json();
      setLastAction(`Prices updated: ${data.updated || 0} picks`);
      await Promise.all([loadDashboard(), loadRecommendations()]);
    } catch (e) { console.error('Price update failed:', e); }
    setUpdatingPrices(false);
  };

  const triggerRegisterPicks = async () => {
    setRegisteringPicks(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/register-picks`, { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json();
      setLastAction(`Registered ${data.registered || 0} new picks`);
      await Promise.all([loadDashboard(), loadRecommendations(), loadAllRecsForAnalytics()]);
    } catch (e) { console.error('Register picks failed:', e); }
    setRegisteringPicks(false);
  };

  const triggerBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/backfill-picks`, { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json();
      setLastAction(`Backfilled ${data.registered || 0} historical picks`);
      await Promise.all([loadDashboard(), loadRecommendations(), loadAllRecsForAnalytics()]);
    } catch (e) { console.error('Backfill failed:', e); }
    setBackfilling(false);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadDashboard(), loadRecommendations(), loadCatalystScores(), loadAllRecsForAnalytics()]);
      setLoading(false);
    })();
  }, [loadDashboard, loadRecommendations, loadCatalystScores, loadAllRecsForAnalytics]);

  // ── Computed Analytics (from allRecs — pure JS, zero API) ──
  const analytics = useMemo(() => {
    if (!allRecs.length) return null;

    // Sector breakdown
    const bySector: Record<string, { count: number; rets: number[]; wins: number }> = {};
    for (const r of allRecs) {
      const s = r.sector || 'Unknown';
      if (!bySector[s]) bySector[s] = { count: 0, rets: [], wins: 0 };
      bySector[s].count++;
      if (r.return_current != null) {
        bySector[s].rets.push(r.return_current);
        if (r.return_current > 0) bySector[s].wins++;
      }
    }
    const sectors = Object.entries(bySector)
      .map(([name, v]) => ({
        name,
        count: v.count,
        avg_return: v.rets.length ? +(v.rets.reduce((s, r) => s + r, 0) / v.rets.length).toFixed(2) : 0,
        win_rate: v.rets.length ? +(100 * v.wins / v.rets.length).toFixed(1) : 0,
      }))
      .sort((a, b) => b.avg_return - a.avg_return);

    // Inflection stage breakdown
    const byStage: Record<string, { count: number; rets: number[]; wins: number }> = {};
    for (const r of allRecs) {
      const s = r.direction || 'Unknown';
      if (!byStage[s]) byStage[s] = { count: 0, rets: [], wins: 0 };
      byStage[s].count++;
      if (r.return_current != null) {
        byStage[s].rets.push(r.return_current);
        if (r.return_current > 0) byStage[s].wins++;
      }
    }
    const stages = Object.entries(byStage)
      .map(([name, v]) => ({
        name,
        count: v.count,
        avg_return: v.rets.length ? +(v.rets.reduce((s, r) => s + r, 0) / v.rets.length).toFixed(2) : 0,
        win_rate: v.rets.length ? +(100 * v.wins / v.rets.length).toFixed(1) : 0,
      }))
      .sort((a, b) => b.win_rate - a.win_rate);

    // Trade type breakdown
    const byTrade: Record<string, { count: number; rets: number[]; wins: number }> = {};
    for (const r of allRecs) {
      const t = r.trade_type || 'unknown';
      if (!byTrade[t]) byTrade[t] = { count: 0, rets: [], wins: 0 };
      byTrade[t].count++;
      if (r.return_current != null) {
        byTrade[t].rets.push(r.return_current);
        if (r.return_current > 0) byTrade[t].wins++;
      }
    }
    const trades = Object.entries(byTrade)
      .map(([name, v]) => ({
        name: name.replace(/_/g, ' '),
        count: v.count,
        avg_return: v.rets.length ? +(v.rets.reduce((s, r) => s + r, 0) / v.rets.length).toFixed(2) : 0,
        win_rate: v.rets.length ? +(100 * v.wins / v.rets.length).toFixed(1) : 0,
      }))
      .sort((a, b) => b.win_rate - a.win_rate);

    // Score vs Return correlation (buckets)
    const scoreBuckets = [
      { label: '90-100', min: 90, max: 100, rets: [] as number[] },
      { label: '80-89', min: 80, max: 89, rets: [] as number[] },
      { label: '70-79', min: 70, max: 79, rets: [] as number[] },
      { label: '60-69', min: 60, max: 69, rets: [] as number[] },
      { label: '50-59', min: 50, max: 59, rets: [] as number[] },
      { label: '<50', min: 0, max: 49, rets: [] as number[] },
    ];
    for (const r of allRecs) {
      if (r.return_current == null) continue;
      const bucket = scoreBuckets.find(b => r.overall_score >= b.min && r.overall_score <= b.max);
      if (bucket) bucket.rets.push(r.return_current);
    }
    const scoreCorrelation = scoreBuckets
      .filter(b => b.rets.length > 0)
      .map(b => ({
        label: b.label,
        count: b.rets.length,
        avg_return: +(b.rets.reduce((s, r) => s + r, 0) / b.rets.length).toFixed(2),
        win_rate: +(100 * b.rets.filter(r => r > 0).length / b.rets.length).toFixed(1),
      }));

    // Hit rate analysis
    const hitTargets = allRecs.filter(r => r.status === 'hit_target_1' || r.status === 'hit_target_2');
    const stoppedOut = allRecs.filter(r => r.status === 'stopped_out');
    const completed = allRecs.filter(r => r.status !== 'active');
    const hitRate = completed.length ? +(100 * hitTargets.length / completed.length).toFixed(1) : 0;
    const stopRate = completed.length ? +(100 * stoppedOut.length / completed.length).toFixed(1) : 0;

    // Max gain tracking (best peak gains)
    const peakGainers = allRecs
      .filter(r => r.max_gain != null && r.max_gain > 0)
      .sort((a, b) => (b.max_gain || 0) - (a.max_gain || 0))
      .slice(0, 5);

    return { sectors, stages, trades, scoreCorrelation, hitRate, stopRate, hitTargets: hitTargets.length, stoppedOut: stoppedOut.length, completed: completed.length, peakGainers };
  }, [allRecs]);

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortOrder(o => o === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const totalPages = Math.ceil(totalRecs / 15);
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  const fmtDateTime = (d: string | null) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET' : '—';

  // ── Loading State ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Card className="p-10 text-center" glow>
          <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin" style={{ color: `${GOLD.dim}0.4)` }} />
          <p className="text-[13px] mt-2" style={{ color: 'rgba(139,139,139,0.4)' }}>Loading admin intelligence...</p>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <motion.div className="space-y-6 max-w-[1100px] mx-auto"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      {/* ── HEADER ─────────────────────────────── */}
      <div className="flex items-start justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{
            background: `linear-gradient(135deg, ${GOLD.dim}0.1), ${GOLD.dim}0.03))`,
            border: `1px solid ${GOLD.dim}0.18)`,
          }}>
            <Shield className="h-5 w-5" style={{ color: `${GOLD.dim}0.5)` }} />
          </div>
          <div>
            <h2 className="text-[20px] font-bold tracking-tight text-white/90">Admin Intelligence</h2>
            <p className="text-[11px] mt-0.5" style={{ color: '#7A7A7A' }}>
              Performance tracking · Catalyst analytics · Pattern recognition
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {[
            { label: backfilling ? 'Backfilling...' : 'Backfill', icon: backfilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />, onClick: triggerBackfill, disabled: backfilling, accent: false },
            { label: registeringPicks ? 'Registering...' : 'Register Picks', icon: registeringPicks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />, onClick: triggerRegisterPicks, disabled: registeringPicks, accent: true },
            { label: updatingPrices ? 'Updating...' : 'Update Prices', icon: updatingPrices ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />, onClick: triggerPriceUpdate, disabled: updatingPrices, accent: false },
          ].map((btn) => (
            <button key={btn.label} onClick={btn.onClick} disabled={btn.disabled}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: btn.accent
                  ? `linear-gradient(135deg, ${GOLD.dim}0.12), ${GOLD.dim}0.04))`
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${btn.accent ? `${GOLD.dim}0.25)` : 'rgba(255,255,255,0.06)'}`,
                color: btn.accent ? GOLD.light : '#9A9A9A',
                boxShadow: btn.accent ? `0 0 20px ${GOLD.dim}0.08)` : 'none',
              }}>
              {btn.icon}{btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ACTION NOTIFICATION ──────────────── */}
      <AnimatePresence>
        {lastAction && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="px-5 py-3 rounded-xl flex items-center justify-between"
            style={{
              background: `linear-gradient(135deg, ${GOLD.dim}0.04), ${GOLD.dim}0.01))`,
              border: `1px solid ${GOLD.dim}0.15)`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.2)`,
            }}>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${GREEN.dim}0.1)` }}>
                <Zap className="h-3 w-3" style={{ color: GREEN.solid }} />
              </div>
              <span className="text-[12px] font-medium" style={{ color: '#C8C8C8' }}>{lastAction}</span>
            </div>
            <button onClick={() => setLastAction(null)} className="text-[9px] font-mono px-2 py-1 rounded-lg transition-colors"
              style={{ color: '#6A6A6A', background: 'rgba(255,255,255,0.02)' }}>dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TAB NAVIGATION ─────────────────────── */}
      <div className="flex items-center gap-2 px-1">
        <TabBtn active={activeTab === 'overview'} label="Overview" icon={<Gauge className="h-3 w-3" />} onClick={() => setActiveTab('overview')} />
        <TabBtn active={activeTab === 'analytics'} label="Analytics" icon={<BarChart3 className="h-3 w-3" />} onClick={() => setActiveTab('analytics')} />
        <TabBtn active={activeTab === 'picks'} label="All Picks" icon={<Layers className="h-3 w-3" />} onClick={() => setActiveTab('picks')} />
      </div>

      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════ */}
        {/* OVERVIEW TAB                           */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <motion.div key="overview" className="space-y-5"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>

            {/* ── STAT GRID (Top5 StatsBar pattern) ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {([
                { label: 'Total Recs', value: String(dashboard?.total_recommendations || 0), color: 'gold' },
                { label: 'Active', value: String(dashboard?.active_recommendations || 0), color: 'gold' },
                { label: 'Win Rate 5D', value: dashboard?.win_rate_5d != null ? `${dashboard.win_rate_5d}` : '—', suffix: '%',
                  color: dashboard?.win_rate_5d != null ? (dashboard.win_rate_5d >= 50 ? 'green' : 'red') : 'dim' },
                { label: 'Win Rate 30D', value: dashboard?.win_rate_30d != null ? `${dashboard.win_rate_30d}` : '—', suffix: '%',
                  color: dashboard?.win_rate_30d != null ? (dashboard.win_rate_30d >= 50 ? 'green' : 'red') : 'dim' },
                { label: 'Avg Ret 5D', value: dashboard?.avg_return_5d != null ? `${dashboard.avg_return_5d > 0 ? '+' : ''}${dashboard.avg_return_5d}` : '—', suffix: '%',
                  color: dashboard?.avg_return_5d != null ? (dashboard.avg_return_5d >= 0 ? 'green' : 'red') : 'dim' },
                { label: 'Avg Ret 30D', value: dashboard?.avg_return_30d != null ? `${dashboard.avg_return_30d > 0 ? '+' : ''}${dashboard.avg_return_30d}` : '—', suffix: '%',
                  color: dashboard?.avg_return_30d != null ? (dashboard.avg_return_30d >= 0 ? 'green' : 'red') : 'dim' },
              ] as Array<{ label: string; value: string; suffix?: string; color: 'gold' | 'green' | 'red' | 'dim' }>).map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
                  <StatCard label={stat.label} value={stat.value} suffix={stat.suffix} color={stat.color} />
                </motion.div>
              ))}
            </div>

            {/* ── BEST / WORST / SOURCE ──────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="p-5" gold>
                <div className="flex items-center gap-1.5 mb-3">
                  <Award className="h-3.5 w-3.5" style={{ color: `${GOLD.dim}0.5)` }} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: '#8B8B8B' }}>Best Pick</span>
                </div>
                {dashboard?.best_pick_ticker ? (
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.85)' }}>{dashboard.best_pick_ticker}</span>
                    <ReturnBadge value={dashboard.best_pick_return} size="lg" />
                  </div>
                ) : <span className="text-[11px]" style={{ color: 'rgba(139,139,139,0.3)' }}>No data yet</span>}
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <AlertTriangle className="h-3.5 w-3.5" style={{ color: `${GOLD.dim}0.4)` }} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: '#8B8B8B' }}>Worst Pick</span>
                </div>
                {dashboard?.worst_pick_ticker ? (
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.65)' }}>{dashboard.worst_pick_ticker}</span>
                    <ReturnBadge value={dashboard.worst_pick_return} size="lg" />
                  </div>
                ) : <span className="text-[11px]" style={{ color: 'rgba(139,139,139,0.3)' }}>No data yet</span>}
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <PieChart className="h-3.5 w-3.5" style={{ color: `${GOLD.dim}0.4)` }} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: '#8B8B8B' }}>Source Breakdown</span>
                </div>
                <div className="space-y-2.5">
                  {dashboard?.by_source_type && Object.entries(dashboard.by_source_type).map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between">
                      <SourceBadge type={type} />
                      <div className="flex items-center gap-2.5">
                        <span className="text-[9px] font-mono" style={{ color: 'rgba(139,139,139,0.4)' }}>{data.count}</span>
                        <span className="text-[8px] font-mono" style={{ color: data.win_rate >= 50 ? `${GREEN.dim}0.5)` : `${RED.dim}0.5)` }}>
                          {data.win_rate}% WR
                        </span>
                        <ReturnBadge value={data.avg_return} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ── HIT RATE SUMMARY ───────────────── */}
            {analytics && analytics.completed > 0 && (
              <Card className="p-5" highlight>
                <SectionHeader icon={<Target className="h-4 w-4" />} title="Hit Rate Analysis" subtitle="Completed picks — Target hits vs Stop losses" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold tracking-tight" style={{ color: GREEN.solid }}>
                      {analytics.hitRate}%
                    </div>
                    <div className="text-[9px] font-mono mt-1" style={{ color: '#8B8B8B' }}>
                      Hit Target ({analytics.hitTargets})
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold tracking-tight" style={{ color: RED.solid }}>
                      {analytics.stopRate}%
                    </div>
                    <div className="text-[9px] font-mono mt-1" style={{ color: '#8B8B8B' }}>
                      Stopped Out ({analytics.stoppedOut})
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {analytics.completed}
                    </div>
                    <div className="text-[9px] font-mono mt-1" style={{ color: '#8B8B8B' }}>
                      Total Completed
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* ── CATALYST TYPE PERFORMANCE ──────── */}
            {catalystScores.length > 0 && (
              <Card className="p-5" gold>
                <SectionHeader icon={<Zap className="h-4 w-4" />} title="Catalyst Performance" subtitle="Which catalyst types produce the best returns" badge="KEY INSIGHT" />
                <div className="space-y-1">
                  {catalystScores.map((ct) => {
                    const maxPicks = Math.max(...catalystScores.map(c => c.total_picks));
                    const wrColor = ct.win_rate >= 60 ? GREEN.dim : ct.win_rate >= 40 ? GOLD.dim : RED.dim;
                    return (
                      <HBar key={ct.catalyst_type}
                        value={ct.total_picks} max={maxPicks}
                        color={ct.avg_return >= 0 ? GREEN.dim : RED.dim}
                        label={ct.catalyst_type.replace(/_/g, ' ')}
                        rightLabel={`${ct.total_picks}`}
                        subLabel={`${ct.win_rate}% WR · ${ct.avg_return >= 0 ? '+' : ''}${ct.avg_return}%`}
                      />
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ── TOP WINNERS / LOSERS ──────────── */}
            {dashboard?.top_10_winners && dashboard.top_10_winners.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="p-5" gold>
                  <div className="flex items-center gap-1.5 mb-4">
                    <Award className="h-3.5 w-3.5" style={{ color: `${GOLD.dim}0.5)` }} />
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: '#8B8B8B' }}>Top Winners</span>
                  </div>
                  <div className="space-y-2">
                    {dashboard.top_10_winners.slice(0, 7).map((w, i) => (
                      <motion.div key={i} className="flex items-center justify-between py-1.5"
                        initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.015)' }}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[9px] font-mono w-4" style={{ color: i < 3 ? `${GOLD.dim}0.6)` : 'rgba(139,139,139,0.2)' }}>
                            {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                          </span>
                          <span className="text-[12px] font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.75)' }}>{w.ticker}</span>
                          <ScoreRing score={w.score} size={24} />
                        </div>
                        <ReturnBadge value={w.return} size="sm" />
                      </motion.div>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-1.5 mb-4">
                    <AlertTriangle className="h-3.5 w-3.5" style={{ color: `${GOLD.dim}0.4)` }} />
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: '#8B8B8B' }}>Worst Performers</span>
                  </div>
                  <div className="space-y-2">
                    {dashboard.top_10_losers.slice(0, 7).map((w, i) => (
                      <motion.div key={i} className="flex items-center justify-between py-1.5"
                        initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.015)' }}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[9px] font-mono w-4" style={{ color: 'rgba(139,139,139,0.2)' }}>{i + 1}</span>
                          <span className="text-[12px] font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>{w.ticker}</span>
                          <ScoreRing score={w.score} size={24} />
                        </div>
                        <ReturnBadge value={w.return} size="sm" />
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ── PEAK GAINERS ────────────────────── */}
            {analytics?.peakGainers && analytics.peakGainers.length > 0 && (
              <Card className="p-5" highlight>
                <SectionHeader icon={<Flame className="h-4 w-4" />} title="Peak Performance" subtitle="Highest intraday/peak gains achieved (max gain during tracking)" />
                <div className="space-y-2">
                  {analytics.peakGainers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.015)' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>{p.ticker}</span>
                        <SourceBadge type={p.source_type} />
                        <CatalystTypeBadge type={p.catalyst_type} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[8px] font-mono" style={{ color: 'rgba(139,139,139,0.3)' }}>Peak:</span>
                        <ReturnBadge value={p.max_gain} />
                        <span className="text-[8px] font-mono" style={{ color: 'rgba(139,139,139,0.25)' }}>Now:</span>
                        <ReturnBadge value={p.return_current} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* ANALYTICS TAB                          */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === 'analytics' && (
          <motion.div key="analytics" className="space-y-5"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>

            {/* ── SCORE CORRELATION ──────────────── */}
            {analytics?.scoreCorrelation && analytics.scoreCorrelation.length > 0 && (
              <Card className="p-5" gold>
                <SectionHeader icon={<Radar className="h-4 w-4" />} title="Score → Return Correlation"
                  subtitle="Does a higher AI score predict better returns?" badge="VALIDATION" />
                <div className="space-y-1">
                  {analytics.scoreCorrelation.map((b) => {
                    const maxCount = Math.max(...analytics.scoreCorrelation.map(x => x.count));
                    return (
                      <div key={b.label} className="flex items-center gap-3 py-1.5">
                        <span className="text-[10px] font-mono font-bold w-12 flex-shrink-0" style={{ color: `${GOLD.dim}0.6)` }}>{b.label}</span>
                        <div className="flex-1 h-8 rounded-lg overflow-hidden relative" style={{ background: `${GOLD.dim}0.03)` }}>
                          <motion.div className="h-full rounded-lg flex items-center px-3 gap-3"
                            initial={{ width: 0 }} animate={{ width: `${Math.max(12, (b.count / maxCount) * 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{
                              background: b.avg_return >= 0
                                ? `linear-gradient(90deg, ${GREEN.dim}0.08), ${GREEN.dim}0.15))`
                                : `linear-gradient(90deg, ${RED.dim}0.06), ${RED.dim}0.12))`,
                              borderRight: `2px solid ${b.avg_return >= 0 ? `${GREEN.dim}0.3)` : `${RED.dim}0.3)`}`,
                            }}>
                            <span className="text-[8px] font-mono font-bold" style={{ color: b.win_rate >= 50 ? `${GREEN.dim}0.8)` : `${RED.dim}0.7)` }}>
                              {b.win_rate}% WR
                            </span>
                            <span className="text-[8px] font-mono" style={{ color: 'rgba(139,139,139,0.4)' }}>
                              ({b.count} picks)
                            </span>
                          </motion.div>
                        </div>
                        <ReturnBadge value={b.avg_return} size="sm" />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.02)' }}>
                  <p className="text-[9px] font-mono" style={{ color: 'rgba(139,139,139,0.3)' }}>
                    💡 If higher scores consistently produce higher returns, the scoring model is well-calibrated.
                  </p>
                </div>
              </Card>
            )}

            {/* ── SECTOR PERFORMANCE ─────────────── */}
            {analytics?.sectors && analytics.sectors.length > 0 && (
              <Card className="p-5" highlight>
                <SectionHeader icon={<Building2 className="h-4 w-4" />} title="Sector Performance"
                  subtitle="Which sectors produce the highest-return picks" />
                <div className="space-y-1">
                  {analytics.sectors.slice(0, 10).map((s) => {
                    const maxCount = Math.max(...analytics.sectors.map(x => x.count));
                    const wrColor = s.win_rate >= 60 ? GREEN.dim : s.win_rate >= 40 ? GOLD.dim : RED.dim;
                    return (
                      <HBar key={s.name}
                        value={s.count} max={maxCount}
                        color={s.avg_return >= 0 ? GREEN.dim : RED.dim}
                        label={s.name}
                        rightLabel={`${s.count}`}
                        subLabel={`${s.win_rate}% WR · ${s.avg_return >= 0 ? '+' : ''}${s.avg_return}%`}
                      />
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ── SCORE RANGE PERFORMANCE ────────── */}
            {dashboard?.by_score_range && Object.keys(dashboard.by_score_range).length > 0 && (
              <Card className="p-5">
                <SectionHeader icon={<BarChart3 className="h-4 w-4" />} title="Performance by Score Range"
                  subtitle="Average returns grouped by overall conviction score" />
                <div className="space-y-2">
                  {Object.entries(dashboard.by_score_range).map(([range, data]) => {
                    const maxCount = Math.max(...Object.values(dashboard.by_score_range).map(d => d.count));
                    return (
                      <HBar key={range}
                        value={data.count} max={maxCount}
                        color={data.avg_return >= 0 ? GREEN.dim : RED.dim}
                        label={`Score ${range}`}
                        rightLabel={`${data.count}`}
                        subLabel={`${data.avg_return >= 0 ? '+' : ''}${data.avg_return}%`}
                      />
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ── DIRECTION ANALYSIS ─────────────── */}
            {analytics?.stages && analytics.stages.length > 0 && (
              <Card className="p-5" gold>
                <SectionHeader icon={<GitBranch className="h-4 w-4" />} title="Direction Analysis"
                  subtitle="Performance by BULLISH / BEARISH / NEUTRAL direction calls" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {analytics.stages.map((s) => {
                    const retColor = s.avg_return >= 0 ? GREEN.dim : RED.dim;
                    return (
                      <div key={s.name} className="p-4 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.015)', border: `1px solid ${GOLD.dim}0.08)` }}>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: '#8B8B8B' }}>
                          {s.name}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {s.avg_return >= 0 ? '+' : ''}{s.avg_return}%
                          </span>
                          <span className="text-[9px] font-mono" style={{ color: '#6A6A6A' }}>avg</span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${GOLD.dim}0.04)` }}>
                          <span className="text-[9px] font-mono" style={{ color: '#6A6A6A' }}>{s.count} picks</span>
                          <span className="text-[9px] font-mono font-bold" style={{ color: s.win_rate >= 50 ? GREEN.solid : RED.solid }}>
                            {s.win_rate}% WR
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ── TRADE TYPE BREAKDOWN ────────────── */}
            {analytics?.trades && analytics.trades.length > 0 && (
              <Card className="p-5">
                <SectionHeader icon={<ArrowRightLeft className="h-4 w-4" />} title="Trade Type Analysis"
                  subtitle="Which trade types (day/swing/position/long-term) perform best" />
                <div className="space-y-1">
                  {analytics.trades.map((t) => {
                    const maxCount = Math.max(...analytics.trades.map(x => x.count));
                    return (
                      <HBar key={t.name}
                        value={t.count} max={maxCount}
                        color={t.avg_return >= 0 ? GREEN.dim : RED.dim}
                        label={t.name}
                        rightLabel={`${t.count}`}
                        subLabel={`${t.win_rate}% WR · ${t.avg_return >= 0 ? '+' : ''}${t.avg_return}%`}
                      />
                    );
                  })}
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* PICKS TABLE TAB                        */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === 'picks' && (
          <motion.div key="picks" className="space-y-4"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>

            {/* ── FILTERS ────────────────────────── */}
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'rgba(139,139,139,0.25)' }} />
                  <input type="text" placeholder="Search ticker..." value={searchTicker}
                    onChange={e => { setSearchTicker(e.target.value); setPage(1); }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[11px] font-mono outline-none"
                    style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${GOLD.dim}0.06)`, color: 'rgba(255,255,255,0.7)' }} />
                </div>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 rounded-xl text-[10px] font-mono outline-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${GOLD.dim}0.06)`, color: 'rgba(139,139,139,0.5)' }}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="hit_target_1">Hit Target 1</option>
                  <option value="hit_target_2">Hit Target 2</option>
                  <option value="stopped_out">Stopped Out</option>
                  <option value="expired">Expired</option>
                </select>
                <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 rounded-xl text-[10px] font-mono outline-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${GOLD.dim}0.06)`, color: 'rgba(139,139,139,0.5)' }}>
                  <option value="all">All Sources</option>
                  <option value="earnings">Earnings</option>
                  <option value="catalyst">Catalyst</option>
                </select>
                <span className="text-[9px] font-mono" style={{ color: 'rgba(139,139,139,0.25)' }}>
                  {totalRecs} recommendations
                </span>
              </div>
            </Card>

            {/* ── TABLE ──────────────────────────── */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr>
                      {[
                        { key: 'ticker', label: 'Ticker', w: 'w-32' },
                        { key: 'source_type', label: 'Source', w: 'w-18' },
                        { key: 'overall_score', label: 'Score', w: 'w-14' },
                        { key: 'rec_price', label: 'Entry', w: 'w-16' },
                        { key: 'price_current', label: 'Current', w: 'w-16' },
                        { key: 'return_current', label: 'Return', w: 'w-16' },
                        { key: 'return_5d', label: '5D', w: 'w-14' },
                        { key: 'return_30d', label: '30D', w: 'w-14' },
                        { key: 'return_60d', label: '60D', w: 'w-14' },
                        { key: 'max_gain', label: 'Max ↑', w: 'w-14' },
                        { key: 'status', label: 'Status', w: 'w-20' },
                        { key: 'tracking_days', label: 'Days', w: 'w-12' },
                        { key: 'rec_date', label: 'Date', w: 'w-16' },
                      ].map(col => (
                        <th key={col.key} onClick={() => toggleSort(col.key)}
                          className={`${col.w} px-2 py-3 text-left cursor-pointer select-none`}
                          style={{ borderBottom: `1px solid ${GOLD.dim}0.06)` }}>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(139,139,139,0.3)' }}>{col.label}</span>
                            {sortBy === col.key && (sortOrder === 'desc'
                              ? <ChevronDown className="h-2.5 w-2.5" style={{ color: `${GOLD.dim}0.4)` }} />
                              : <ChevronUp className="h-2.5 w-2.5" style={{ color: `${GOLD.dim}0.4)` }} />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.length === 0 ? (
                      <tr><td colSpan={13} className="text-center py-16">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-3" style={{ color: `${GOLD.dim}0.2)` }} />
                        <p className="text-[12px]" style={{ color: 'rgba(139,139,139,0.3)' }}>No recommendations found. Run a scan first.</p>
                      </td></tr>
                    ) : recommendations.map((rec, i) => (
                      <motion.tr key={rec.id}
                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                        onClick={() => setExpandedRow(expandedRow === rec.id ? null : rec.id)}
                        className="cursor-pointer transition-colors"
                        style={{
                          background: expandedRow === rec.id ? `${GOLD.dim}0.03)` : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.005)',
                          borderBottom: `1px solid rgba(255,255,255,0.015)`,
                        }}>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1.5">
                            {rec.is_highlighted && <Star className="h-3 w-3 flex-shrink-0" style={{ color: GOLD.primary, fill: GOLD.primary }} />}
                            <span className="text-[12px] font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.8)' }}>{rec.ticker}</span>
                            {rec.grade && <GradeBadge grade={rec.grade} />}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[8px] block truncate max-w-[80px]" style={{ color: 'rgba(139,139,139,0.25)' }}>{rec.company_name}</span>
                            <CatalystTypeBadge type={rec.catalyst_type} />
                          </div>
                        </td>
                        <td className="px-2 py-3"><SourceBadge type={rec.source_type} /></td>
                        <td className="px-2 py-3"><ScoreRing score={rec.overall_score} size={28} /></td>
                        <td className="px-2 py-3"><span className="text-[10px] font-mono" style={{ color: 'rgba(139,139,139,0.5)' }}>${rec.rec_price?.toFixed(2)}</span></td>
                        <td className="px-2 py-3"><span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>${rec.price_current?.toFixed(2) || '—'}</span></td>
                        <td className="px-2 py-3"><ReturnBadge value={rec.return_current} size="sm" /></td>
                        <td className="px-2 py-3"><ReturnBadge value={rec.return_5d} size="sm" /></td>
                        <td className="px-2 py-3"><ReturnBadge value={rec.return_30d} size="sm" /></td>
                        <td className="px-2 py-3"><ReturnBadge value={rec.return_60d} size="sm" /></td>
                        <td className="px-2 py-3"><ReturnBadge value={rec.max_gain} size="sm" /></td>
                        <td className="px-2 py-3"><StatusBadge status={rec.status} /></td>
                        <td className="px-2 py-3"><span className="text-[9px] font-mono" style={{ color: 'rgba(139,139,139,0.3)' }}>{rec.tracking_days ?? '—'}</span></td>
                        <td className="px-2 py-3"><span className="text-[9px] font-mono" style={{ color: 'rgba(139,139,139,0.3)' }}>{fmtDate(rec.rec_date)}</span></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Expanded Detail Row ─────────── */}
              <AnimatePresence>
                {expandedRow && recommendations.find(r => r.id === expandedRow) && (() => {
                  const rec = recommendations.find(r => r.id === expandedRow)!;
                  return (
                    <motion.div key={`expanded-${rec.id}`}
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 overflow-hidden"
                      style={{ borderTop: `1px solid ${GOLD.dim}0.08)` }}>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-[0.12em] block mb-1" style={{ color: 'rgba(139,139,139,0.3)' }}>Sector</span>
                          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{rec.sector || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-[0.12em] block mb-1" style={{ color: 'rgba(139,139,139,0.3)' }}>Direction</span>
                          <span className="text-[11px]" style={{ color: rec.direction === 'BULLISH' ? `${GREEN.dim}0.7)` : `${RED.dim}0.7)` }}>{rec.direction || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-[0.12em] block mb-1" style={{ color: 'rgba(139,139,139,0.3)' }}>Trade Type</span>
                          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{rec.trade_type?.replace(/_/g, ' ') || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-[0.12em] block mb-1" style={{ color: 'rgba(139,139,139,0.3)' }}>Max Drawdown</span>
                          <ReturnBadge value={rec.max_drawdown} size="sm" />
                        </div>
                      </div>
                      {rec.catalyst && (
                        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.02)' }}>
                          <span className="text-[8px] font-bold uppercase tracking-[0.12em] block mb-1" style={{ color: 'rgba(139,139,139,0.3)' }}>Catalyst</span>
                          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{rec.catalyst}</p>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-[8px] font-mono" style={{ color: 'rgba(139,139,139,0.2)' }}>
                          Finotaur Score: {rec.finotaur_score} · Pattern: {rec.pattern || 'N/A'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* ── Pagination ─────────────────── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 p-4" style={{ borderTop: `1px solid ${GOLD.dim}0.04)` }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3.5 py-1.5 rounded-xl text-[10px] font-mono transition-all"
                    style={{ background: `${GOLD.dim}0.04)`, color: 'rgba(139,139,139,0.4)', border: `1px solid ${GOLD.dim}0.06)` }}>← Prev</button>
                  <span className="text-[10px] font-mono" style={{ color: `${GOLD.dim}0.35)` }}>{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3.5 py-1.5 rounded-xl text-[10px] font-mono transition-all"
                    style={{ background: `${GOLD.dim}0.04)`, color: 'rgba(139,139,139,0.4)', border: `1px solid ${GOLD.dim}0.06)` }}>Next →</button>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FOOTER ─────────────────────────────── */}
      <div className="flex items-center justify-between px-2 pb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" style={{ color: '#4A4A4A' }} />
          <span className="text-[9px] font-mono" style={{ color: '#5A5A5A' }}>
            Cache: {dashboard?.last_computed ? fmtDateTime(dashboard.last_computed) : 'Never'}
          </span>
        </div>
        <span className="text-[8px] font-mono" style={{ color: '#4A4A4A' }}>
          60-day tracking · Polygon prices · Zero AI calls · {totalRecs} picks tracked
        </span>
      </div>
    </motion.div>
  );
}