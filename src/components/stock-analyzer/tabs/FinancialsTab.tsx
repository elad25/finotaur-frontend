// src/components/stock-analyzer/tabs/FinancialsTab.tsx
// =====================================================
// 📊 FINANCIALS TAB — Enhanced with Quarterly Trends & Cash Flow
// =====================================================
// v2.1 FEATURES:
//   ✅ Profitability Analysis (existing)
//   ✅ Return on Capital (existing)
//   ✅ Balance Sheet Strength (existing)
//   ✅ Financial Trends — 6-8 quarter margin & revenue trends
//   ✅ Cash Flow Statement — Quarterly OCF, CapEx, FCF chart
//   ✅ Auto-fetch quarterly data from Polygon via backend
//   ✅ Caching per ticker
//   ✅ Loading skeleton & error handling
//   ✅ NEW: Interactive hover tooltips on ALL charts
// =====================================================

import { memo, useState, useEffect, useCallback, useRef, type ComponentType } from 'react';
import { StockTabErrorBoundary } from '../StockTabErrorBoundary';
import { BarChart3, TrendingUp, Shield, Activity, DollarSign, Loader2, AlertTriangle, MoreVertical, ChevronDown, Info, Sparkles, Database, Cog, LineChart, ArrowDown, FileText, Target } from 'lucide-react';
import type { StockData } from '@/types/stock-analyzer.types';
import { C } from '@/constants/stock-analyzer.constants';
import { Card, MetricBox, SectionHeader, ROCCircle } from '../ui';
import { fmtPct, isValid } from '@/utils/stock-analyzer.utils';
import { authFetch } from '@/utils/authFetch';

// =====================================================
// TYPES — Quarterly Financial Data
// =====================================================

interface QuarterlyData {
  quarter: string;        // "Q3 2024"
  period: string;         // "2024-09-30"
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  eps: number | null;
  // Cash flow
  operatingCashFlow: number | null;
  capex: number | null;
  freeCashFlow: number | null;
}

interface QuarterlyCache {
  ticker: string;
  data: QuarterlyData[];
  fetchedAt: number;
}

// =====================================================
// CACHE — Per-Ticker Quarterly Data
// =====================================================

const quarterlyCache = new Map<string, QuarterlyCache>();
const QUARTERLY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// =====================================================
// HELPER — Parse Polygon quarterly financials
// =====================================================

function parseQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth(); // 0-indexed
  const year = d.getFullYear();
  // Determine fiscal quarter from end date
  if (month <= 2) return `Q1 ${year}`;
  if (month <= 5) return `Q2 ${year}`;
  if (month <= 8) return `Q3 ${year}`;
  return `Q4 ${year}`;
}

function parseQuarterlyResults(results: any[]): QuarterlyData[] {
  return results
    .filter((r: any) => r.fiscal_period?.startsWith('Q') || r.timeframe === 'quarterly')
    .map((r: any) => {
      const inc = r.financials?.income_statement || {};
      const cf = r.financials?.cash_flow_statement || {};

      const revenue = inc.revenues?.value || null;
      const grossProfit = inc.gross_profit?.value || null;
      const operatingIncome = inc.operating_income_loss?.value || null;
      const netIncome = inc.net_income_loss?.value || null;
      const shares = inc.basic_average_shares?.value || inc.diluted_average_shares?.value || null;

      const operatingCashFlow = cf.net_cash_flow_from_operating_activities?.value || null;
      const capexRaw = cf.net_cash_flow_from_investing_activities?.value || null;
      // CapEx is typically negative in Polygon data
      const capex = capexRaw;
      const freeCashFlow = (operatingCashFlow != null && capex != null) ? operatingCashFlow + capex : null;

      return {
        quarter: r.fiscal_period && r.fiscal_year
          ? `${r.fiscal_period} ${r.fiscal_year}`
          : parseQuarterLabel(r.end_date || r.filing_date || ''),
        period: r.end_date || r.filing_date || '',
        revenue,
        grossProfit,
        operatingIncome,
        netIncome,
        grossMargin: (revenue && grossProfit) ? (grossProfit / revenue) * 100 : null,
        operatingMargin: (revenue && operatingIncome) ? (operatingIncome / revenue) * 100 : null,
        netMargin: (revenue && netIncome) ? (netIncome / revenue) * 100 : null,
        eps: (netIncome && shares) ? netIncome / shares : null,
        operatingCashFlow,
        capex,
        freeCashFlow,
      };
    })
    .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime()); // oldest first
}

// =====================================================
// HOOK — Fetch Quarterly Data
// =====================================================

function useQuarterlyData(ticker: string, prefetchedData?: any) {
  const [data, setData] = useState<QuarterlyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string>('');

  const fetchData = useCallback(async () => {
    if (!ticker) return;

    // Check prefetched data from orchestrator
    if (prefetchedData?.length) {
      setData(prefetchedData);
      quarterlyCache.set(ticker, { ticker, data: prefetchedData, fetchedAt: Date.now() });
      return;
    }

    // Check cache
    const cached = quarterlyCache.get(ticker);
    if (cached && Date.now() - cached.fetchedAt < QUARTERLY_CACHE_TTL) {
      setData(cached.data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch 16 quarters from Polygon via backend
      const res = await authFetch(`/api/market-data/quarterly-financials/${ticker}`);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[FinancialsTab] Non-JSON response:', res.status, text.slice(0, 200));
        throw new Error(`Failed to fetch quarterly data: ${res.status}`);
      }
      const json = await res.json();

      if (!json.results?.length) {
        // Fallback: try fetching directly from financials endpoint with more results
        const fallbackRes = await authFetch(`/api/market-data/financials/${ticker}?quarters=16`);
        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json();
          if (fallbackJson.results?.length) {
            const parsed = parseQuarterlyResults(fallbackJson.results);
            setData(parsed);
            quarterlyCache.set(ticker, { ticker, data: parsed, fetchedAt: Date.now() });
            return;
          }
        }
        setError('No quarterly data available');
        return;
      }

      const parsed = parseQuarterlyResults(json.results);
      setData(parsed);
      quarterlyCache.set(ticker, { ticker, data: parsed, fetchedAt: Date.now() });
    } catch (err: any) {
      console.error('[FinancialsTab] Quarterly fetch error:', err);
      setError(err.message || 'Failed to load quarterly data');
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    if (ticker && ticker !== fetchedRef.current) {
      fetchedRef.current = ticker;
      fetchData();
    }
  }, [ticker, fetchData]);

  return { data, loading, error };
}

// =====================================================
// CHART COMPONENTS — Interactive SVG with Hover Tooltips
// =====================================================

// Format big numbers compactly
function compactNum(n: number): string {
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// Format big numbers with more precision for tooltips
function compactNumPrecise(n: number): string {
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

// Short quarter label helper
function shortQ(q: string): string { return q.replace(' 20', "'").replace(' ', "'"); }

// Smooth catmull-rom spline path builder
function buildSmooth(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const t = 0.35;
    d += ` C${(p1.x + (p2.x - p0.x) * t).toFixed(1)},${(p1.y + (p2.y - p0.y) * t).toFixed(1)} ${(p2.x - (p3.x - p1.x) * t).toFixed(1)},${(p2.y - (p3.y - p1.y) * t).toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

// =====================================================
// SHARED SVG DEFS — Gradients & Filters for premium charts
// =====================================================

const ChartDefs = memo(() => (
  <defs>
    <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity="0.35" /><stop offset="60%" stopColor={C.green} stopOpacity="0.12" /><stop offset="100%" stopColor={C.green} stopOpacity="0.03" /></linearGradient>
    <linearGradient id="gAmber" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.amber} stopOpacity="0.35" /><stop offset="60%" stopColor={C.amber} stopOpacity="0.12" /><stop offset="100%" stopColor={C.amber} stopOpacity="0.03" /></linearGradient>
    <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.gold} stopOpacity="0.30" /><stop offset="60%" stopColor={C.gold} stopOpacity="0.10" /><stop offset="100%" stopColor={C.gold} stopOpacity="0.02" /></linearGradient>
    <linearGradient id="gGoldEps" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F4D97B" stopOpacity="0.28" /><stop offset="50%" stopColor={C.gold} stopOpacity="0.08" /><stop offset="100%" stopColor={C.gold} stopOpacity="0" /></linearGradient>
    <linearGradient id="barUp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ADE80" stopOpacity="0.95" /><stop offset="100%" stopColor="#16A34A" stopOpacity="0.7" /></linearGradient>
    <linearGradient id="barDn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F87171" stopOpacity="0.95" /><stop offset="100%" stopColor="#DC2626" stopOpacity="0.7" /></linearGradient>
    <linearGradient id="cfB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60A5FA" stopOpacity="0.95" /><stop offset="100%" stopColor="#2563EB" stopOpacity="0.7" /></linearGradient>
    <linearGradient id="cfR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F87171" stopOpacity="0.9" /><stop offset="100%" stopColor="#DC2626" stopOpacity="0.65" /></linearGradient>
    <linearGradient id="cfG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ADE80" stopOpacity="0.95" /><stop offset="100%" stopColor="#16A34A" stopOpacity="0.7" /></linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" /></filter>
  </defs>
));
ChartDefs.displayName = 'ChartDefs';

// Reusable grid line renderer
const ChartGrid = ({ PL, PR, PT, W, getY, values, fmt }: { PL: number; PR: number; PT: number; W: number; getY: (v: number) => number; values: number[]; fmt: (v: number) => string }) => (
  <>
    {values.map((val, i) => {
      const y = getY(val);
      return (
        <g key={i}>
          <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="2,6" />
          <text x={PL - 8} y={y + 3.5} textAnchor="end" fill="#555" fontSize="9" fontFamily="inherit">{fmt(val)}</text>
        </g>
      );
    })}
  </>
);

// =====================================================
// SVG TOOLTIP — Premium styled tooltip
// =====================================================

const SvgTooltip = memo(({ x, y, lines, svgWidth }: {
  x: number;
  y: number;
  lines: { label: string; value: string; color?: string; bold?: boolean }[];
  svgWidth: number;
}) => {
  const pad = 10, lh = 16, ttW = 160;
  const ttH = pad * 2 + lines.length * lh + 6;
  let tx = x - ttW / 2;
  if (tx < 4) tx = 4;
  if (tx + ttW > svgWidth - 4) tx = svgWidth - ttW - 4;
  let ty = y - ttH - 12;
  if (ty < 2) ty = y + 18;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={tx + 2} y={ty + 3} width={ttW} height={ttH} rx={9} fill="rgba(0,0,0,0.55)" />
      <rect x={tx} y={ty} width={ttW} height={ttH} rx={8} fill="rgba(15,13,10,0.97)" stroke="rgba(201,166,70,0.3)" strokeWidth="1" />
      <line x1={tx + 12} x2={tx + ttW - 12} y1={ty + 0.5} y2={ty + 0.5} stroke="rgba(201,166,70,0.5)" strokeWidth="1" strokeLinecap="round" />
      {lines.map((line, i) => {
        const ly = ty + pad + i * lh + (i === 0 ? 2 : 8);
        const isH = i === 0;
        return (
          <g key={i}>
            {line.color && !isH && <rect x={tx + pad} y={ly - 4} width={5} height={5} rx={1.5} fill={line.color} />}
            <text x={tx + pad + (line.color && !isH ? 11 : 0)} y={ly} fill={isH ? '#C9A646' : '#8B8B8B'} fontSize={isH ? '10' : '9.5'} fontWeight={isH ? '700' : '400'} fontFamily="inherit" letterSpacing={isH ? '0.03em' : '0'}>{line.label}</text>
            {line.value && <text x={tx + ttW - pad} y={ly} textAnchor="end" fill={line.bold ? '#FFF' : '#E8DCC4'} fontSize={line.bold ? '10.5' : '10'} fontWeight={line.bold ? '700' : '600'} fontFamily="inherit">{line.value}</text>}
          </g>
        );
      })}
    </g>
  );
});
SvgTooltip.displayName = 'SvgTooltip';

// ---- Margin Trend Line Chart — PREMIUM with gradient areas & smooth curves ----
const MarginTrendChart = memo(({ data }: { data: QuarterlyData[] }) => {
  const [hi, setHi] = useState<number | null>(null);
  if (data.length < 2) return null;

  const W = 600, H = 250, PL = 50, PR = 20, PT = 25, PB = 45;
  const cW = W - PL - PR, cH = H - PT - PB;

  const all: number[] = [];
  data.forEach(q => { if (q.grossMargin != null) all.push(q.grossMargin); if (q.operatingMargin != null) all.push(q.operatingMargin); if (q.netMargin != null) all.push(q.netMargin); });
  if (!all.length) return null;

  const pad = (Math.max(...all) - Math.min(...all)) * 0.18 || 5;
  const yMin = Math.min(...all) - pad, yMax = Math.max(...all) + pad;
  const xS = cW / (data.length - 1);
  const gY = (v: number) => PT + cH - ((v - yMin) / (yMax - yMin)) * cH;
  const gX = (i: number) => PL + i * xS;

  const makePts = (key: keyof QuarterlyData) => {
    const pts: { x: number; y: number }[] = [];
    data.forEach((q, i) => { const v = q[key] as number | null; if (v != null) pts.push({ x: gX(i), y: gY(v) }); });
    return pts;
  };
  const makeArea = (key: keyof QuarterlyData) => {
    const pts = makePts(key);
    if (pts.length < 2) return '';
    const bottom = yMin < 0 ? gY(0) : PT + cH;
    return `${buildSmooth(pts)} L${pts[pts.length - 1].x},${bottom} L${pts[0].x},${bottom} Z`;
  };

  const gridN = 5;
  const gridVals = Array.from({ length: gridN + 1 }, (_, i) => yMin + ((yMax - yMin) / gridN) * i);
  const hq = hi != null ? data[hi] : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 250 }} onMouseLeave={() => setHi(null)}>
      <ChartDefs />
      <rect x={PL} y={PT} width={cW} height={cH} rx={4} fill="rgba(255,255,255,0.008)" />
      <ChartGrid PL={PL} PR={PR} PT={PT} W={W} getY={gY} values={gridVals} fmt={v => `${v.toFixed(0)}%`} />

      {/* Zero reference line when chart includes negative margins */}
      {yMin < 0 && <line x1={PL} y1={gY(0)} x2={W - PR} y2={gY(0)} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} strokeDasharray="6,4" />}

      {/* Gradient area fills */}
      <path d={makeArea('grossMargin')} fill="url(#gGreen)" />
      <path d={makeArea('operatingMargin')} fill="url(#gAmber)" />
      <path d={makeArea('netMargin')} fill="url(#gGold)" />

      {/* Glow lines (behind) */}
      <path d={buildSmooth(makePts('grossMargin'))} fill="none" stroke={C.green} strokeWidth="6" opacity="0.12" filter="url(#glow)" />
      <path d={buildSmooth(makePts('operatingMargin'))} fill="none" stroke={C.amber} strokeWidth="6" opacity="0.1" filter="url(#glow)" />
      <path d={buildSmooth(makePts('netMargin'))} fill="none" stroke={C.gold} strokeWidth="6" opacity="0.1" filter="url(#glow)" />

      {/* Main smooth lines */}
      <path d={buildSmooth(makePts('grossMargin'))} fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" />
      <path d={buildSmooth(makePts('operatingMargin'))} fill="none" stroke={C.amber} strokeWidth="2.5" strokeLinecap="round" />
      <path d={buildSmooth(makePts('netMargin'))} fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" />

      {/* X labels */}
      {data.map((q, i) => (
        <text key={i} x={gX(i)} y={H - 8} textAnchor="middle" fill={hi === i ? '#E8DCC4' : '#555'} fontSize="9.5" fontWeight={hi === i ? '700' : '400'} fontFamily="inherit">{shortQ(q.quarter)}</text>
      ))}

      {/* Dots with outer glow */}
      {data.map((q, i) => {
        const show = hi === i || (hi == null && i === data.length - 1);
        if (!show) return null;
        const x = gX(i), r = hi === i ? 5 : 4;
        const Dot = ({ val, col }: { val: number | null; col: string }) => val == null ? null : (
          <><circle cx={x} cy={gY(val)} r={r + 3} fill={col} opacity="0.2" /><circle cx={x} cy={gY(val)} r={r} fill="#0a0a0a" stroke={col} strokeWidth="2.5" /></>
        );
        return <g key={`d${i}`}><Dot val={q.grossMargin} col={C.green} /><Dot val={q.operatingMargin} col={C.amber} /><Dot val={q.netMargin} col={C.gold} /></g>;
      })}

      {/* Hover vertical line */}
      {hi != null && <line x1={gX(hi)} x2={gX(hi)} y1={PT} y2={PT + cH} stroke="rgba(201,166,70,0.2)" strokeWidth="1" strokeDasharray="3,4" />}

      {/* Hover zones */}
      {data.map((_, i) => <rect key={`h${i}`} x={gX(i) - xS / 2} y={PT - 5} width={xS} height={cH + PB + 5} fill="transparent" style={{ cursor: 'crosshair' }} onMouseEnter={() => setHi(i)} />)}

      {/* Tooltip */}
      {hq && hi != null && (
        <SvgTooltip x={gX(hi)} y={Math.min(hq.grossMargin != null ? gY(hq.grossMargin) : PT + cH, hq.operatingMargin != null ? gY(hq.operatingMargin) : PT + cH, hq.netMargin != null ? gY(hq.netMargin) : PT + cH)} svgWidth={W}
          lines={[
            { label: hq.quarter, value: '', bold: true },
            ...(hq.grossMargin != null ? [{ label: 'Gross Margin', value: `${hq.grossMargin.toFixed(1)}%`, color: C.green }] : []),
            ...(hq.operatingMargin != null ? [{ label: 'Op. Margin', value: `${hq.operatingMargin.toFixed(1)}%`, color: C.amber }] : []),
            ...(hq.netMargin != null ? [{ label: 'Net Margin', value: `${hq.netMargin.toFixed(1)}%`, color: C.gold }] : []),
          ]}
        />
      )}
    </svg>
  );
});
MarginTrendChart.displayName = 'MarginTrendChart';

// ---- Revenue Bar Chart — PREMIUM gradient bars with shadows ----
const RevenueBarChart = memo(({ data }: { data: QuarterlyData[] }) => {
  const [hi, setHi] = useState<number | null>(null);
  if (data.length < 2) return null;

  const W = 600, H = 210, PL = 60, PR = 20, PT = 20, PB = 45;
  const cW = W - PL - PR, cH = H - PT - PB;
  const revs = data.map(q => q.revenue || 0);
  const maxR = Math.max(...revs) * 1.12;
  const barW = Math.min(42, (cW / data.length) * 0.58);
  const gap = (cW - barW * data.length) / (data.length + 1);
  const bX = (i: number) => PL + gap + i * (barW + gap);
  const bH = (v: number) => (v / maxR) * cH;

  const gridVals = Array.from({ length: 5 }, (_, i) => (i * maxR) / 4);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 210 }} onMouseLeave={() => setHi(null)}>
      <ChartDefs />
      <rect x={PL} y={PT} width={cW} height={cH} rx={4} fill="rgba(255,255,255,0.008)" />
      <ChartGrid PL={PL} PR={PR} PT={PT} W={W} getY={v => PT + cH - (v / maxR) * cH} values={gridVals} fmt={compactNum} />

      {data.map((q, i) => {
        const rev = q.revenue || 0, h = bH(rev), x = bX(i), y = PT + cH - h;
        const prev = i > 0 ? (data[i - 1].revenue || 0) : rev;
        const up = rev >= prev, hov = hi === i;
        return (
          <g key={i}>
            {hov && <rect x={x - 6} y={PT} width={barW + 12} height={cH} fill="rgba(201,166,70,0.03)" rx={6} />}
            <rect x={x + 2} y={y + 2} width={barW} height={h} rx={4} fill="rgba(0,0,0,0.3)" />
            <rect x={x} y={y} width={barW} height={h} rx={4} fill={up ? 'url(#barUp)' : 'url(#barDn)'} fillOpacity={hov ? 1 : 0.82} style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }} onMouseEnter={() => setHi(i)} />
            <rect x={x + 2} y={y} width={barW - 4} height={2} rx={1} fill={up ? '#86EFAC' : '#FCA5A5'} opacity={hov ? 0.8 : 0.4} />
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill={hov ? '#FFF' : '#B8B0A0'} fontSize={hov ? '9.5' : '8'} fontWeight={hov ? '700' : '500'} fontFamily="inherit">{compactNum(rev)}</text>
            <text x={x + barW / 2} y={H - 8} textAnchor="middle" fill={hov ? '#E8DCC4' : '#555'} fontSize="9.5" fontWeight={hov ? '700' : '400'} fontFamily="inherit">{shortQ(q.quarter)}</text>
          </g>
        );
      })}

      {hi != null && (() => {
        const q = data[hi], rev = q.revenue || 0;
        const prev = hi > 0 ? (data[hi - 1].revenue || 0) : null;
        const qoq = prev && prev !== 0 ? ((rev - prev) / Math.abs(prev)) * 100 : null;
        const yoyRev = hi >= 4 ? (data[hi - 4].revenue || 0) : null;
        const yoy = yoyRev && yoyRev !== 0 ? ((rev - yoyRev) / Math.abs(yoyRev)) * 100 : null;
        const lines: { label: string; value: string; color?: string; bold?: boolean }[] = [
          { label: q.quarter, value: compactNumPrecise(rev), bold: true },
          ...(qoq != null ? [{ label: 'Q/Q', value: `${qoq >= 0 ? '+' : ''}${qoq.toFixed(1)}%`, color: qoq >= 0 ? C.green : C.red }] : []),
          ...(yoy != null ? [{ label: 'Y/Y', value: `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%`, color: yoy >= 0 ? C.green : C.red }] : []),
          ...(q.grossProfit != null ? [{ label: 'Gross Profit', value: compactNumPrecise(q.grossProfit) }] : []),
          ...(q.operatingIncome != null ? [{ label: 'Op. Income', value: compactNumPrecise(q.operatingIncome) }] : []),
        ];
        return <SvgTooltip x={bX(hi) + barW / 2} y={PT + cH - bH(rev)} svgWidth={W} lines={lines} />;
      })()}
    </svg>
  );
});
RevenueBarChart.displayName = 'RevenueBarChart';

// ---- Cash Flow Chart (Grouped Bars: OCF, CapEx, FCF) — INTERACTIVE ----
type CashFlowFilter = 'all' | 'ocf' | 'capex' | 'fcf';

const CF_FILTERS: { key: CashFlowFilter; label: string; color: string; border: string; bg: string }[] = [
  { key: 'all',   label: 'All',   color: '#C9A646', border: 'rgba(201,166,70,0.4)', bg: 'rgba(201,166,70,0.10)' },
  { key: 'ocf',   label: 'OCF',   color: C.blue,    border: 'rgba(59,130,246,0.4)',  bg: 'rgba(59,130,246,0.10)' },
  { key: 'capex', label: 'CapEx', color: C.red,     border: 'rgba(239,68,68,0.4)',   bg: 'rgba(239,68,68,0.10)' },
  { key: 'fcf',   label: 'FCF',   color: C.green,   border: 'rgba(34,197,94,0.4)',   bg: 'rgba(34,197,94,0.10)' },
];

const CashFlowChart = memo(({ data }: { data: QuarterlyData[] }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<CashFlowFilter>('all');

  const filtered = data.filter(q => q.operatingCashFlow != null || q.freeCashFlow != null);
  if (filtered.length < 2) return null;

  // Determine which bar types are visible
  const showOCF   = filter === 'all' || filter === 'ocf';
  const showCapex = filter === 'all' || filter === 'capex';
  const showFCF   = filter === 'all' || filter === 'fcf';
  const visibleCount = (showOCF ? 1 : 0) + (showCapex ? 1 : 0) + (showFCF ? 1 : 0);

  const W = 600, H = 240, PL = 60, PR = 20, PT = 15, PB = 50;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  // Collect values only for visible bars (dynamic Y-axis)
  const allVals: number[] = [];
  filtered.forEach(q => {
    if (showOCF   && q.operatingCashFlow != null) allVals.push(q.operatingCashFlow);
    if (showCapex && q.capex != null)             allVals.push(q.capex);
    if (showFCF   && q.freeCashFlow != null)      allVals.push(q.freeCashFlow);
  });

  const minVal = Math.min(0, ...allVals);
  const maxVal = Math.max(0, ...allVals);
  const range = maxVal - minVal || 1;
  const padRange = range * 1.15;
  const yMin = minVal - (padRange - range) * 0.3;
  const yMax = maxVal + (padRange - range) * 0.7;

  const getY = (v: number) => PT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const zeroY = getY(0);

  // Bar sizing adapts to how many types are visible
  const groupW = (chartW / filtered.length) * 0.75;
  const barW = visibleCount > 0 ? groupW / visibleCount : groupW / 3;
  const gap = (chartW - groupW * filtered.length) / (filtered.length + 1);
  const getGroupX = (i: number) => PL + gap + i * (groupW + gap);

  // Grid
  const gridLines = 5;
  const gridStep = (yMax - yMin) / gridLines;

  return (
    <div>
      {/* Filter toggle buttons */}
      <div className="flex items-center gap-1.5 mb-3">
        {CF_FILTERS.map(f => {
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="relative px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-200"
              style={{
                background: isActive ? f.bg : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? f.border : 'rgba(255,255,255,0.06)'}`,
                color: isActive ? f.color : '#6B6B6B',
                boxShadow: isActive ? `0 0 12px ${f.bg}` : 'none',
              }}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: f.color, boxShadow: `0 0 4px ${f.color}` }}
                />
              )}
              {f.key !== 'all' && (
                <span
                  className="inline-block w-2 h-2 rounded-sm mr-1.5"
                  style={{
                    background: isActive ? f.color : 'rgba(255,255,255,0.15)',
                    transition: 'background 0.2s',
                  }}
                />
              )}
              {f.label}
            </button>
          );
        })}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 240 }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <ChartDefs />
        {/* Grid */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const val = yMin + i * gridStep;
          const y = getY(val);
          return (
            <g key={i}>
              <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
              <text x={PL - 8} y={y + 4} textAnchor="end" fill="#6B6B6B" fontSize="9">{compactNum(val)}</text>
            </g>
          );
        })}

        {/* Zero line */}
        <line x1={PL} x2={W - PR} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

        {/* Grouped bars */}
        {filtered.map((q, i) => {
          const gx = getGroupX(i);
          const isHovered = hoverIdx === i;

          // Build only visible bars in order
          const bars: { val: number | null; color: string; label: string; gradId: string }[] = [];
          if (showOCF)   bars.push({ val: q.operatingCashFlow, color: C.blue, label: 'OCF',   gradId: 'url(#cfB)' });
          if (showCapex) bars.push({ val: q.capex,             color: C.red,  label: 'CapEx', gradId: 'url(#cfR)' });
          if (showFCF)   bars.push({ val: q.freeCashFlow,      color: C.green,label: 'FCF',   gradId: 'url(#cfG)' });

          return (
            <g key={i}>
              {/* Hover highlight */}
              {isHovered && (
                <rect
                  x={gx - 4} y={PT}
                  width={groupW + 8} height={chartH}
                  fill="rgba(201,166,70,0.04)" rx={4}
                />
              )}
              {bars.map((b, bi) => {
                if (b.val == null) return null;
                const x = gx + bi * barW;
                const y = b.val >= 0 ? getY(b.val) : zeroY;
                const h = Math.abs(getY(b.val) - zeroY);
                return (
                  <g key={bi}>
                    <rect x={x + 1} y={y + 1} width={barW - 3} height={Math.max(1, h)} rx={3} fill="rgba(0,0,0,0.2)" />
                    <rect x={x} y={y} width={barW - 2} height={Math.max(1, h)} rx={3} fill={b.gradId} fillOpacity={isHovered ? 1 : 0.78}
                      style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }} onMouseEnter={() => setHoverIdx(i)} />
                  </g>
                );
              })}
              {/* Quarter label */}
              <text
                x={gx + groupW / 2} y={H - 10}
                textAnchor="middle"
                fill={isHovered ? '#E8DCC4' : '#6B6B6B'}
                fontSize="9"
                fontWeight={isHovered ? '600' : '400'}
              >
                {q.quarter.replace(' 20', "'").replace(' ', "'")}
              </text>
              {/* Invisible hover zone over the full group area */}
              <rect
                x={gx - gap / 2} y={PT}
                width={groupW + gap} height={chartH + PB}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoverIdx(i)}
              />
            </g>
          );
        })}

        {/* Tooltip */}
        {hoverIdx != null && (() => {
          const q = filtered[hoverIdx];
          const gx = getGroupX(hoverIdx);
          const tooltipLines: { label: string; value: string; color?: string }[] = [
            { label: q.quarter, value: '' },
          ];
          if (showOCF && q.operatingCashFlow != null) {
            tooltipLines.push({ label: 'Op. Cash Flow', value: compactNumPrecise(q.operatingCashFlow), color: C.blue });
          }
          if (showCapex && q.capex != null) {
            tooltipLines.push({ label: 'CapEx', value: compactNumPrecise(Math.abs(q.capex)), color: C.red });
          }
          if (showFCF && q.freeCashFlow != null) {
            tooltipLines.push({ label: 'Free Cash Flow', value: compactNumPrecise(q.freeCashFlow), color: C.green });
          }
          // FCF margin if revenue available
          if (showFCF && q.freeCashFlow != null && q.revenue != null && q.revenue !== 0) {
            tooltipLines.push({ label: 'FCF Margin', value: `${((q.freeCashFlow / q.revenue) * 100).toFixed(1)}%` });
          }

          const topY = Math.min(
            showOCF && q.operatingCashFlow != null ? getY(q.operatingCashFlow) : PT + chartH,
            showFCF && q.freeCashFlow != null ? getY(q.freeCashFlow) : PT + chartH,
            showCapex && q.capex != null ? getY(q.capex) : PT + chartH,
          );

          return (
            <SvgTooltip
              x={gx + groupW / 2}
              y={topY}
              svgWidth={W}
              lines={tooltipLines}
            />
          );
        })()}
      </svg>
    </div>
  );
});
CashFlowChart.displayName = 'CashFlowChart';

// ---- EPS Trend Chart — PREMIUM with outlier handling, smooth curves, gradient area ----
const EPSTrendChart = memo(({ data }: { data: QuarterlyData[] }) => {
  const [hi, setHi] = useState<number | null>(null);
  const filtered = data.filter(q => q.eps != null);
  if (filtered.length < 2) return null;

  const W = 600, H = 220, PL = 55, PR = 20, PT = 25, PB = 45;
  const cW = W - PL - PR, cH = H - PT - PB;
  const epsV = filtered.map(q => q.eps!);

  // Smart outlier detection using IQR
  const sorted = [...epsV].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)], q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const hasOut = iqr > 0 && sorted.some(v => v < q1 - 3 * iqr || v > q3 + 3 * iqr);

  let dMin: number, dMax: number;
  if (hasOut && sorted.length > 3) {
    dMin = Math.min(0, Math.max(q1 - 2 * iqr, sorted[0]));
    dMax = Math.min(q3 + 2 * iqr, sorted[sorted.length - 1]);
    dMin = Math.min(0, dMin); dMax = Math.max(0, dMax);
  } else {
    dMin = Math.min(0, ...epsV); dMax = Math.max(...epsV);
  }
  const rng = dMax - dMin || 1;
  const yMin = dMin - rng * 0.12, yMax = dMax + rng * 0.18;
  const gY = (v: number) => { const c = Math.max(yMin, Math.min(yMax, v)); return PT + cH - ((c - yMin) / (yMax - yMin)) * cH; };
  const xS = cW / (filtered.length - 1);
  const gX = (i: number) => PL + i * xS;
  const isOut = (v: number) => hasOut && (v < yMin || v > yMax);

  const pts = filtered.map((q, i) => ({ x: gX(i), y: gY(q.eps!) }));
  const line = buildSmooth(pts);
  const bottom = PT + cH;
  const area = `${line} L${gX(filtered.length - 1)},${bottom} L${PL},${bottom} Z`;
  const zeroInView = yMin <= 0 && yMax >= 0;
  const gridVals = Array.from({ length: 6 }, (_, i) => yMin + ((yMax - yMin) / 5) * i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }} onMouseLeave={() => setHi(null)}>
      <ChartDefs />
      <rect x={PL} y={PT} width={cW} height={cH} rx={4} fill="rgba(255,255,255,0.008)" />
      <ChartGrid PL={PL} PR={PR} PT={PT} W={W} getY={gY} values={gridVals} fmt={v => `$${v.toFixed(2)}`} />
      {zeroInView && <line x1={PL} x2={W - PR} y1={gY(0)} y2={gY(0)} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />}

      {/* Gradient area fill */}
      <path d={area} fill="url(#gGoldEps)" />
      {/* Glow line */}
      <path d={line} fill="none" stroke={C.gold} strokeWidth="7" opacity="0.1" filter="url(#glow)" />
      {/* Main smooth line */}
      <path d={line} fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" />

      {/* Hover vertical line */}
      {hi != null && <line x1={gX(hi)} x2={gX(hi)} y1={PT} y2={bottom} stroke="rgba(201,166,70,0.2)" strokeWidth="1" strokeDasharray="3,4" />}

      {/* Dots with glow */}
      {filtered.map((q, i) => {
        const hov = hi === i, x = gX(i), y = gY(q.eps!), out = isOut(q.eps!);
        const r = hov ? 5.5 : 3.5;
        return (
          <g key={i}>
            {(hov || i === filtered.length - 1) && <circle cx={x} cy={y} r={r + 3} fill={C.gold} opacity="0.15" />}
            <circle cx={x} cy={y} r={r} fill="#0a0a0a" stroke={out ? C.red : C.gold} strokeWidth={hov ? '3' : '2'} />
            <text x={x} y={y - 10} textAnchor="middle" fill={hov ? '#FFF' : '#B8B0A0'} fontSize={hov ? '10' : '8.5'} fontWeight={hov ? '700' : '500'} fontFamily="inherit">
              {out ? `$${q.eps!.toFixed(2)} ⚠` : `$${q.eps!.toFixed(2)}`}
            </text>
            <text x={x} y={H - 8} textAnchor="middle" fill={hov ? '#E8DCC4' : '#555'} fontSize="9.5" fontWeight={hov ? '700' : '400'} fontFamily="inherit">{shortQ(q.quarter)}</text>
          </g>
        );
      })}

      {/* Hover zones */}
      {filtered.map((_, i) => <rect key={`h${i}`} x={gX(i) - xS / 2} y={PT - 5} width={xS} height={cH + PB + 5} fill="transparent" style={{ cursor: 'crosshair' }} onMouseEnter={() => setHi(i)} />)}

      {/* Tooltip */}
      {hi != null && (() => {
        const q = filtered[hi];
        const lines: { label: string; value: string; color?: string; bold?: boolean }[] = [{ label: q.quarter, value: `$${q.eps!.toFixed(2)}`, bold: true }];
        if (hi > 0) { const prev = filtered[hi - 1].eps!; if (prev !== 0) { const ch = ((q.eps! - prev) / Math.abs(prev)) * 100; lines.push({ label: 'Q/Q', value: `${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%`, color: ch >= 0 ? C.green : C.red }); } }
        if (hi >= 4) { const yoy = filtered[hi - 4].eps!; if (yoy !== 0) { const ch = ((q.eps! - yoy) / Math.abs(yoy)) * 100; lines.push({ label: 'Y/Y', value: `${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%`, color: ch >= 0 ? C.green : C.red }); } }
        if (isOut(q.eps!)) lines.push({ label: '⚠ Outlier', value: 'Scale adjusted', color: C.amber });
        return <SvgTooltip x={gX(hi)} y={gY(q.eps!)} svgWidth={W} lines={lines} />;
      })()}
    </svg>
  );
});
EPSTrendChart.displayName = 'EPSTrendChart';

// =====================================================
// CHART LEGEND COMPONENT
// =====================================================

const ChartLegend = memo(({ items }: { items: { color: string; label: string }[] }) => (
  <div className="flex flex-wrap gap-4 mt-3">
    {items.map(item => (
      <div key={item.label} className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
        <span className="text-xs text-[#8B8B8B]">{item.label}</span>
      </div>
    ))}
  </div>
));
ChartLegend.displayName = 'ChartLegend';

// =====================================================
// TREND INDICATOR — Shows Q/Q change
// =====================================================

const TrendBadge = memo(({ current, previous, label }: { current: number | null; previous: number | null; label: string }) => {
  if (current == null || previous == null) return null;
  const change = current - previous;
  const isPositive = change >= 0;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: isPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
      <span className="text-[10px] text-[#8B8B8B]">{label}</span>
      <span className={`text-xs font-semibold ${isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
        {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(1)}pp
      </span>
    </div>
  );
});
TrendBadge.displayName = 'TrendBadge';

// =====================================================
// LOADING SKELETON
// =====================================================

const ChartSkeleton = memo(() => (
  <div className="space-y-3 animate-pulse">
    <div className="h-4 w-40 rounded" style={{ background: 'rgba(201,166,70,0.08)' }} />
    <div className="h-[180px] rounded-xl" style={{ background: 'rgba(201,166,70,0.04)' }} />
  </div>
));
ChartSkeleton.displayName = 'ChartSkeleton';

// =====================================================
// QUARTERLY SUMMARY ROW
// =====================================================

const QuarterlySummaryRow = memo(({ data }: { data: QuarterlyData[] }) => {
  if (data.length < 2) return null;
  const latest = data[data.length - 1];
  const prev = data[data.length - 2];

  const revenueChange = (latest.revenue && prev.revenue && prev.revenue !== 0)
    ? ((latest.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100
    : null;

  const fcfChange = (latest.freeCashFlow && prev.freeCashFlow && prev.freeCashFlow !== 0)
    ? ((latest.freeCashFlow - prev.freeCashFlow) / Math.abs(prev.freeCashFlow)) * 100
    : null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <TrendBadge current={latest.grossMargin} previous={prev.grossMargin} label="Gross Margin" />
      <TrendBadge current={latest.operatingMargin} previous={prev.operatingMargin} label="Op. Margin" />
      <TrendBadge current={latest.netMargin} previous={prev.netMargin} label="Net Margin" />
      {revenueChange != null && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: revenueChange >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
          <span className="text-[10px] text-[#8B8B8B]">Revenue Q/Q</span>
          <span className={`text-xs font-semibold ${revenueChange >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {revenueChange >= 0 ? '▲' : '▼'} {Math.abs(revenueChange).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
});
QuarterlySummaryRow.displayName = 'QuarterlySummaryRow';

// =====================================================
// PREMIUM FINANCIALS PRESENTATION HELPERS
// =====================================================

function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function ppChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  return current - previous;
}

const TrendChip = memo(({ label, value, kind = 'pct' }: { label: string; value: number | null; kind?: 'pct' | 'pp' }) => {
  const isPositive = value != null && value >= 0;
  return (
    <div className="flex items-center gap-ds-2 rounded-[8px] border border-white/[0.075] bg-white/[0.026] px-ds-4 py-ds-3">
      <span className="text-[12px] text-ink-tertiary">{label}</span>
      <span className={isPositive ? 'text-[13px] font-semibold text-[#52C878]' : 'text-[13px] font-semibold text-num-negative'}>
        {value == null ? 'N/A' : `${isPositive ? '△' : '▽'} ${Math.abs(value).toFixed(1)}${kind === 'pp' ? 'pp' : '%'}`}
      </span>
    </div>
  );
});
TrendChip.displayName = 'TrendChip';

const SectionMenu = memo(({ quarters }: { quarters: number }) => (
  <div className="ml-auto flex items-center gap-ds-3">
    <button
      type="button"
      className="flex items-center gap-ds-2 rounded-[8px] border border-white/[0.10] bg-white/[0.025] px-ds-3 py-ds-2 text-[12px] text-ink-primary transition-colors hover:bg-white/[0.045]"
    >
      {quarters} Quarters
      <ChevronDown className="h-3.5 w-3.5 text-ink-tertiary" aria-hidden="true" />
    </button>
    <button type="button" className="rounded-[8px] p-ds-2 text-ink-tertiary transition-colors hover:bg-white/[0.04] hover:text-ink-primary">
      <MoreVertical className="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
));
SectionMenu.displayName = 'SectionMenu';

const FinancialSectionHeader = memo(({
  icon: Icon,
  title,
  subtitle,
  quarters,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  quarters: number;
}) => (
  <div className="mb-ds-6 flex flex-wrap items-start gap-ds-4">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-gold-border/70 bg-gold-primary/[0.045]">
      <Icon className="h-6 w-6 text-gold-primary" />
    </div>
    <div className="min-w-0">
      <h3 className="text-[20px] font-semibold leading-tight text-ink-primary">{title}</h3>
      <p className="mt-1 text-[13px] text-ink-tertiary">{subtitle}</p>
    </div>
    <SectionMenu quarters={quarters} />
  </div>
));
FinancialSectionHeader.displayName = 'FinancialSectionHeader';

const MiniSparkline = memo(({ values, color = C.gold }: { values: Array<number | null>; color?: string }) => {
  const clean = values.filter((v): v is number => v != null && isFinite(v));
  if (clean.length < 2) return <div className="h-9" />;
  const W = 116, H = 40, pad = 4;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => v == null ? null : ({
      x: pad + (i / Math.max(1, values.length - 1)) * (W - pad * 2),
      y: H - pad - ((v - min) / span) * (H - pad * 2),
    }))
    .filter((p): p is { x: number; y: number } => p != null);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-full">
      <path d={buildSmooth(pts)} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      <path d={`${buildSmooth(pts)} L${pts[pts.length - 1].x},${H - pad} L${pts[0].x},${H - pad} Z`} fill={color} opacity="0.06" />
    </svg>
  );
});
MiniSparkline.displayName = 'MiniSparkline';

const TrendPanel = memo(({
  title,
  dotColor,
  summary,
  children,
}: {
  title: string;
  dotColor: string;
  summary: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="grid grid-cols-1 overflow-hidden rounded-[12px] border border-white/[0.075] bg-white/[0.018] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] lg:grid-cols-[220px_minmax(0,1fr)]">
    <aside className="border-b border-white/[0.07] p-ds-5 lg:border-b-0 lg:border-r">
      <div className="mb-ds-5 flex items-center gap-ds-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
        <h4 className="text-[15px] font-medium text-ink-primary">{title}</h4>
      </div>
      {summary}
    </aside>
    <div className="min-w-0 p-ds-4 md:p-ds-5">
      {children}
    </div>
  </div>
));
TrendPanel.displayName = 'TrendPanel';

const SummaryMetric = memo(({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="mb-ds-5 last:mb-0">
    <p className="mb-1 text-[12px] text-ink-tertiary">{label}</p>
    <p className="font-mono text-[22px] font-medium leading-tight tabular-nums" style={{ color: color || 'var(--text-primary)' }}>{value}</p>
    {sub && <p className="mt-1 text-[11px] text-ink-tertiary">{sub}</p>}
  </div>
));
SummaryMetric.displayName = 'SummaryMetric';

const CashFlowMetricPanel = memo(({
  label,
  value,
  color,
  growth,
  sparkValues,
}: {
  label: string;
  value: string;
  color: string;
  growth: number | null;
  sparkValues: Array<number | null>;
}) => (
  <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.022] p-ds-5">
    <div className="mb-ds-3 flex items-start justify-between gap-ds-3">
      <div>
        <p className="mb-ds-2 text-[11px] uppercase text-ink-tertiary" style={{ letterSpacing: '0.14em' }}>{label}</p>
        <p className="font-mono text-[24px] font-medium tabular-nums" style={{ color }}>{value}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] text-ink-tertiary">YoY Growth</p>
        <p className={growth != null && growth >= 0 ? 'text-[13px] font-semibold text-[#52C878]' : 'text-[13px] font-semibold text-num-negative'}>
          {growth == null ? 'N/A' : `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}
        </p>
      </div>
    </div>
    <MiniSparkline values={sparkValues} color={color} />
  </div>
));
CashFlowMetricPanel.displayName = 'CashFlowMetricPanel';

// =====================================================
// PREMIUM PROFITABILITY ANALYSIS
// =====================================================

function fmtProfitPctValue(value: number | null | undefined): string {
  return isValid(value) ? `${value!.toFixed(1)}%` : 'N/A';
}

function derivedPct(a: number | null | undefined, b: number | null | undefined): number | null {
  if (!isValid(a) || !isValid(b)) return null;
  return a! - b!;
}

const ProfitSparkline = memo(({ values, color }: { values: Array<number | null | undefined>; color: string }) => {
  const clean = values.filter((v): v is number => v != null && isFinite(v));
  if (clean.length < 2) return <div className="mt-ds-3 h-[42px] rounded-[8px] bg-white/[0.015]" />;

  const W = 220;
  const H = 42;
  const pad = 4;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => v == null || !isFinite(v) ? null : ({
      x: pad + (i / Math.max(1, values.length - 1)) * (W - pad * 2),
      y: H - pad - ((v - min) / span) * (H - pad * 2),
    }))
    .filter((p): p is { x: number; y: number } => p != null);
  const d = buildSmooth(pts);
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-ds-3 h-[42px] w-full overflow-visible" preserveAspectRatio="none">
      <path d={`${d} L${last.x},${H - pad} L${pts[0].x},${H - pad} Z`} fill={color} opacity="0.10" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.88" />
      <circle cx={last.x} cy={last.y} r="2.6" fill={color} opacity="0.95" />
      <circle cx={last.x} cy={last.y} r="8" fill={color} opacity="0.12" />
    </svg>
  );
});
ProfitSparkline.displayName = 'ProfitSparkline';

const ProfitMetricCard = memo(({
  label,
  value,
  color,
  values,
}: {
  label: string;
  value: number | null | undefined;
  color: string;
  values: Array<number | null | undefined>;
}) => (
  <div className="group relative overflow-hidden rounded-[12px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.016)_58%,rgba(0,0,0,0.18))] p-ds-5 shadow-[0_18px_48px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.055)] transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.04]">
    <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
    <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full opacity-0 blur-3xl transition duration-500 group-hover:opacity-35" style={{ backgroundColor: color }} />
    <p className="text-[12px] font-semibold uppercase text-gold-primary" style={{ letterSpacing: '0.12em' }}>{label}</p>
    <p className="mt-ds-3 font-mono text-[34px] font-medium leading-none text-ink-primary tabular-nums">{fmtProfitPctValue(value)}</p>
    <ProfitSparkline values={values} color={color} />
  </div>
));
ProfitMetricCard.displayName = 'ProfitMetricCard';

const ProfitFlowNode = memo(({
  label,
  value,
  color,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: number | null | undefined;
  color: string;
  icon: ComponentType<{ className?: string }>;
  tone?: 'primary' | 'muted' | 'purple';
}) => (
  <div
    className={[
      'relative z-10 min-h-[142px] rounded-[12px] border bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.024)_62%,rgba(0,0,0,0.20))] p-ds-5',
      'shadow-[0_22px_56px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.06)]',
      tone === 'primary' ? 'border-white/[0.10]' : 'border-white/[0.075]',
    ].join(' ')}
    style={{ borderRightColor: `${color}80`, boxShadow: `0 22px 56px rgba(0,0,0,0.32), inset -5px 0 0 ${color}AA, inset 0 1px 0 rgba(255,255,255,0.06)` }}
  >
    <p className="text-[12px] font-semibold uppercase text-ink-tertiary" style={{ letterSpacing: '0.12em' }}>{label}</p>
    <p className="mt-ds-3 font-mono text-[29px] font-medium leading-none tabular-nums" style={{ color }}>
      {fmtProfitPctValue(value)}
    </p>
    <p className="mt-ds-3 text-[13px] text-ink-tertiary">of Revenue</p>
    <Icon className="absolute bottom-ds-5 right-ds-5 h-5 w-5 opacity-45" style={{ color }} aria-hidden="true" />
  </div>
));
ProfitFlowNode.displayName = 'ProfitFlowNode';

const ProfitFlowRibbon = memo(({ className, color, variant = 'solid' }: { className: string; color: string; variant?: 'solid' | 'fade' }) => (
  <div
    className={`pointer-events-none absolute hidden rounded-full blur-[0.2px] lg:block ${className}`}
    style={{
      background: variant === 'solid'
        ? `linear-gradient(90deg, ${color}12, ${color}52, ${color}18)`
        : `linear-gradient(90deg, rgba(255,255,255,0.04), ${color}25, rgba(255,255,255,0.03))`,
      boxShadow: `0 0 32px ${color}16`,
    }}
  />
));
ProfitFlowRibbon.displayName = 'ProfitFlowRibbon';

const ProfitFlowDiagram = memo(({
  grossMargin,
  operatingMargin,
  netMargin,
  fcfYield,
}: {
  grossMargin: number | null | undefined;
  operatingMargin: number | null | undefined;
  netMargin: number | null | undefined;
  fcfYield: number | null | undefined;
}) => {
  const cogs = isValid(grossMargin) ? 100 - grossMargin! : null;
  const operatingExpenses = derivedPct(grossMargin, operatingMargin);
  const taxesOther = derivedPct(operatingMargin, netMargin);
  const nonCashItems = derivedPct(netMargin, fcfYield);

  return (
    <div className="relative overflow-hidden rounded-[12px] border border-white/[0.07] bg-[radial-gradient(circle_at_28%_18%,rgba(201,166,70,0.08),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.032),rgba(255,255,255,0.014)_60%,rgba(0,0,0,0.20))] p-ds-5 md:p-ds-6">
      <div className="mb-ds-8 flex items-start justify-between gap-ds-4">
        <div>
          <div className="flex items-center gap-ds-2">
            <h4 className="text-[20px] font-semibold leading-tight text-ink-primary">Revenue to Profit Flow</h4>
            <Info className="h-4 w-4 text-ink-tertiary" aria-hidden="true" />
          </div>
          <p className="mt-1 text-[14px] text-ink-tertiary">How revenue is converted into profit</p>
        </div>
      </div>

      <div className="relative min-h-[430px]">
        <ProfitFlowRibbon className="left-[12%] top-[138px] h-24 w-[24%]" color={C.blue} />
        <ProfitFlowRibbon className="left-[29%] top-[132px] h-24 w-[26%]" color={C.green} />
        <ProfitFlowRibbon className="left-[49%] top-[132px] h-24 w-[25%]" color={C.gold} />
        <ProfitFlowRibbon className="left-[68%] top-[132px] h-24 w-[21%]" color="#A78BFA" variant="fade" />
        <ProfitFlowRibbon className="left-[12%] top-[252px] h-24 w-[24%]" color="#9CA3AF" variant="fade" />
        <ProfitFlowRibbon className="left-[49%] top-[252px] h-24 w-[25%]" color="#9CA3AF" variant="fade" />
        <ProfitFlowRibbon className="left-[68%] top-[252px] h-24 w-[21%]" color="#9CA3AF" variant="fade" />

        <div className="grid grid-cols-1 gap-ds-4 lg:grid-cols-[1.16fr_1fr_1fr_1fr_0.98fr] lg:grid-rows-2 lg:gap-x-ds-7 lg:gap-y-ds-7">
          <div className="lg:row-span-2 lg:flex lg:items-center">
            <div className="w-full">
              <ProfitFlowNode label="Revenue" value={100} color={C.blue} icon={LineChart} tone="primary" />
            </div>
          </div>

          <ProfitFlowNode label="Gross Profit" value={grossMargin} color={C.green} icon={Database} />
          <ProfitFlowNode label="Operating Income" value={operatingMargin} color="#F59E0B" icon={Cog} />
          <ProfitFlowNode label="Net Profit" value={netMargin} color={C.gold} icon={LineChart} />
          <ProfitFlowNode label="FCF" value={fcfYield} color="#A78BFA" icon={Target} tone="purple" />

          <ProfitFlowNode label="Cost of Goods Sold" value={cogs} color="#A7ADB7" icon={ArrowDown} tone="muted" />
          <ProfitFlowNode label="Operating Expenses" value={operatingExpenses} color={C.gold} icon={ArrowDown} tone="muted" />
          <ProfitFlowNode label="Taxes & Other" value={taxesOther} color="#A7ADB7" icon={ArrowDown} tone="muted" />
          <ProfitFlowNode label="Non-Cash Items" value={nonCashItems} color="#A7ADB7" icon={FileText} tone="muted" />
        </div>
      </div>
    </div>
  );
});
ProfitFlowDiagram.displayName = 'ProfitFlowDiagram';

const ProfitabilityInsight = memo(({
  grossMargin,
  operatingMargin,
  netMargin,
  fcfYield,
}: {
  grossMargin: number | null | undefined;
  operatingMargin: number | null | undefined;
  netMargin: number | null | undefined;
  fcfYield: number | null | undefined;
}) => {
  const fcfText = isValid(fcfYield) && fcfYield! < 0
    ? 'FCF is negative due to higher capital investments and working capital changes.'
    : 'FCF remains positive, supporting cash conversion and balance sheet flexibility.';

  return (
    <div className="flex flex-col gap-ds-4 rounded-[12px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(255,255,255,0.035),rgba(255,255,255,0.016)_68%,rgba(201,166,70,0.018))] p-ds-5 shadow-[0_18px_44px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)] sm:flex-row sm:items-center">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold-border/70 bg-gold-primary/[0.09] shadow-[0_0_34px_rgba(201,166,70,0.16)]">
        <Sparkles className="h-6 w-6 text-gold-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h4 className="text-[16px] font-semibold text-gold-primary">Key Insight</h4>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-secondary">
          {fmtProfitPctValue(grossMargin)} of revenue is converted to gross profit, {fmtProfitPctValue(operatingMargin)} to operating income, and {fmtProfitPctValue(netMargin)} to net profit. {fcfText}
        </p>
      </div>
    </div>
  );
});
ProfitabilityInsight.displayName = 'ProfitabilityInsight';

// =====================================================
// FCF QUALITY ASSESSMENT
// =====================================================

const FCFQualityBadge = memo(({ data }: { data: QuarterlyData[] }) => {
  const withFCF = data.filter(q => q.freeCashFlow != null && q.netIncome != null);
  if (withFCF.length < 2) return null;

  const positiveQuarters = withFCF.filter(q => q.freeCashFlow! > 0).length;
  const ratio = positiveQuarters / withFCF.length;

  // Check if FCF > Net Income consistently (high quality earnings)
  const fcfAboveNI = withFCF.filter(q => q.freeCashFlow! > q.netIncome!).length;
  const fcfQualityRatio = fcfAboveNI / withFCF.length;

  let quality: string;
  let color: string;
  let description: string;

  if (ratio >= 0.85 && fcfQualityRatio >= 0.5) {
    quality = 'Excellent';
    color = C.green;
    description = 'Consistently converts earnings into cash';
  } else if (ratio >= 0.7) {
    quality = 'Good';
    color = C.green;
    description = 'Solid cash generation in most quarters';
  } else if (ratio >= 0.5) {
    quality = 'Mixed';
    color = C.amber;
    description = 'Inconsistent cash flow patterns';
  } else {
    quality = 'Weak';
    color = C.red;
    description = 'Cash flow concerns — monitor closely';
  }

  return (
    <div className="flex items-center gap-3 mt-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium" style={{ color }}>FCF Quality: {quality}</span>
      </div>
      <span className="text-xs text-[#6B6B6B]">{description}</span>
    </div>
  );
});
FCFQualityBadge.displayName = 'FCFQualityBadge';

// =====================================================
// MAIN COMPONENT — FinancialsTab
// =====================================================

export const FinancialsTab = memo(({ data, prefetchedQuarterly }: { data: StockData; prefetchedQuarterly?: any }) => {
  const { data: quarterlyData, loading, error } = useQuarterlyData(data.ticker, prefetchedQuarterly);

  return (
    <StockTabErrorBoundary>
    <div className="space-y-6">
      {/* ====== Profitability Analysis ====== */}
      <Card>
        <div className="space-y-ds-6 p-ds-5 md:p-ds-6">
          <div className="flex items-center gap-ds-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border border-gold-border/70 bg-gold-primary/[0.055] shadow-[0_18px_44px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <BarChart3 className="h-7 w-7 text-gold-primary" aria-hidden="true" />
            </div>
            <h3 className="text-[26px] font-semibold leading-tight text-ink-primary md:text-[30px]">Profitability Analysis</h3>
          </div>

          <div className="grid grid-cols-1 gap-ds-5 md:grid-cols-2 xl:grid-cols-4">
            <ProfitMetricCard
              label="Gross Margin"
              value={data.grossMargin}
              color={C.gold}
              values={quarterlyData.length ? quarterlyData.map(q => q.grossMargin) : [data.grossMargin, data.grossMargin]}
            />
            <ProfitMetricCard
              label="Operating Margin"
              value={data.operatingMargin}
              color={C.gold}
              values={quarterlyData.length ? quarterlyData.map(q => q.operatingMargin) : [data.operatingMargin, data.operatingMargin]}
            />
            <ProfitMetricCard
              label="Net Margin"
              value={data.netMargin}
              color={C.gold}
              values={quarterlyData.length ? quarterlyData.map(q => q.netMargin) : [data.netMargin, data.netMargin]}
            />
            <ProfitMetricCard
              label="FCF Yield"
              value={data.fcfYield}
              color="#A78BFA"
              values={quarterlyData.length ? quarterlyData.map(q => q.freeCashFlow != null && q.revenue ? (q.freeCashFlow / q.revenue) * 100 : null) : [data.fcfYield, data.fcfYield]}
            />
          </div>

          {(isValid(data.grossMargin) || isValid(data.operatingMargin) || isValid(data.netMargin) || isValid(data.fcfYield)) && (
            <>
              <ProfitFlowDiagram
                grossMargin={data.grossMargin}
                operatingMargin={data.operatingMargin}
                netMargin={data.netMargin}
                fcfYield={data.fcfYield}
              />
              <ProfitabilityInsight
                grossMargin={data.grossMargin}
                operatingMargin={data.operatingMargin}
                netMargin={data.netMargin}
                fcfYield={data.fcfYield}
              />
            </>
          )}
        </div>
      </Card>

      {/* ====== Return on Capital (existing) ====== */}
      <Card>
        <div className="p-6">
          <SectionHeader icon={TrendingUp} title="Return on Capital" subtitle="Green zone = Good range for sector" />
          <div className="w-full overflow-hidden">
            <div className="grid w-full grid-cols-1 gap-ds-6 sm:grid-cols-3">
              <div className="min-w-0">
                <ROCCircle label="ROE" value={data.roe} benchmark={15} />
              </div>
              <div className="min-w-0">
                <ROCCircle label="ROA" value={data.roa} benchmark={8} />
              </div>
              <div className="min-w-0">
                <ROCCircle label="ROIC" value={data.roic} benchmark={12} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ====== Balance Sheet Strength (existing) ====== */}
      <Card>
        <div className="p-6">
          <SectionHeader icon={Shield} title="Balance Sheet Strength" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricBox label="Debt/Equity" value={isValid(data.debtToEquity) ? (data.debtToEquity! > 10 ? data.debtToEquity!.toFixed(0) + '%' : data.debtToEquity!.toFixed(2)) : 'N/A'}
              color={data.debtToEquity != null && data.debtToEquity < 1 ? 'text-[#22C55E]' : data.debtToEquity != null && data.debtToEquity > 2 ? 'text-[#EF4444]' : undefined} />
            <MetricBox label="Debt/Assets" value={isValid(data.debtToAssets) ? fmtPct(data.debtToAssets) : 'N/A'} />
            <MetricBox label="Current Ratio" value={isValid(data.currentRatio) ? data.currentRatio!.toFixed(2) + 'x' : 'N/A'}
              color={data.currentRatio != null && data.currentRatio > 1.5 ? 'text-[#22C55E]' : data.currentRatio != null && data.currentRatio < 1 ? 'text-[#EF4444]' : undefined} />
            <MetricBox label="Quick Ratio" value={isValid(data.quickRatio) ? data.quickRatio!.toFixed(2) + 'x' : 'N/A'} />
          </div>
        </div>
      </Card>

      {/* ====== NEW: Financial Trends ====== */}
      <Card>
        <div className="p-ds-5 md:p-ds-6">
          <FinancialSectionHeader
            icon={Activity}
            title="Financial Trends"
            subtitle={quarterlyData.length > 0 ? `${quarterlyData.length} quarters · ${quarterlyData[0]?.quarter} → ${quarterlyData[quarterlyData.length - 1]?.quarter}` : 'Quarterly performance trends'}
            quarters={quarterlyData.length || 0}
          />

          {loading && (
            <div className="space-y-6">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <AlertTriangle size={16} className="text-[#EF4444]" />
              <span className="text-sm text-[#EF4444]">{error}</span>
            </div>
          )}

          {!loading && !error && quarterlyData.length >= 2 && (
            <div className="space-y-ds-5">
              {(() => {
                const latest = quarterlyData[quarterlyData.length - 1];
                const prev = quarterlyData[quarterlyData.length - 2];
                const yoyBase = quarterlyData.length >= 5 ? quarterlyData[quarterlyData.length - 5] : null;
                const revenueQoq = pctChange(latest.revenue, prev.revenue);
                const revenueYoy = pctChange(latest.revenue, yoyBase?.revenue ?? null);
                const grossPp = ppChange(latest.grossMargin, prev.grossMargin);
                const opPp = ppChange(latest.operatingMargin, prev.operatingMargin);
                const netPp = ppChange(latest.netMargin, prev.netMargin);
                const epsYoy = pctChange(latest.eps, yoyBase?.eps ?? null);

                return (
                  <>
                    <div className="flex flex-wrap gap-ds-3">
                      <TrendChip label="Gross Margin" value={grossPp} kind="pp" />
                      <TrendChip label="Op. Margin" value={opPp} kind="pp" />
                      <TrendChip label="Net Margin" value={netPp} kind="pp" />
                      <TrendChip label="Revenue QoQ" value={revenueQoq} />
                    </div>

                    <TrendPanel
                      title="Quarterly Revenue"
                      dotColor="#52C878"
                      summary={(
                        <div>
                          <SummaryMetric label="Latest Quarter" value={latest.revenue != null ? compactNum(latest.revenue) : 'N/A'} sub={latest.quarter} />
                          <SummaryMetric label="YoY Growth" value={revenueYoy != null ? `${revenueYoy >= 0 ? '+' : ''}${revenueYoy.toFixed(1)}%` : 'N/A'} color={revenueYoy != null && revenueYoy >= 0 ? '#52C878' : C.red} />
                          <SummaryMetric label="QoQ Growth" value={revenueQoq != null ? `${revenueQoq >= 0 ? '+' : ''}${revenueQoq.toFixed(1)}%` : 'N/A'} color={revenueQoq != null && revenueQoq >= 0 ? '#52C878' : C.red} />
                          <MiniSparkline values={quarterlyData.map(q => q.revenue)} color={C.gold} />
                        </div>
                      )}
                    >
                      <div className="min-w-0 overflow-hidden">
                        <RevenueBarChart data={quarterlyData} />
                      </div>
                    </TrendPanel>

                    <TrendPanel
                      title="Margin Evolution"
                      dotColor={C.gold}
                      summary={(
                        <div>
                          <SummaryMetric label="Gross Margin" value={latest.grossMargin != null ? `${latest.grossMargin.toFixed(1)}%` : 'N/A'} color="#52C878" />
                          <SummaryMetric label="Operating Margin" value={latest.operatingMargin != null ? `${latest.operatingMargin.toFixed(1)}%` : 'N/A'} color={C.amber} />
                          <SummaryMetric label="Net Margin" value={latest.netMargin != null ? `${latest.netMargin.toFixed(1)}%` : 'N/A'} color="#F59E0B" />
                        </div>
                      )}
                    >
                      <div className="min-w-0 overflow-hidden">
                        <MarginTrendChart data={quarterlyData} />
                        <ChartLegend items={[
                          { color: C.green, label: 'Gross Margin' },
                          { color: C.amber, label: 'Operating Margin' },
                          { color: C.gold, label: 'Net Margin' },
                        ]} />
                      </div>
                    </TrendPanel>

                    {quarterlyData.some(q => q.eps != null) && (
                      <TrendPanel
                        title="Earnings Per Share (EPS)"
                        dotColor={C.gold}
                        summary={(
                          <div>
                            <SummaryMetric label="Latest Quarter" value={latest.eps != null ? `$${latest.eps.toFixed(2)}` : 'N/A'} sub={latest.quarter} />
                            <SummaryMetric label="YoY Growth" value={epsYoy != null ? `${epsYoy >= 0 ? '+' : ''}${epsYoy.toFixed(1)}%` : 'N/A'} color={epsYoy != null && epsYoy >= 0 ? '#52C878' : C.red} />
                            <MiniSparkline values={quarterlyData.map(q => q.eps)} color={C.gold} />
                          </div>
                        )}
                      >
                        <div className="min-w-0 overflow-hidden">
                          <EPSTrendChart data={quarterlyData} />
                        </div>
                      </TrendPanel>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {!loading && !error && quarterlyData.length < 2 && (
            <p className="text-sm text-[#6B6B6B] py-8 text-center">
              Quarterly trend data not available for this ticker
            </p>
          )}
        </div>
      </Card>

      {/* ====== NEW: Cash Flow Statement ====== */}
      <Card>
        <div className="p-ds-5 md:p-ds-6">
          <FinancialSectionHeader
            icon={DollarSign}
            title="Cash Flow Analysis"
            subtitle="Quarterly operating cash flow, capital expenditures & free cash flow"
            quarters={quarterlyData.length || 0}
          />

          {loading && <ChartSkeleton />}

          {!loading && !error && quarterlyData.length >= 2 && (
            <div className="space-y-ds-4">
              {(() => {
                const latest = quarterlyData[quarterlyData.length - 1];
                const yoyBase = quarterlyData.length >= 5 ? quarterlyData[quarterlyData.length - 5] : null;
                return (
                  <div className="grid grid-cols-1 gap-ds-4 lg:grid-cols-3">
                    <CashFlowMetricPanel
                      label="Operating Cash Flow"
                      value={latest.operatingCashFlow != null ? compactNum(latest.operatingCashFlow) : 'N/A'}
                      color={C.blue}
                      growth={pctChange(latest.operatingCashFlow, yoyBase?.operatingCashFlow ?? null)}
                      sparkValues={quarterlyData.map(q => q.operatingCashFlow)}
                    />
                    <CashFlowMetricPanel
                      label="Capital Expenditures"
                      value={latest.capex != null ? compactNum(Math.abs(latest.capex)) : 'N/A'}
                      color={C.red}
                      growth={pctChange(latest.capex, yoyBase?.capex ?? null)}
                      sparkValues={quarterlyData.map(q => q.capex)}
                    />
                    <CashFlowMetricPanel
                      label="Free Cash Flow"
                      value={latest.freeCashFlow != null ? compactNum(latest.freeCashFlow) : 'N/A'}
                      color={C.green}
                      growth={pctChange(latest.freeCashFlow, yoyBase?.freeCashFlow ?? null)}
                      sparkValues={quarterlyData.map(q => q.freeCashFlow)}
                    />
                  </div>
                );
              })()}

              <div className="overflow-hidden rounded-[12px] border border-white/[0.075] bg-white/[0.018] p-ds-4 md:p-ds-5">
                <CashFlowChart data={quarterlyData} />
              </div>

              <FCFQualityBadge data={quarterlyData} />
            </div>
          )}

          {!loading && !error && quarterlyData.length < 2 && (
            <p className="text-sm text-[#6B6B6B] py-8 text-center">
              Cash flow data not available for this ticker
            </p>
          )}
        </div>
      </Card>

    </div>
    </StockTabErrorBoundary>
  );
});

FinancialsTab.displayName = 'FinancialsTab';
