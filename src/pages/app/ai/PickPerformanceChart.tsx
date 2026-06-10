// =====================================================
// 📊 PickPerformanceChart.tsx — Premium Area Chart
// =====================================================
// Shows price + return % performance since alert date
// Recharts AreaChart with FINOTAUR dark-gold aesthetic
// 
// Features:
//   ✅ Dual Y-axis: Price ($) left, Return (%) right
//   ✅ Gradient area fill (gold → transparent for positive, red for negative)
//   ✅ Entry price reference line
//   ✅ Target/Stop levels shown as dotted lines
//   ✅ Tooltip with full OHLCV data
//   ✅ Responsive, animates on mount
//   ✅ Loading skeleton while fetching
//   ✅ Frontend cache (avoids refetch on expand/collapse)
//
// Usage:
//   <PickPerformanceChart pickId="uuid" />
//
// Data source: GET /api/admin/pick-history/:id (cached 10 min)
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Target, AlertTriangle } from 'lucide-react';
import { SkeletonChart } from '@/components/ds/Skeleton';

// ═══════════════════════════════════════════════
// DESIGN TOKENS — Exact match from Top5.tsx / AdminTrackerView
// ═══════════════════════════════════════════════
const GOLD = {
  primary: '#C9A646',
  light: '#F4D97B',
  warm: '#E8DCC4',
  dim: 'rgba(201,166,70,',
};
const GREEN = { solid: '#22C55E', dim: 'rgba(34,197,94,' };
const RED = { solid: '#EF4444', dim: 'rgba(239,68,68,' };

const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Frontend cache (survives expand/collapse cycles) ──
const chartCache = new Map();
const FRONTEND_CACHE_TTL = 5 * 60_000; // 5 min

function getCachedChart(pickId) {
  const e = chartCache.get(pickId);
  if (e && Date.now() < e.exp) return e.val;
  chartCache.delete(pickId);
  return null;
}
function setCachedChart(pickId, val) {
  chartCache.set(pickId, { val, exp: Date.now() + FRONTEND_CACHE_TTL });
}

// ═══════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════

interface PricePoint {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  return_pct: number;
}

interface PickInfo {
  id: string;
  ticker: string;
  company_name: string;
  pick_date: string;
  pick_price: number;
  current_price: number;
  current_return_pct: number;
  overall_score: number;
  finotaur_score: number;
  direction: string;
  catalyst: string;
  catalyst_type: string;
  status: string;
  max_return_pct: number;
  min_return_pct: number;
  tracking_days: number;
  predicted_target_1: number | null;
  predicted_target_2: number | null;
  predicted_stop_loss: number | null;
}

interface ChartData {
  pick: PickInfo;
  prices: PricePoint[];
}

// ═══════════════════════════════════════════════
// CUSTOM TOOLTIP
// ═══════════════════════════════════════════════

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const isPositive = data.return_pct >= 0;
  const returnColor = isPositive ? GREEN.solid : RED.solid;

  return (
    <div style={{
      background: 'rgba(15, 15, 18, 0.95)',
      border: `1px solid ${GOLD.dim}0.2)`,
      borderRadius: '12px',
      padding: '12px 16px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ 
        fontSize: '9px', 
        fontFamily: 'monospace', 
        color: 'rgba(139,139,139,0.5)', 
        marginBottom: '6px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'rgba(255,255,255,0.9)' }}>
          ${data.close?.toFixed(2)}
        </span>
        <span style={{ 
          fontSize: '12px', fontWeight: 600, fontFamily: 'monospace', color: returnColor,
          background: `${isPositive ? GREEN.dim : RED.dim}0.1)`,
          padding: '2px 6px',
          borderRadius: '6px',
        }}>
          {isPositive ? '+' : ''}{data.return_pct?.toFixed(2)}%
        </span>
      </div>

      {(data.open || data.high || data.low) && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {[
            { label: 'O', value: data.open },
            { label: 'H', value: data.high },
            { label: 'L', value: data.low },
          ].map(item => item.value ? (
            <div key={item.label}>
              <span style={{ fontSize: '8px', color: 'rgba(139,139,139,0.3)', marginRight: '3px' }}>{item.label}</span>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>${item.value.toFixed(2)}</span>
            </div>
          ) : null)}
          {data.volume ? (
            <div>
              <span style={{ fontSize: '8px', color: 'rgba(139,139,139,0.3)', marginRight: '3px' }}>Vol</span>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>
                {data.volume >= 1e6 ? `${(data.volume / 1e6).toFixed(1)}M` : `${(data.volume / 1e3).toFixed(0)}K`}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════
// STAT PILL (compact metric display)
// ═══════════════════════════════════════════════

const StatPill = ({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon?: any }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '6px 10px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
  }}>
    {Icon && <Icon style={{ width: 12, height: 12, color: 'rgba(139,139,139,0.3)' }} />}
    <span style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(139,139,139,0.3)' }}>{label}</span>
    <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'monospace', color }}>{value}</span>
  </div>
);


// ═══════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════

const ChartSkeleton = () => <SkeletonChart height="h-[280px]" />;


// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

export default function PickPerformanceChart({ pickId, getAuthHeaders }: { pickId: string; getAuthHeaders: () => Record<string, string> }) {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchHistory = useCallback(async () => {
    // Check frontend cache first
    const cached = getCachedChart(pickId);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/pick-history/${pickId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      setCachedChart(pickId, json);
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pickId, getAuthHeaders]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchHistory();
    }
  }, [fetchHistory]);

  if (loading) return <ChartSkeleton />;
  
  if (error || !data?.prices?.length) {
    return (
      <div style={{
        height: '120px', borderRadius: '16px',
        background: 'rgba(255,255,255,0.01)',
        border: `1px solid ${GOLD.dim}0.06)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <AlertTriangle style={{ width: 20, height: 20, color: `${GOLD.dim}0.2)`, margin: '0 auto 6px' }} />
          <p style={{ fontSize: '10px', color: 'rgba(139,139,139,0.3)' }}>
            {error ? `Error: ${error}` : 'No price history yet — data will appear after the next market close'}
          </p>
        </div>
      </div>
    );
  }

  const { pick, prices } = data;
  const latestReturn = prices[prices.length - 1]?.return_pct ?? 0;
  const isPositive = latestReturn >= 0;
  const maxReturn = Math.max(...prices.map(p => p.return_pct));
  const minReturn = Math.min(...prices.map(p => p.return_pct));
  const maxPrice = Math.max(...prices.map(p => p.close));
  const minPrice = Math.min(...prices.map(p => p.close));

  // Determine gradient colors based on current performance
  const areaColor = isPositive ? GREEN.solid : RED.solid;
  const areaDim = isPositive ? GREEN.dim : RED.dim;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        borderRadius: '16px',
        background: `linear-gradient(180deg, ${GOLD.dim}0.02) 0%, rgba(0,0,0,0) 100%)`,
        border: `1px solid ${GOLD.dim}0.08)`,
        overflow: 'hidden',
      }}
    >
      {/* ── Header ─────────────────────────── */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.02em', color: 'rgba(255,255,255,0.9)' }}>
              {pick.ticker}
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(139,139,139,0.4)' }}>{pick.company_name}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <StatPill label="Entry" value={`$${pick.pick_price?.toFixed(2)}`} color="rgba(139,139,139,0.6)" icon={DollarSign} />
            <StatPill label="Current" value={`$${pick.current_price?.toFixed(2)}`} color="rgba(255,255,255,0.7)" icon={DollarSign} />
            <StatPill 
              label="Return" 
              value={`${isPositive ? '+' : ''}${latestReturn.toFixed(2)}%`} 
              color={isPositive ? GREEN.solid : RED.solid} 
              icon={isPositive ? TrendingUp : TrendingDown} 
            />
            <StatPill label="Max" value={`+${maxReturn.toFixed(2)}%`} color={GREEN.solid} icon={TrendingUp} />
            {minReturn < 0 && <StatPill label="Low" value={`${minReturn.toFixed(2)}%`} color={RED.solid} icon={TrendingDown} />}
            <StatPill label="Days" value={`${pick.tracking_days || prices.length}`} color={`${GOLD.dim}0.5)`} icon={Calendar} />
          </div>
        </div>
      </div>

      {/* ── Chart ──────────────────────────── */}
      <div style={{ padding: '0 8px 12px' }}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={prices} margin={{ top: 10, right: 50, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id={`areaGrad-${pickId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={areaColor} stopOpacity={0.3} />
                <stop offset="50%" stopColor={areaColor} stopOpacity={0.08} />
                <stop offset="100%" stopColor={areaColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`lineGrad-${pickId}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={GOLD.primary} stopOpacity={0.6} />
                <stop offset="50%" stopColor={areaColor} stopOpacity={1} />
                <stop offset="100%" stopColor={areaColor} stopOpacity={0.8} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              stroke="rgba(255,255,255,0.02)" 
              strokeDasharray="3 3" 
              vertical={false} 
            />
            
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 9, fill: 'rgba(139,139,139,0.25)', fontFamily: 'monospace' }}
              tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              axisLine={{ stroke: 'rgba(255,255,255,0.03)' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            
            {/* Left Y-axis: Price */}
            <YAxis 
              yAxisId="price"
              orientation="left"
              domain={[minPrice * 0.98, maxPrice * 1.02]}
              tick={{ fontSize: 9, fill: 'rgba(139,139,139,0.3)', fontFamily: 'monospace' }}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            
            {/* Right Y-axis: Return % */}
            <YAxis 
              yAxisId="return"
              orientation="right"
              domain={[minReturn - 2, maxReturn + 2]}
              tick={{ fontSize: 9, fill: 'rgba(139,139,139,0.25)', fontFamily: 'monospace' }}
              tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
              axisLine={false}
              tickLine={false}
              width={45}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Entry price reference line */}
            <ReferenceLine 
              yAxisId="price" 
              y={pick.pick_price} 
              stroke={GOLD.primary}
              strokeDasharray="6 4"
              strokeOpacity={0.4}
              label={{
                value: `Entry $${pick.pick_price?.toFixed(2)}`,
                position: 'left',
                style: { fontSize: 8, fill: `${GOLD.dim}0.4)`, fontFamily: 'monospace' },
              }}
            />

            {/* Target 1 reference line */}
            {pick.predicted_target_1 && pick.predicted_target_1 > 0 && (
              <ReferenceLine 
                yAxisId="price" 
                y={pick.predicted_target_1} 
                stroke={GREEN.solid}
                strokeDasharray="4 4"
                strokeOpacity={0.25}
                label={{
                  value: `T1 $${pick.predicted_target_1.toFixed(0)}`,
                  position: 'right',
                  style: { fontSize: 7, fill: `${GREEN.dim}0.4)`, fontFamily: 'monospace' },
                }}
              />
            )}

            {/* Stop loss reference line */}
            {pick.predicted_stop_loss && pick.predicted_stop_loss > 0 && (
              <ReferenceLine 
                yAxisId="price" 
                y={pick.predicted_stop_loss} 
                stroke={RED.solid}
                strokeDasharray="4 4"
                strokeOpacity={0.25}
                label={{
                  value: `SL $${pick.predicted_stop_loss.toFixed(0)}`,
                  position: 'right',
                  style: { fontSize: 7, fill: `${RED.dim}0.4)`, fontFamily: 'monospace' },
                }}
              />
            )}

            {/* 0% return reference line */}
            <ReferenceLine 
              yAxisId="return" 
              y={0} 
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="2 2"
            />

            {/* Main area — price */}
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke={`url(#lineGrad-${pickId})`}
              strokeWidth={2}
              fill={`url(#areaGrad-${pickId})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: areaColor,
                stroke: 'rgba(15,15,18,0.8)',
                strokeWidth: 2,
              }}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Catalyst Info ──────────────────── */}
      {pick.catalyst && (
        <div style={{
          margin: '0 16px 16px',
          padding: '12px 16px',
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${GOLD.dim}0.03), ${GOLD.dim}0.01))`,
          border: `1px solid ${GOLD.dim}0.08)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Target style={{ width: 11, height: 11, color: `${GOLD.dim}0.4)` }} />
            <span style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: `${GOLD.dim}0.4)` }}>
              Catalyst
            </span>
            {pick.catalyst_type && (
              <span style={{
                fontSize: '8px', fontWeight: 600, textTransform: 'uppercase',
                padding: '1px 6px', borderRadius: '4px',
                background: `${GOLD.dim}0.08)`,
                color: GOLD.primary,
                letterSpacing: '0.06em',
              }}>
                {pick.catalyst_type.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p style={{ fontSize: '11px', lineHeight: 1.6, color: 'rgba(200,200,200,0.7)' }}>
            {pick.catalyst}
          </p>
        </div>
      )}
    </motion.div>
  );
}