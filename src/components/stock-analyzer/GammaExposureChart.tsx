// src/components/stock-analyzer/GammaExposureChart.tsx
// =====================================================
// 🔥 GAMMA EXPOSURE (GEX) PROFILE — Price vs Gamma Exposure
// =====================================================
// Institutional-grade GEX visualization:
//   ✅ Horizontal bar chart: strikes on Y-axis, GEX on X-axis
//   ✅ Call GEX (green, right) vs Put GEX (red, left) — butterfly layout
//   ✅ Net GEX line overlay showing combined exposure
//   ✅ Current price indicator with glow
//   ✅ Key levels: Zero GEX, Max GEX (gamma flip), Put/Call walls
//   ✅ Hover tooltip with strike details
//   ✅ Premium Finotaur dark theme with gold accents
// =====================================================

import { memo, useState, useRef, useMemo, useCallback } from 'react';

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

interface GEXStrike {
  strike: number;
  callGEX: number;    // positive
  putGEX: number;     // negative (displayed left)
  netGEX: number;     // call - put
  callOI: number;
  putOI: number;
  callGamma: number;
  putGamma: number;
}

interface GEXKeyLevel {
  strike: number;
  label: string;
  color: string;
  type: 'max_gex' | 'zero_gex' | 'call_wall' | 'put_wall' | 'hvc';
}

// ── GEX Computation ──

function computeGEX(chain: OptionContract[], currentPrice: number): {
  strikes: GEXStrike[];
  keyLevels: GEXKeyLevel[];
  totals: { totalCallGEX: number; totalPutGEX: number; netGEX: number; flipStrike: number | null };
} {
  // Group by strike
  const map = new Map<number, {
    callOI: number; putOI: number;
    callGamma: number; putGamma: number;
  }>();

  for (const opt of chain) {
    if (!opt.strike || !opt.gamma) continue;
    const s = opt.strike;
    const existing = map.get(s) || { callOI: 0, putOI: 0, callGamma: 0, putGamma: 0 };

    if (opt.type === 'call') {
      existing.callOI += opt.openInterest || 0;
      existing.callGamma += opt.gamma || 0;
    } else {
      existing.putOI += opt.openInterest || 0;
      existing.putGamma += opt.gamma || 0;
    }
    map.set(s, existing);
  }

  // Calculate GEX per strike
  // GEX = Gamma × OI × 100 × Spot Price × 0.01
  // This represents the dollar gamma — how much dealers need to hedge per 1% move
  const allStrikes: GEXStrike[] = [];

  for (const [strike, data] of map) {
    const callGEX = data.callGamma * data.callOI * 100 * currentPrice * 0.01;
    // Puts have NEGATIVE gamma exposure for dealers (they're short gamma when selling puts)
    const putGEX = data.putGamma * data.putOI * 100 * currentPrice * 0.01;
    const netGEX = callGEX - putGEX; // Call GEX is positive, Put GEX flips sign

    allStrikes.push({
      strike,
      callGEX,
      putGEX,
      netGEX,
      callOI: data.callOI,
      putOI: data.putOI,
      callGamma: data.callGamma,
      putGamma: data.putGamma,
    });
  }

  // Sort by strike
  allStrikes.sort((a, b) => a.strike - b.strike);

  // Filter to ±15% of current price for readability
  const lo = currentPrice * 0.85;
  const hi = currentPrice * 1.15;
  const filtered = allStrikes.filter(s => s.strike >= lo && s.strike <= hi);

  // If too many strikes, sample ~40
  let strikes = filtered;
  if (strikes.length > 45) {
    const step = Math.ceil(strikes.length / 40);
    strikes = strikes.filter((_, i) => i % step === 0);
  }

  // Key levels
  const keyLevels: GEXKeyLevel[] = [];

  // 1. Max GEX (Gamma Flip) — highest net GEX
  if (strikes.length > 0) {
    const maxGEX = strikes.reduce((max, s) => s.netGEX > max.netGEX ? s : max, strikes[0]);
    if (maxGEX.netGEX > 0) {
      keyLevels.push({ strike: maxGEX.strike, label: 'MAX GEX', color: '#C9A646', type: 'max_gex' });
    }
  }

  // 2. Zero GEX (Gamma Flip Point) — where net GEX crosses zero near price
  let flipStrike: number | null = null;
  for (let i = 1; i < strikes.length; i++) {
    if ((strikes[i - 1].netGEX >= 0 && strikes[i].netGEX < 0) ||
        (strikes[i - 1].netGEX < 0 && strikes[i].netGEX >= 0)) {
      // Interpolate
      const s1 = strikes[i - 1], s2 = strikes[i];
      const ratio = Math.abs(s1.netGEX) / (Math.abs(s1.netGEX) + Math.abs(s2.netGEX) || 1);
      flipStrike = s1.strike + (s2.strike - s1.strike) * ratio;
      keyLevels.push({ strike: flipStrike, label: 'GAMMA FLIP', color: '#F59E0B', type: 'zero_gex' });
      break;
    }
  }

  // 3. Call Wall — highest call GEX
  const callWall = strikes.reduce((max, s) => s.callGEX > max.callGEX ? s : max, strikes[0] || { callGEX: 0, strike: 0 });
  if (callWall && callWall.callGEX > 0) {
    keyLevels.push({ strike: callWall.strike, label: 'CALL WALL', color: '#22C55E', type: 'call_wall' });
  }

  // 4. Put Wall — highest put GEX
  const putWall = strikes.reduce((max, s) => s.putGEX > max.putGEX ? s : max, strikes[0] || { putGEX: 0, strike: 0 });
  if (putWall && putWall.putGEX > 0) {
    keyLevels.push({ strike: putWall.strike, label: 'PUT WALL', color: '#EF4444', type: 'put_wall' });
  }

  // Totals
  const totalCallGEX = strikes.reduce((s, x) => s + x.callGEX, 0);
  const totalPutGEX = strikes.reduce((s, x) => s + x.putGEX, 0);
  const netGEX = totalCallGEX - totalPutGEX;

  return {
    strikes,
    keyLevels,
    totals: { totalCallGEX, totalPutGEX, netGEX, flipStrike },
  };
}

// ── Formatting ──

const fmtGEX = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
};

const fmtDollars = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

// ── Props ──

export interface GammaExposureChartProps {
  chain: OptionContract[];
  currentPrice: number;
  ticker: string;
}

// ═══════════════════════════════════════════════════════
// GAMMA EXPOSURE CHART COMPONENT
// ═══════════════════════════════════════════════════════

export const GammaExposureChart = memo(({ chain, currentPrice, ticker }: GammaExposureChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { strikes, keyLevels, totals } = useMemo(
    () => computeGEX(chain, currentPrice),
    [chain, currentPrice]
  );

  // ── Layout ──
  const W = 920, H = 480;
  const PL = 72, PR = 30, PT = 16, PB = 32;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const n = strikes.length;

  // ── Scales ──
  const maxGEX = useMemo(() => {
    if (!n) return 1;
    let m = 0;
    for (const s of strikes) {
      if (s.callGEX > m) m = s.callGEX;
      if (s.putGEX > m) m = s.putGEX;
    }
    return Math.max(m, 1);
  }, [strikes, n]);

  const maxNetGEX = useMemo(() => {
    if (!n) return 1;
    let m = 0;
    for (const s of strikes) {
      if (Math.abs(s.netGEX) > m) m = Math.abs(s.netGEX);
    }
    return Math.max(m, 1);
  }, [strikes, n]);

  // Y position for strike (horizontal bars = strikes on Y axis)
  const barH = useMemo(() => n > 0 ? Math.min(cH / n * 0.78, 14) : 10, [n, cH]);
  const yStrike = useCallback((i: number) =>
    n <= 1 ? PT + cH / 2 : PT + (i / (n - 1)) * cH, [n, cH]);

  // X: center is the dividing line; calls go right, puts go left
  const centerX = PL + cW * 0.5;
  const halfW = cW * 0.45; // each side gets 45% of chart width

  const xCall = useCallback((gex: number) =>
    centerX + (gex / maxGEX) * halfW, [maxGEX, halfW, centerX]);

  const xPut = useCallback((gex: number) =>
    centerX - (gex / maxGEX) * halfW, [maxGEX, halfW, centerX]);

  // Net GEX line X position (overlay)
  const xNet = useCallback((gex: number) =>
    centerX + (gex / maxNetGEX) * halfW * 0.5, [maxNetGEX, halfW, centerX]);

  // Current price Y position
  const priceY = useMemo(() => {
    if (!n) return PT + cH / 2;
    // Find closest strike
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(strikes[i].strike - currentPrice);
      if (d < minDist) { minDist = d; closest = i; }
    }
    // Interpolate between strikes
    if (closest < n - 1) {
      const s1 = strikes[closest], s2 = strikes[closest + 1];
      if (currentPrice >= s1.strike && currentPrice <= s2.strike) {
        const ratio = (currentPrice - s1.strike) / (s2.strike - s1.strike || 1);
        return yStrike(closest) + ratio * (yStrike(closest + 1) - yStrike(closest));
      }
    }
    return yStrike(closest);
  }, [n, strikes, currentPrice, yStrike]);

  // ── Key level Y positions — with de-overlap algorithm ──
  const keyLevelYs = useMemo(() => {
    const LABEL_H = 16; // height of each label badge
    const MIN_GAP = 3;  // minimum gap between labels
    const SLOT = LABEL_H + MIN_GAP; // total space per label

    // 1. Calculate raw Y positions for each key level
    const raw = keyLevels.map(kl => {
      let closest = 0, minDist = Infinity;
      for (let i = 0; i < n; i++) {
        const d = Math.abs(strikes[i].strike - kl.strike);
        if (d < minDist) { minDist = d; closest = i; }
      }
      return { ...kl, y: yStrike(closest), rawY: yStrike(closest), labelY: yStrike(closest) };
    });

    // 2. Add the price label as a "reserved" slot so key levels avoid it
    const reserved = [{ y: priceY, h: SLOT }];

    // 3. Sort labels by their raw Y position
    raw.sort((a, b) => a.rawY - b.rawY);

    // 4. Greedy de-overlap: push each label down if it overlaps the previous one or a reserved slot
    for (let i = 0; i < raw.length; i++) {
      let targetY = raw[i].rawY;

      // Check against price label
      for (const r of reserved) {
        if (Math.abs(targetY - r.y) < SLOT) {
          // Push away from price: above if originally above, below if originally below
          if (raw[i].rawY <= r.y) {
            targetY = Math.min(targetY, r.y - SLOT);
          } else {
            targetY = Math.max(targetY, r.y + SLOT);
          }
        }
      }

      // Check against previous key level labels
      if (i > 0) {
        const prevY = raw[i - 1].labelY;
        if (targetY - prevY < SLOT) {
          targetY = prevY + SLOT;
        }
      }

      // Clamp within chart bounds
      targetY = Math.max(PT + 4, Math.min(PT + cH - 4, targetY));
      raw[i].labelY = targetY;
    }

    return raw;
  }, [keyLevels, n, strikes, yStrike, priceY, cH]);

  // ── Net GEX path ──
  const netPath = useMemo(() => {
    if (n < 2) return '';
    return strikes.map((s, i) => {
      const x = xNet(s.netGEX);
      const y = yStrike(i);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join('');
  }, [strikes, n, xNet, yStrike]);

  // ── Hover ──
  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || n < 2) return;
    const r = svg.getBoundingClientRect();
    const mouseY = (e.clientY - r.top) * (H / r.height);
    // Find closest strike by Y
    let closest = 0, minDist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(yStrike(i) - mouseY);
      if (d < minDist) { minDist = d; closest = i; }
    }
    setHoverIdx(minDist < barH * 2 ? closest : null);
  }, [n, yStrike, barH]);

  const onLeave = useCallback(() => setHoverIdx(null), []);
  const hoverData = hoverIdx !== null && hoverIdx < n ? strikes[hoverIdx] : null;

  // ── GEX ticks for X axis ──
  const gexTicks = useMemo(() => {
    const ticks: { x: number; label: string }[] = [];
    const steps = [0.25, 0.5, 0.75, 1.0];
    // Put side (left)
    for (const s of steps) {
      const val = maxGEX * s;
      ticks.push({ x: centerX - s * halfW, label: `-${fmtGEX(val)}` });
    }
    // Center
    ticks.push({ x: centerX, label: '0' });
    // Call side (right)
    for (const s of steps) {
      const val = maxGEX * s;
      ticks.push({ x: centerX + s * halfW, label: `+${fmtGEX(val)}` });
    }
    return ticks;
  }, [maxGEX, centerX, halfW]);

  // ── Regime label ──
  const regime = useMemo(() => {
    if (totals.flipStrike === null) {
      return totals.netGEX > 0
        ? { label: 'Positive Gamma', color: '#22C55E', desc: 'Dealers hedge = suppress moves' }
        : { label: 'Negative Gamma', color: '#EF4444', desc: 'Dealers amplify = volatile moves' };
    }
    if (currentPrice > totals.flipStrike) {
      return { label: 'Positive Gamma Zone', color: '#22C55E', desc: `Above flip at $${totals.flipStrike.toFixed(0)}` };
    }
    return { label: 'Negative Gamma Zone', color: '#EF4444', desc: `Below flip at $${totals.flipStrike.toFixed(0)}` };
  }, [totals, currentPrice]);

  // ── Render ──
  if (n < 3) {
    return (
      <div className="h-[200px] flex items-center justify-center text-[#4B4B4B] text-sm">
        Insufficient options data for GEX analysis
      </div>
    );
  }

  return (
    <div>
      {/* ══════ HEADER ══════ */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-white tracking-tight">
            Price × Gamma Exposure
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
            background: 'rgba(201,166,70,0.08)',
            color: '#C9A646',
            border: '1px solid rgba(201,166,70,0.15)',
          }}>GEX PROFILE</span>
        </div>
        <div className="flex items-center gap-3 text-[9px]">
          <span className="px-2 py-0.5 rounded-full font-semibold" style={{
            background: `${regime.color}12`,
            color: regime.color,
            border: `1px solid ${regime.color}25`,
          }}>
            {regime.label}
          </span>
          <span className="text-[#5B5B5B]">{regime.desc}</span>
        </div>
      </div>

      {/* ══════ KEY STATS ROW ══════ */}
      <div className="flex items-center gap-4 mb-3 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
          <span className="text-[#5B5B5B]">Call GEX:</span>
          <span className="text-[#22C55E] font-semibold">{fmtDollars(totals.totalCallGEX)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
          <span className="text-[#5B5B5B]">Put GEX:</span>
          <span className="text-[#EF4444] font-semibold">{fmtDollars(totals.totalPutGEX)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#C9A646' }} />
          <span className="text-[#5B5B5B]">Net GEX:</span>
          <span className="font-bold" style={{ color: totals.netGEX >= 0 ? '#22C55E' : '#EF4444' }}>
            {totals.netGEX >= 0 ? '+' : ''}{fmtDollars(totals.netGEX)}
          </span>
        </div>
        {totals.flipStrike && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: '#F59E0B' }} />
            <span className="text-[#5B5B5B]">Gamma Flip:</span>
            <span className="text-[#F59E0B] font-semibold">${totals.flipStrike.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* ══════ SVG CHART ══════ */}
      <div className="rounded-xl overflow-hidden" style={{
        background: 'linear-gradient(180deg, #0c0c10 0%, #08080b 100%)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto cursor-crosshair"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <defs>
            {/* Call GEX gradient (green, right side) */}
            <linearGradient id="gexCallGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.55" />
            </linearGradient>
            {/* Put GEX gradient (red, left side) */}
            <linearGradient id="gexPutGrad" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.55" />
            </linearGradient>
            {/* Net GEX glow */}
            <filter id="gexNetGlow">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Price line glow */}
            <filter id="gexPriceGlow">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Gold glow for key levels */}
            <filter id="gexGoldGlow">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* ── Column headers ── */}
          <text x={centerX - halfW / 2} y={PT - 2} fill="#EF4444" fontSize="8.5"
            fontWeight="600" textAnchor="middle" fontFamily="monospace" opacity="0.6">
            ◄ PUT GEX
          </text>
          <text x={centerX + halfW / 2} y={PT - 2} fill="#22C55E" fontSize="8.5"
            fontWeight="600" textAnchor="middle" fontFamily="monospace" opacity="0.6">
            CALL GEX ►
          </text>

          {/* ── Center divider ── */}
          <line x1={centerX} y1={PT} x2={centerX} y2={PT + cH}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

          {/* ── Vertical grid lines ── */}
          {gexTicks.map((t, i) => (
            <g key={`gt${i}`}>
              <line x1={t.x} y1={PT} x2={t.x} y2={PT + cH}
                stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
            </g>
          ))}

          {/* ── GEX Bars ── */}
          {strikes.map((s, i) => {
            const y = yStrike(i);
            const isHovered = hoverIdx === i;
            const callW = (s.callGEX / maxGEX) * halfW;
            const putW = (s.putGEX / maxGEX) * halfW;
            const isNearPrice = Math.abs(s.strike - currentPrice) < (currentPrice * 0.005);

            return (
              <g key={s.strike}>
                {/* Highlight row on hover */}
                {isHovered && (
                  <rect x={PL} y={y - barH} width={cW} height={barH * 2}
                    fill="rgba(201,166,70,0.04)" rx="2" />
                )}

                {/* Call GEX bar (right) */}
                <rect
                  x={centerX + 1}
                  y={y - barH / 2}
                  width={Math.max(callW, 0.5)}
                  height={barH}
                  fill={isHovered ? '#22C55E' : 'url(#gexCallGrad)'}
                  opacity={isHovered ? 0.85 : isNearPrice ? 0.75 : 0.6}
                  rx="1.5"
                />

                {/* Put GEX bar (left) */}
                <rect
                  x={centerX - putW - 1}
                  y={y - barH / 2}
                  width={Math.max(putW, 0.5)}
                  height={barH}
                  fill={isHovered ? '#EF4444' : 'url(#gexPutGrad)'}
                  opacity={isHovered ? 0.85 : isNearPrice ? 0.75 : 0.6}
                  rx="1.5"
                />

                {/* Strike label (left axis) */}
                {(i % Math.max(1, Math.floor(n / 20)) === 0 || isHovered || isNearPrice) && (
                  <text x={PL - 6} y={y + 3.5} fill={isNearPrice ? '#C9A646' : isHovered ? 'white' : '#3B3B3B'}
                    fontSize={isNearPrice ? '9' : '8'} fontWeight={isNearPrice ? '700' : '400'}
                    textAnchor="end" fontFamily="monospace">
                    ${s.strike.toFixed(s.strike >= 100 ? 0 : 1)}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Net GEX Line (golden overlay) ── */}
          {netPath && (
            <>
              <path d={netPath} fill="none" stroke="rgba(201,166,70,0.15)" strokeWidth="4"
                strokeLinecap="round" filter="url(#gexNetGlow)" />
              <path d={netPath} fill="none" stroke="#C9A646" strokeWidth="1.5"
                strokeLinecap="round" opacity="0.8" />
            </>
          )}

          {/* ── Current Price Line ── */}
          <line x1={PL} y1={priceY} x2={W - PR} y2={priceY}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"
            strokeDasharray="4,3" filter="url(#gexPriceGlow)" />
          <line x1={PL} y1={priceY} x2={W - PR} y2={priceY}
            stroke="white" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.5" />

          {/* Price label badge */}
          <rect x={PL - 2} y={priceY - 9} width={56} height={18} rx="4"
            fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          <text x={PL + 26} y={priceY + 4} fill="white" fontSize="9"
            fontWeight="700" textAnchor="middle" fontFamily="monospace">
            ${currentPrice.toFixed(2)}
          </text>

          {/* ── Key Level Markers ── */}
          {keyLevelYs.map((kl, i) => {
            const displaced = Math.abs(kl.labelY - kl.y) > 6;

            return (
              <g key={`kl${i}`}>
                {/* Subtle horizontal line at actual strike level */}
                <line x1={centerX - halfW * 0.3} y1={kl.y} x2={centerX + halfW * 0.3} y2={kl.y}
                  stroke={kl.color} strokeWidth="0.6" opacity="0.35" strokeDasharray="2,2" />

                {/* Connector line from actual level to displaced label */}
                {displaced && (
                  <line x1={W - PR - 41} y1={kl.y} x2={W - PR - 41} y2={kl.labelY}
                    stroke={kl.color} strokeWidth="0.4" opacity="0.2" />
                )}

                {/* Small tick mark at actual level on right edge */}
                <line x1={W - PR - 82} y1={kl.y} x2={W - PR - 78} y2={kl.y}
                  stroke={kl.color} strokeWidth="1" opacity="0.5" />

                {/* Label badge at de-overlapped position */}
                <rect x={W - PR - 82} y={kl.labelY - 7} width={78} height={14} rx="3"
                  fill={`${kl.color}12`} stroke={`${kl.color}30`} strokeWidth="0.5" />
                <text x={W - PR - 43} y={kl.labelY + 4} fill={kl.color} fontSize="7"
                  fontWeight="600" textAnchor="middle" fontFamily="monospace">
                  {kl.label} ${kl.strike.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* ── X-axis tick labels ── */}
          {gexTicks.filter((_, i) => i % 2 === 0 || i === Math.floor(gexTicks.length / 2)).map((t, i) => (
            <text key={`xl${i}`} x={t.x} y={H - 8} fill="#2B2B2B" fontSize="7.5"
              textAnchor="middle" fontFamily="monospace">
              {t.label}
            </text>
          ))}

          {/* X-axis label */}
          <text x={centerX} y={H - 1} fill="#2B2B2B" fontSize="7" textAnchor="middle"
            fontFamily="monospace">
            Gamma Exposure (GEX) — Dollar Gamma per 1% Move
          </text>

          {/* ── Legend ── */}
          <g transform={`translate(${PL + (cW - 360) / 2}, ${H - PB + 2})`}>
            <rect width="360" height="16" rx="4" fill="rgba(0,0,0,0.7)"
              stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

            <rect x="10" y="4" width="10" height="8" rx="1" fill="#22C55E" opacity="0.6" />
            <text x="24" y="11" fill="#6B6B6B" fontSize="7.5">Call GEX</text>

            <rect x="82" y="4" width="10" height="8" rx="1" fill="#EF4444" opacity="0.6" />
            <text x="96" y="11" fill="#6B6B6B" fontSize="7.5">Put GEX</text>

            <rect x="148" y="4" width="10" height="8" rx="1" fill="#C9A646" opacity="0.7" />
            <text x="162" y="11" fill="#6B6B6B" fontSize="7.5">Net GEX</text>

            <line x1="222" y1="5" x2="232" y2="5" stroke="white" strokeWidth="1"
              strokeDasharray="2,1" opacity="0.5" />
            <text x="236" y="11" fill="#6B6B6B" fontSize="7.5">Current Price</text>

            <circle cx="314" cy="8" r="3" fill="#F59E0B" opacity="0.5" />
            <text x="320" y="11" fill="#6B6B6B" fontSize="7.5">Flip</text>
          </g>

          {/* ═══ HOVER TOOLTIP ═══ */}
          {hoverData && hoverIdx !== null && (() => {
            const hy = yStrike(hoverIdx);
            const ttW = 200, ttH = 130;
            // Always place tooltip on the left side (inside the Put GEX area) where there's room
            const ttX = PL + 8;
            const ttY = Math.max(PT + 4, Math.min(hy - ttH / 2, PT + cH - ttH - 4));

            return (
              <g>
                {/* Horizontal crosshair */}
                <line x1={PL} y1={hy} x2={W - PR} y2={hy}
                  stroke="rgba(201,166,70,0.15)" strokeWidth="0.5" />

                {/* Tooltip card */}
                <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="8"
                  fill="rgba(12,12,16,0.97)" stroke="rgba(201,166,70,0.15)" strokeWidth="0.75" />

                {/* Strike */}
                <text x={ttX + ttW / 2} y={ttY + 18} fill="#C9A646" fontSize="12"
                  fontWeight="700" textAnchor="middle" fontFamily="monospace">
                  ${hoverData.strike.toFixed(hoverData.strike >= 100 ? 0 : 1)}
                </text>

                <line x1={ttX + 10} y1={ttY + 24} x2={ttX + ttW - 10} y2={ttY + 24}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

                {/* Call GEX */}
                <circle cx={ttX + 16} cy={ttY + 37} r="3" fill="#22C55E" />
                <text x={ttX + 24} y={ttY + 40} fill="#5B5B5B" fontSize="8" fontFamily="monospace">Call GEX</text>
                <text x={ttX + ttW - 12} y={ttY + 40} fill="#22C55E" fontSize="9"
                  fontWeight="600" textAnchor="end" fontFamily="monospace">
                  {fmtDollars(hoverData.callGEX)}
                </text>

                {/* Put GEX */}
                <circle cx={ttX + 16} cy={ttY + 53} r="3" fill="#EF4444" />
                <text x={ttX + 24} y={ttY + 56} fill="#5B5B5B" fontSize="8" fontFamily="monospace">Put GEX</text>
                <text x={ttX + ttW - 12} y={ttY + 56} fill="#EF4444" fontSize="9"
                  fontWeight="600" textAnchor="end" fontFamily="monospace">
                  {fmtDollars(hoverData.putGEX)}
                </text>

                <line x1={ttX + 10} y1={ttY + 63} x2={ttX + ttW - 10} y2={ttY + 63}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

                {/* Net GEX */}
                <circle cx={ttX + 16} cy={ttY + 76} r="3" fill="#C9A646" />
                <text x={ttX + 24} y={ttY + 79} fill="#5B5B5B" fontSize="8" fontFamily="monospace">Net GEX</text>
                <text x={ttX + ttW - 12} y={ttY + 79}
                  fill={hoverData.netGEX >= 0 ? '#22C55E' : '#EF4444'} fontSize="9.5"
                  fontWeight="700" textAnchor="end" fontFamily="monospace">
                  {hoverData.netGEX >= 0 ? '+' : ''}{fmtDollars(hoverData.netGEX)}
                </text>

                <line x1={ttX + 10} y1={ttY + 87} x2={ttX + ttW - 10} y2={ttY + 87}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

                {/* OI */}
                <text x={ttX + 16} y={ttY + 100} fill="#3B82F6" fontSize="8" fontFamily="monospace">
                  Call OI: {hoverData.callOI.toLocaleString()}
                </text>
                <text x={ttX + 16} y={ttY + 113} fill="#EF4444" fontSize="8" fontFamily="monospace">
                  Put OI: {hoverData.putOI.toLocaleString()}
                </text>

                {/* Distance from price */}
                <text x={ttX + ttW - 12} y={ttY + 113} fill="#5B5B5B" fontSize="7.5"
                  textAnchor="end" fontFamily="monospace">
                  {((hoverData.strike - currentPrice) / currentPrice * 100).toFixed(1)}% from price
                </text>
              </g>
            );
          })()}

          {/* Invisible overlay for mouse events */}
          <rect x={PL} y={PT} width={cW} height={cH} fill="transparent" />
        </svg>
      </div>

      {/* ══════ FOOTER: GEX INTERPRETATION ══════ */}
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-[9px] text-[#2B2B2B]">
          GEX = Gamma × OI × 100 × Spot × 0.01
        </span>
        <div className="flex items-center gap-2 text-[9px]">
          {keyLevels.map((kl, i) => (
            <span key={i} style={{ color: kl.color }} className="font-medium">
              {kl.label}: ${kl.strike.toFixed(0)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

GammaExposureChart.displayName = 'GammaExposureChart';
export default GammaExposureChart;