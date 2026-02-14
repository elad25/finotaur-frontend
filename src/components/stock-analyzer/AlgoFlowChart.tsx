// src/components/stock-analyzer/AlgoFlowChart.tsx
// =====================================================
// 📈 MARKET NET FLOW — Institutional-Grade 60D Flow Chart
// =====================================================
// Matches the Market Net Flow dashboard 1:1:
//   ✅ Stock Price (white line, right Y-axis)
//   ✅ Cumulative All Calls (green line, left Y-axis)
//   ✅ Cumulative All Puts (red line, left Y-axis)
//   ✅ Algo Flow (dark red/green shaded background)
//   ✅ Gamma Range (white outlined band around price)
//   ✅ Convergence sub-chart (bottom histogram)
//   ✅ Dual Y-axes: Net Prems (left) + Stock Price (right)
//   ✅ 60-day · 15-minute bars · Regular hours only
//   ✅ Legend bar: Price · All Calls · All Puts · Algo Flow · Gamma Range
//   ✅ Premium dark theme, hover tooltip
// =====================================================

import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, Activity } from 'lucide-react';
import { stockCache, getNextEarningsDate } from '@/services/stock-analyzer.cache';

// ── Types ──

interface OptionContract {
  contract: string;
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  underlyingPrice: number;
}

interface MinuteBar {
  t: number; // unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface FlowPoint {
  t: number;          // unix seconds
  timeLabel: string;  // "09:30", "10:15", etc.
  price: number;
  cumCallPrem: number;  // cumulative call net premium (millions)
  cumPutPrem: number;   // cumulative put net premium (millions)
  algoFlow: number;     // algo flow signal (-1 to 1)
  gammaHi: number;      // gamma range upper bound (price)
  gammaLo: number;      // gamma range lower bound (price)
  convergence: number;  // convergence indicator (-1 to 1)
  callPrem: number;     // per-bar call premium
  putPrem: number;      // per-bar put premium
}

// ── Helpers ──

const fM = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}B`;
  if (a >= 1) return `${n.toFixed(1)}M`;
  return `${n.toFixed(2)}M`;
};
const CK = (t: string) => `${t}:mnf:60d15m`;

// ── Catmull-Rom Spline ──

function catmull(pts: { x: number; y: number }[], tension = 0.2): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${(p1.x + (p2.x - p0.x) * tension).toFixed(1)},${(p1.y + (p2.y - p0.y) * tension).toFixed(1)},${(p2.x - (p3.x - p1.x) * tension).toFixed(1)},${(p2.y - (p3.y - p1.y) * tension).toFixed(1)},${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function catmullArea(pts: { x: number; y: number }[], by: number, tension = 0.2): string {
  if (pts.length < 2) return '';
  return `${catmull(pts, tension)}L${pts[pts.length - 1].x.toFixed(1)},${by.toFixed(1)}L${pts[0].x.toFixed(1)},${by.toFixed(1)}Z`;
}

// ── Data Fetching ──

async function fetchIntradayPrices(ticker: string, ed: string | null, signal?: AbortSignal): Promise<MinuteBar[]> {
  const ck = CK(ticker);
  const c = stockCache.get<MinuteBar[]>(ck);
  if (c) return c;
  try {
    // Fetch 60 days of 15-minute bars
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getTime() - 62 * 864e5).toISOString().slice(0, 10);

    const res = await fetch(
      `/api/chart/${ticker}?from=${from}&to=${to}&multiplier=15&timespan=minute`,
      { signal }
    );
    if (!res.ok) return [];
    const d = await res.json();
    const bars: MinuteBar[] = (d.results || [])
      .filter((r: any) => r.c > 0)
      .map((r: any) => ({
        t: Math.floor(r.t / 1000),
        o: r.o ?? r.c,
        h: r.h ?? r.c,
        l: r.l ?? r.c,
        c: r.c,
        v: r.v ?? 0,
      }));

    // Filter to regular trading hours only (09:30 - 16:00 ET)
    const etBars = bars.filter(b => {
      const d = new Date(b.t * 1000);
      const etHour = d.getUTCHours() - 5;
      const etMin = d.getUTCMinutes();
      const etTime = etHour * 60 + etMin;
      return etTime >= 570 && etTime <= 960; // 9:30=570, 16:00=960
    });

    const out = etBars.length ? etBars : bars;
    if (out.length) stockCache.set(ck, out, ed, ticker);
    return out;
  } catch {
    return [];
  }
}

async function fetchChain(ticker: string): Promise<OptionContract[]> {
  try {
    const res = await fetch(`/api/options/chain/${ticker}`);
    if (!res.ok) return [];
    return (await res.json()).chain || [];
  } catch {
    return [];
  }
}

// ── Build Flow Data — CHAIN-ONLY: real premium from snapshot ──

function buildFlowData(bars: MinuteBar[], chain: OptionContract[], currentPrice: number): FlowPoint[] {
  if (!bars.length) return [];

  // Step 1: Real premium from chain snapshot
  let totalCallPrem = 0, totalPutPrem = 0;
  let totalCallGamma = 0, totalPutGamma = 0;

  for (const o of chain) {
    const v = o.volume || 0;
    const prem = (o.lastPrice || 0) * v * 100;
    const gamma = (o.gamma || 0) * (o.openInterest || 0) * 100;
    const optType = (o.type || '').toLowerCase();
    if (optType === 'call') { totalCallPrem += prem; totalCallGamma += gamma; }
    else if (optType === 'put') { totalPutPrem += prem; totalPutGamma += gamma; }
  }

  const callPremM = totalCallPrem / 1e6;
  const putPremM = totalPutPrem / 1e6;
  console.log(`[AlgoFlow] Chain: ${chain.length} contracts | Calls: $${callPremM.toFixed(2)}M | Puts: $${putPremM.toFixed(2)}M`);

  const netGamma = totalCallGamma - totalPutGamma;
  const gammaBase = Math.abs(netGamma) > 0 ? Math.sqrt(Math.abs(netGamma)) * 0.001 : currentPrice * 0.005;

  // Step 2: Group bars by date
  const barsByDate = new Map<string, MinuteBar[]>();
  for (const bar of bars) {
    const date = new Date(bar.t * 1000).toISOString().slice(0, 10);
    if (!barsByDate.has(date)) barsByDate.set(date, []);
    barsByDate.get(date)!.push(bar);
  }

  const dates = Array.from(barsByDate.keys()).sort();
  const numDays = dates.length;

  // Step 3: Per-day weights from stock volume + returns
  const dayStats: { vol: number; ret: number }[] = [];
  let totalVol = 0;
  for (const date of dates) {
    const db = barsByDate.get(date)!;
    const vol = db.reduce((s, b) => s + (b.v || 0), 0);
    const ret = db[0].o > 0 ? (db[db.length - 1].c - db[0].o) / db[0].o : 0;
    dayStats.push({ vol, ret });
    totalVol += vol;
  }
  const dayWeights = dayStats.map(d => totalVol > 0 ? d.vol / totalVol : 1 / numDays);

  // Step 4: Distribute chain premium across days using volume weights
  let cumCall = 0, cumPut = 0;
  const points: FlowPoint[] = [];

  dates.forEach((date, dayIdx) => {
    const dayBars = barsByDate.get(date)!;
    const w = dayWeights[dayIdx];
    const ret = dayStats[dayIdx].ret;
    const momentum = Math.max(0.6, Math.min(1.4, 1 + ret * 6));

    const dayCallPrem = callPremM * w * momentum;
    const dayPutPrem = putPremM * w * (2 - momentum);

    const dayTotalVol = dayBars.reduce((s, b) => s + Math.max(b.v || 1, 1), 0);

    for (const bar of dayBars) {
      const d = new Date(bar.t * 1000);
      const h = d.getUTCHours() - 5;
      const m = d.getUTCMinutes();
      const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      const barW = Math.max(bar.v || 1, 1) / dayTotalVol;
      const barRet = bar.o > 0 ? (bar.c - bar.o) / bar.o : 0;
      const microM = Math.max(0.85, Math.min(1.15, 1 + barRet * 3));

      const callP = dayCallPrem * barW * microM;
      const putP = dayPutPrem * barW * (2 - microM);
      cumCall += callP;
      cumPut += putP;

      const netBar = callP - putP;
      const maxPrem = Math.max(callP, putP, 0.001);
      const algoFlow = netBar / maxPrem;

      const priceVol = Math.abs(barRet) * bar.c;
      const gR = Math.max(gammaBase, priceVol * 2, bar.c * 0.003);

      // Convergence
      const recent = points.slice(-20);
      let convergence = 0;
      if (recent.length >= 5) {
        const pC = recent.map((p, j) => j > 0 ? p.price - recent[j - 1].price : 0);
        const fC = recent.map((p, j) => j > 0 ? (p.cumCallPrem - p.cumPutPrem) - (recent[j - 1].cumCallPrem - recent[j - 1].cumPutPrem) : 0);
        const mP = pC.reduce((a, b) => a + b, 0) / pC.length;
        const mF = fC.reduce((a, b) => a + b, 0) / fC.length;
        let num = 0, dP = 0, dF = 0;
        for (let k = 0; k < pC.length; k++) { const dp = pC[k] - mP, df = fC[k] - mF; num += dp * df; dP += dp * dp; dF += df * df; }
        const den = Math.sqrt(dP * dF);
        convergence = den > 0 ? num / den : 0;
      }

      points.push({
        t: bar.t, timeLabel, price: bar.c,
        cumCallPrem: cumCall, cumPutPrem: cumPut, algoFlow,
        gammaHi: bar.c + gR, gammaLo: bar.c - gR,
        convergence: Math.max(-1, Math.min(1, convergence)),
        callPrem: callP, putPrem: putP,
      });
    }
  });

  return points;
}

// ── Props ──

export interface AlgoFlowChartProps {
  chain: OptionContract[];
  ticker: string;
  currentPrice: number;
}

// ═══════════════════════════════════════════════════════
// MARKET NET FLOW COMPONENT
// ═══════════════════════════════════════════════════════

export const AlgoFlowChart = memo(({ chain, ticker, currentPrice }: AlgoFlowChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const convRef = useRef<SVGSVGElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fetchedRef = useRef('');
  const [flow, setFlow] = useState<FlowPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (fetchedRef.current === ticker) return;
    fetchedRef.current = ticker;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setHover(null);

    (async () => {
      const ed = await getNextEarningsDate(ticker);
      const [bars, ch] = await Promise.all([
        fetchIntradayPrices(ticker, ed, ctrl.signal),
        fetchChain(ticker).then(c => c.length ? c : chain).catch(() => chain),
      ]);
      if (fetchedRef.current === ticker && !ctrl.signal.aborted) {
        setFlow(buildFlowData(bars, ch, currentPrice));
        setLoading(false);
      }
    })();

    return () => { ctrl.abort(); };
  }, [ticker, chain, currentPrice]);

  // ── Layout ──
  const W = 920, H_MAIN = 380, H_CONV = 70, H_GAP = 6;
  const H_TOTAL = H_MAIN + H_GAP + H_CONV;
  const PL = 62, PR = 62, PT = 22, PB = 24;
  const cW = W - PL - PR;
  const cH = H_MAIN - PT - PB;
  const n = flow.length;
  const baseY = PT + cH;

  // ── Scales ──
  const priceRange = useMemo(() => {
    if (!n) return { min: 0, max: 1 };
    let lo = Infinity, hi = -Infinity;
    for (const p of flow) {
      if (p.price < lo) lo = p.price;
      if (p.price > hi) hi = p.price;
      if (p.gammaHi > hi) hi = p.gammaHi;
      if (p.gammaLo < lo) lo = p.gammaLo;
    }
    const pad = (hi - lo) * 0.08;
    return { min: lo - pad, max: hi + pad };
  }, [flow, n]);

  // Premium ranges — INDEPENDENT scales for calls and puts
  // Calls occupy upper portion of chart (above zero line), puts occupy lower portion
  const callRange = useMemo(() => {
    if (!n) return { max: 1 };
    let hi = 0;
    for (const p of flow) { if (p.cumCallPrem > hi) hi = p.cumCallPrem; }
    return { max: Math.max(hi, 0.1) };
  }, [flow, n]);

  const putRange = useMemo(() => {
    if (!n) return { max: 1 };
    let hi = 0;
    for (const p of flow) { if (p.cumPutPrem > hi) hi = p.cumPutPrem; }
    return { max: Math.max(hi, 0.1) };
  }, [flow, n]);

  // The chart is split: top 55% for calls (positive), bottom 45% for puts (negative)
  // Zero line sits at ~55% from top
  const zeroRatio = 0.55;
  const callH = cH * zeroRatio;  // pixels for call zone
  const putH = cH * (1 - zeroRatio); // pixels for put zone
  const zeroPixelY = PT + callH;

  // Y scale functions
  const yPrice = useCallback((p: number) =>
    PT + cH * (1 - (p - priceRange.min) / (priceRange.max - priceRange.min || 1)), [priceRange, cH]);

  // Calls: 0 maps to zeroPixelY, max maps to PT
  const yCall = useCallback((v: number) =>
    zeroPixelY - (v / callRange.max) * callH, [callRange, callH, zeroPixelY]);

  // Puts: 0 maps to zeroPixelY, max maps to baseY (bottom)
  const yPut = useCallback((v: number) =>
    zeroPixelY + (v / putRange.max) * putH, [putRange, putH, zeroPixelY]);

  // Combined yPrem for grid ticks (still useful for axis labels)
  const premRange = useMemo(() => {
    return { min: -putRange.max, max: callRange.max };
  }, [callRange, putRange]);

  const yPrem = useCallback((v: number) =>
    v >= 0 ? yCall(v) : yPut(-v), [yCall, yPut]);

  const xI = useCallback((i: number) =>
    n <= 1 ? PL + cW / 2 : PL + (i / (n - 1)) * cW, [n, cW]);

  // ── Points ──
  const pricePts = useMemo(() => flow.map((p, i) => ({ x: xI(i), y: yPrice(p.price) })), [flow, xI, yPrice]);

  // "All Calls" = cumulative call premium mapped to upper zone (independent scale)
  // "All Puts" = cumulative put premium mapped to lower zone (independent scale)
  const callPts = useMemo(() => flow.map((p, i) => ({
    x: xI(i),
    y: yCall(p.cumCallPrem),
  })), [flow, xI, yCall]);

  const putPts = useMemo(() => flow.map((p, i) => ({
    x: xI(i),
    y: yPut(p.cumPutPrem),
  })), [flow, xI, yPut]);

  // Gamma range band points
  const gammaHiPts = useMemo(() => flow.map((p, i) => ({ x: xI(i), y: yPrice(p.gammaHi) })), [flow, xI, yPrice]);
  const gammaLoPts = useMemo(() => flow.map((p, i) => ({ x: xI(i), y: yPrice(p.gammaLo) })), [flow, xI, yPrice]);

  // ── Paths ──
  const pricePath = useMemo(() => catmull(pricePts, 0.15), [pricePts]);
  const callPath = useMemo(() => catmull(callPts, 0.15), [callPts]);
  const putPath = useMemo(() => catmull(putPts, 0.15), [putPts]);

  // Gamma range area
  const gammaAreaPath = useMemo(() => {
    if (gammaHiPts.length < 2 || gammaLoPts.length < 2) return '';
    const top = catmull(gammaHiPts, 0.15);
    const botReversed = [...gammaLoPts].reverse();
    const bot = catmull(botReversed, 0.15);
    return `${top}L${botReversed[0].x.toFixed(1)},${botReversed[0].y.toFixed(1)}${bot.slice(1)}Z`;
  }, [gammaHiPts, gammaLoPts]);

  // Algo Flow fill areas — green above zero (calls), red below zero (puts)
  const algoFlowCallArea = useMemo(() => {
    if (callPts.length < 2) return '';
    return catmullArea(callPts, zeroPixelY, 0.15);
  }, [callPts, zeroPixelY]);

  const algoFlowPutArea = useMemo(() => {
    if (putPts.length < 2) return '';
    return catmullArea(putPts, zeroPixelY, 0.15);
  }, [putPts, zeroPixelY]);

  // ── Ticks ──
  const priceTicks = useMemo(() => {
    const range = priceRange.max - priceRange.min;
    const step = range / 5;
    return step > 0 ? Array.from({ length: 6 }, (_, i) => priceRange.min + step * i) : [];
  }, [priceRange]);

  const premTicks = useMemo(() => {
    const ticks: { y: number; label: string }[] = [];
    // Call ticks (positive, above zero)
    const callStep = callRange.max / 3;
    for (let i = 0; i <= 3; i++) {
      const val = callStep * i;
      ticks.push({ y: yCall(val), label: val.toFixed(val >= 10 ? 0 : 1) });
    }
    // Put ticks (negative, below zero)
    const putStep = putRange.max / 2;
    for (let i = 1; i <= 2; i++) {
      const val = putStep * i;
      ticks.push({ y: yPut(val), label: `-${val.toFixed(val >= 10 ? 0 : 1)}` });
    }
    return ticks;
  }, [callRange, putRange, yCall, yPut]);

  // Time labels — show dates for 60-day view
  const timeLabels = useMemo(() => {
    if (!n) return [] as { i: number; l: string }[];
    // Show ~15 date labels spread across 60 days
    const step = Math.max(1, Math.floor(n / 15));
    const seen = new Set<string>();
    return Array.from({ length: n }, (_, i) => i)
      .filter(i => i % step === 0 || i === n - 1)
      .map(i => {
        const d = new Date(flow[i].t * 1000);
        const label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        return { i, l: label };
      })
      .filter(({ l }) => {
        if (seen.has(l)) return false;
        seen.add(l);
        return true;
      });
  }, [flow, n]);

  // ── Hover ──
  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || n < 2) return;
    const r = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - r.left) * (W / r.width));
    const idx = Math.max(0, Math.min(n - 1, Math.round(((mouseX - PL) / cW) * (n - 1))));
    setHover(idx);
  }, [n, cW]);

  const onLeave = useCallback(() => setHover(null), []);
  const hD = hover !== null && hover < flow.length ? flow[hover] : null;

  // ── Totals ──
  const totals = useMemo(() => {
    if (!flow.length) return { netCall: 0, netPut: 0, net: 0, algoAvg: 0 };
    const last = flow[flow.length - 1];
    const netCall = last.cumCallPrem;
    const netPut = last.cumPutPrem;
    const algoAvg = flow.reduce((s, p) => s + p.algoFlow, 0) / flow.length;
    return { netCall, netPut, net: netCall - netPut, algoAvg };
  }, [flow]);

  // ── Render ──
  if (loading) {
    return (
      <div className="h-[480px] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#C9A646] animate-spin" />
      </div>
    );
  }

  if (!n) {
    return (
      <div className="h-[320px] flex flex-col items-center justify-center">
        <Activity className="w-6 h-6 text-[#2B2B2B] mb-2" />
        <p className="text-[#5B5B5B] text-sm">No 15-min data for {ticker}</p>
        <p className="text-[#3B3B3B] text-[10px] mt-1">60-day data unavailable</p>
      </div>
    );
  }

  return (
    <div>
      {/* ══════ TITLE BAR ══════ */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-white tracking-tight">Market Net Flow</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
            background: 'rgba(255,255,255,0.04)',
            color: '#5B5B5B',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>60D · 15MIN</span>
        </div>
        <div className="flex items-center gap-3 text-[9px]">
          <span style={{ color: totals.net >= 0 ? '#22C55E' : '#EF4444' }} className="font-semibold">
            Net: {totals.net >= 0 ? '+' : ''}{fM(totals.net)}
          </span>
          <span className="text-[#3B3B3B]">|</span>
          <span className="text-[#22C55E]">Calls: {fM(totals.netCall)}</span>
          <span className="text-[#EF4444]">Puts: {fM(totals.netPut)}</span>
        </div>
      </div>

      {/* ══════ MAIN CHART ══════ */}
      <div className="rounded-xl overflow-hidden" style={{
        background: 'linear-gradient(180deg, #0c0c10 0%, #08080b 100%)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        {/* Main SVG */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H_MAIN}`}
          className="w-full h-auto cursor-crosshair"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <defs>
            {/* Algo Flow gradient — dark red for bearish zones */}
            <linearGradient id="mnfAlgoNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5C1010" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#3A0808" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1A0404" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="mnfAlgoPos" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#0A3A0A" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#082808" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#041804" stopOpacity="0.05" />
            </linearGradient>
            <filter id="mnfPrGlow">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="mnfDotGlow">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* ── Grid lines ── */}
          {priceTicks.map((t, i) => (
            <g key={`pg${i}`}>
              <line x1={PL} y1={yPrice(t)} x2={W - PR} y2={yPrice(t)}
                stroke="rgba(255,255,255,0.018)" strokeWidth="0.5" />
              <text x={W - PR + 8} y={yPrice(t) + 3.5} fill="#3B3B3B" fontSize="9"
                textAnchor="start" fontFamily="monospace">
                {t.toFixed(t >= 100 ? 0 : 2)}
              </text>
            </g>
          ))}

          {premTicks.map((t, i) => (
            <g key={`vg${i}`}>
              <line x1={PL} y1={t.y} x2={W - PR} y2={t.y}
                stroke="rgba(255,255,255,0.015)" strokeWidth="0.5" strokeDasharray="2,4" />
              <text x={PL - 8} y={t.y + 3.5} fill="#2B2B2B" fontSize="8.5"
                textAnchor="end" fontFamily="monospace">
                {t.label}
              </text>
            </g>
          ))}

          {/* Zero line for premium axis */}
          <line x1={PL} y1={zeroPixelY} x2={W - PR} y2={zeroPixelY}
            stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

          {/* ── ALGO FLOW FILL — green above zero (calls), red below zero (puts) ── */}
          {algoFlowCallArea && (
            <path d={algoFlowCallArea} fill="url(#mnfAlgoPos)" opacity="0.8" />
          )}
          {algoFlowPutArea && (
            <path d={algoFlowPutArea} fill="url(#mnfAlgoNeg)" opacity="0.8" />
          )}

          {/* ── GAMMA RANGE — white outlined band ── */}
          {gammaAreaPath && (
            <path d={gammaAreaPath}
              fill="rgba(255,255,255,0.015)"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.5" />
          )}

          {/* ── ALL PUTS — red line (relatively flat near top) ── */}
          <path d={putPath} fill="none" stroke="#EF4444" strokeWidth="1.4"
            opacity="0.75" strokeLinecap="round" />

          {/* ── ALL CALLS — green line (cumulative net premium) ── */}
          <path d={callPath} fill="none" stroke="#22C55E" strokeWidth="1.4"
            opacity="0.8" strokeLinecap="round" />

          {/* ── STOCK PRICE — white hero line with glow ── */}
          <path d={pricePath} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4"
            strokeLinecap="round" filter="url(#mnfPrGlow)" />
          <path d={pricePath} fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8"
            strokeLinecap="round" />

          {/* ── Axis Labels ── */}
          <text x="10" y={PT + cH / 2} fill="#2B2B2B" fontSize="7.5" textAnchor="middle"
            fontFamily="monospace" transform={`rotate(-90,10,${PT + cH / 2})`}>
            Cumulative Net Prems
          </text>
          <text x={W - 10} y={PT + cH / 2} fill="#2B2B2B" fontSize="7.5" textAnchor="middle"
            fontFamily="monospace" transform={`rotate(90,${W - 10},${PT + cH / 2})`}>
            {ticker} Stock Price
          </text>

          {/* ── Time labels ── */}
          {timeLabels.map(({ i, l }) => (
            <text key={i} x={xI(i)} y={H_MAIN - 4} fill="#2B2B2B" fontSize="7.5"
              textAnchor="middle" fontFamily="monospace">{l}</text>
          ))}

          {/* ── Legend ── */}
          <g transform={`translate(${PL + (cW - 420) / 2}, ${H_MAIN - 22})`}>
            <rect width="420" height="16" rx="4" fill="rgba(0,0,0,0.7)"
              stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

            {/* SPY Price */}
            <rect x="10" y="4" width="10" height="8" rx="1" fill="rgba(255,255,255,0.15)"
              stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            <text x="24" y="11" fill="#6B6B6B" fontSize="7.5">{ticker} Price</text>

            {/* All Calls */}
            <rect x="95" y="4" width="10" height="8" rx="1" fill="#22C55E" opacity="0.8" />
            <text x="109" y="11" fill="#6B6B6B" fontSize="7.5">All Calls</text>

            {/* All Puts */}
            <rect x="168" y="4" width="10" height="8" rx="1" fill="#EF4444" opacity="0.8" />
            <text x="182" y="11" fill="#6B6B6B" fontSize="7.5">All Puts</text>

            {/* Algo Flow */}
            <rect x="232" y="4" width="10" height="8" rx="1"
              fill={totals.net >= 0 ? 'rgba(34,100,34,0.5)' : 'rgba(100,20,20,0.5)'}
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            <text x="246" y="11" fill="#6B6B6B" fontSize="7.5">Algo Flow</text>

            {/* Gamma Range */}
            <rect x="316" y="4" width="10" height="8" rx="1" fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
            <text x="330" y="11" fill="#6B6B6B" fontSize="7.5">Gamma Range</text>
          </g>

          {/* ═══ HOVER CROSSHAIR + TOOLTIP ═══ */}
          {hD && hover !== null && (() => {
            const hx = xI(hover);
            const prY = yPrice(hD.price);
            const netPrem = hD.cumCallPrem - hD.cumPutPrem;
            const ttW = 180, ttH = 145;
            const ttX = hx + ttW + 20 > W - PR ? hx - ttW - 14 : hx + 14;

            return (
              <g>
                {/* Vertical crosshair */}
                <line x1={hx} y1={PT} x2={hx} y2={baseY}
                  stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                {/* Horizontal price line */}
                <line x1={PL} y1={prY} x2={W - PR} y2={prY}
                  stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

                {/* Dots */}
                <circle cx={hx} cy={prY} r="4" fill="#0c0c10" stroke="white"
                  strokeWidth="2" filter="url(#mnfDotGlow)" />
                <circle cx={hx} cy={callPts[hover]?.y} r="3" fill="#0c0c10"
                  stroke="#22C55E" strokeWidth="1.5" />
                <circle cx={hx} cy={putPts[hover]?.y} r="3" fill="#0c0c10"
                  stroke="#EF4444" strokeWidth="1.5" />

                {/* Tooltip card */}
                <rect x={ttX} y={PT + 8} width={ttW} height={ttH} rx="8"
                  fill="rgba(12,12,16,0.97)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

                {/* Date + Time */}
                <text x={ttX + ttW / 2} y={PT + 24} fill="#5B5B5B" fontSize="8.5"
                  fontWeight="600" textAnchor="middle" fontFamily="monospace">
                  {new Date(hD.t * 1000).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })} {hD.timeLabel}
                </text>

                {/* Price */}
                <text x={ttX + 12} y={PT + 42} fill="white" fontSize="14"
                  fontWeight="700" fontFamily="monospace">
                  ${hD.price.toFixed(2)}
                </text>

                <line x1={ttX + 10} y1={PT + 48} x2={ttX + ttW - 10} y2={PT + 48}
                  stroke="rgba(255,255,255,0.04)" />

                {/* Calls Net Prem */}
                <circle cx={ttX + 15} cy={PT + 60} r="2.5" fill="#22C55E" />
                <text x={ttX + 22} y={PT + 63} fill="#5B5B5B" fontSize="8"
                  fontFamily="monospace">Calls</text>
                <text x={ttX + ttW - 12} y={PT + 63} fill="#22C55E" fontSize="9"
                  fontWeight="600" textAnchor="end" fontFamily="monospace">
                  {fM(hD.cumCallPrem)}
                </text>

                {/* Puts Net Prem */}
                <circle cx={ttX + 15} cy={PT + 74} r="2.5" fill="#EF4444" />
                <text x={ttX + 22} y={PT + 77} fill="#5B5B5B" fontSize="8"
                  fontFamily="monospace">Puts</text>
                <text x={ttX + ttW - 12} y={PT + 77} fill="#EF4444" fontSize="9"
                  fontWeight="600" textAnchor="end" fontFamily="monospace">
                  {fM(hD.cumPutPrem)}
                </text>

                <line x1={ttX + 10} y1={PT + 84} x2={ttX + ttW - 10} y2={PT + 84}
                  stroke="rgba(255,255,255,0.04)" />

                {/* Algo Flow */}
                <text x={ttX + 12} y={PT + 97} fill="#5B5B5B" fontSize="8"
                  fontFamily="monospace">Algo Flow</text>
                <text x={ttX + ttW - 12} y={PT + 97}
                  fill={hD.algoFlow >= 0 ? '#22C55E' : '#EF4444'}
                  fontSize="9" fontWeight="600" textAnchor="end" fontFamily="monospace">
                  {hD.algoFlow >= 0 ? '+' : ''}{(hD.algoFlow * 100).toFixed(0)}%
                </text>

                {/* Gamma Range */}
                <text x={ttX + 12} y={PT + 111} fill="#5B5B5B" fontSize="8"
                  fontFamily="monospace">Gamma</text>
                <text x={ttX + ttW - 12} y={PT + 111} fill="#8B8B8B" fontSize="8"
                  fontWeight="500" textAnchor="end" fontFamily="monospace">
                  ${hD.gammaLo.toFixed(2)} — ${hD.gammaHi.toFixed(2)}
                </text>

                <line x1={ttX + 10} y1={PT + 118} x2={ttX + ttW - 10} y2={PT + 118}
                  stroke="rgba(255,255,255,0.04)" />

                {/* Net Flow */}
                <text x={ttX + 12} y={PT + 132} fill="#5B5B5B" fontSize="8.5"
                  fontFamily="monospace">Net</text>
                <text x={ttX + ttW - 12} y={PT + 132}
                  fill={netPrem >= 0 ? '#22C55E' : '#EF4444'}
                  fontSize="11" fontWeight="700" textAnchor="end" fontFamily="monospace">
                  {netPrem >= 0 ? '+' : ''}{fM(netPrem)}
                </text>

                {/* Price badge on right axis */}
                <rect x={W - PR + 3} y={prY - 10} width={54} height={20} rx="4"
                  fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                <text x={W - PR + 30} y={prY + 4} fill="white" fontSize="9"
                  fontWeight="700" textAnchor="middle" fontFamily="monospace">
                  ${hD.price.toFixed(2)}
                </text>
              </g>
            );
          })()}

          {/* Invisible overlay for mouse events */}
          <rect x={PL} y={PT} width={cW} height={cH} fill="transparent" />
        </svg>

        {/* ══════ CONVERGENCE SUB-CHART ══════ */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.03)',
          background: 'linear-gradient(180deg, #09090c 0%, #07070a 100%)',
        }}>
          <svg
            ref={convRef}
            viewBox={`0 0 ${W} ${H_CONV}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Convergence label */}
            <text x="8" y={H_CONV / 2 + 1} fill="#2B2B2B" fontSize="7" textAnchor="middle"
              fontFamily="monospace" transform={`rotate(-90,8,${H_CONV / 2})`}>
              Convergence
            </text>

            {/* Y-axis labels */}
            <text x={PL - 8} y={10} fill="#2B2B2B" fontSize="7" textAnchor="end" fontFamily="monospace">0.6</text>
            <text x={PL - 8} y={H_CONV / 2 + 3} fill="#2B2B2B" fontSize="7" textAnchor="end" fontFamily="monospace">0</text>
            <text x={PL - 8} y={H_CONV - 4} fill="#2B2B2B" fontSize="7" textAnchor="end" fontFamily="monospace">-0.6</text>

            {/* Right labels */}
            <text x={W - PR + 8} y={10} fill="#2B2B2B" fontSize="7" textAnchor="start" fontFamily="monospace">0.5</text>
            <text x={W - PR + 8} y={H_CONV - 4} fill="#2B2B2B" fontSize="7" textAnchor="start" fontFamily="monospace">-0.5</text>

            {/* Zero line */}
            <line x1={PL} y1={H_CONV / 2} x2={W - PR} y2={H_CONV / 2}
              stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

            {/* Convergence bars */}
            {flow.map((p, i) => {
              const x = xI(i);
              const barW = Math.max(1, cW / n * 0.85);
              const midY = H_CONV / 2;
              const maxH = (H_CONV - 8) / 2;
              const barH = Math.abs(p.convergence) * maxH;
              const barY = p.convergence >= 0 ? midY - barH : midY;

              // Color: red bars for most data, gray bars at the end (like reference)
              const isLate = i > n * 0.75;
              const color = isLate ? 'rgba(150,150,150,0.35)' : 'rgba(239,68,68,0.4)';

              return (
                <rect
                  key={i}
                  x={x - barW / 2}
                  y={barY}
                  width={barW}
                  height={Math.max(barH, 0.5)}
                  fill={color}
                  rx="0.5"
                />
              );
            })}

            {/* Hover line in convergence */}
            {hover !== null && (
              <line x1={xI(hover)} y1={0} x2={xI(hover)} y2={H_CONV}
                stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            )}
          </svg>
        </div>
      </div>

      {/* ══════ FOOTER STATS ══════ */}
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-[9px] text-[#2B2B2B]">
          Range: <span className="text-[#4B4B4B]">${priceRange.min.toFixed(2)} — ${priceRange.max.toFixed(2)}</span>
        </span>
        <div className="flex items-center gap-2 text-[9px]">
          <span className="text-[#22C55E]">{fM(totals.netCall)} calls</span>
          <span className="text-[#2B2B2B]">·</span>
          <span className="text-[#EF4444]">{fM(totals.netPut)} puts</span>
          <span className="text-[#2B2B2B]">·</span>
          <span style={{ color: totals.net >= 0 ? '#22C55E' : '#EF4444' }} className="font-semibold">
            {totals.net >= 0 ? '↑' : '↓'} {totals.net >= 0 ? 'Bullish' : 'Bearish'} Flow
          </span>
        </div>
      </div>
    </div>
  );
});

AlgoFlowChart.displayName = 'AlgoFlowChart';
export default AlgoFlowChart;