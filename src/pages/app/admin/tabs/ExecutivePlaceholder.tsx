// src/pages/app/admin/tabs/ExecutivePlaceholder.tsx
// ============================================
// Executive Dashboard — Phase 2 promoted to a real feature.
// Linear-trend 30-day forecast for active users + MRR projection,
// with a 95% confidence band derived from regression residuals.
//
// Data: getUserGrowthData(60) + getSubscriberStats — no schema changes.
// ============================================

import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Users,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { StatsCard } from '@/components/admin/StatsCard';
import {
  getUserGrowthData,
  getSubscriberStats,
} from '@/services/adminService';
import type { UserGrowthData, SubscriberStats } from '@/types/admin';

interface Regression {
  slope: number;
  intercept: number;
  sigma: number;            // standard deviation of residuals
  rSquared: number;
}

function linearRegression(values: number[]): Regression {
  const n = values.length;
  if (n < 2) {
    return { slope: 0, intercept: values[0] ?? 0, sigma: 0, rSquared: 0 };
  }
  const xs = values.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * values[i], 0);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - meanY) ** 2;
  }
  const sigma = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, sigma, rSquared };
}

interface ChartPoint {
  date: string;
  actual?: number;
  forecast?: number;
  upper?: number;          // upper bound of 95% confidence
  lower?: number;
  band?: [number, number]; // for stacked Area
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const FORECAST_DAYS = 30;
const CONFIDENCE_Z = 1.96;

export function ExecutivePlaceholder() {
  const [growth, setGrowth] = useState<UserGrowthData[]>([]);
  const [subStats, setSubStats] = useState<SubscriberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [g, s] = await Promise.all([
          getUserGrowthData(60),
          getSubscriberStats(),
        ]);
        if (cancelled) return;
        setGrowth(g);
        setSubStats(s);
      } catch (err) {
        if (cancelled) return;
        console.error('[ExecutiveDashboard] load failed:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load executive data'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeRegression = useMemo(() => {
    if (growth.length < 5) return null;
    return linearRegression(growth.map((g) => g.activeUsers));
  }, [growth]);

  const newRegression = useMemo(() => {
    if (growth.length < 5) return null;
    return linearRegression(growth.map((g) => g.newUsers));
  }, [growth]);

  const chartData: ChartPoint[] = useMemo(() => {
    if (!growth.length || !activeRegression) return [];

    const points: ChartPoint[] = growth.map((g) => ({
      date: g.date,
      actual: g.activeUsers,
    }));

    const lastDate = growth[growth.length - 1].date;
    const n = growth.length;
    const lastActual = growth[growth.length - 1].activeUsers;
    const reg = activeRegression;

    // Anchor forecast to the last actual to avoid a visible jump.
    const lastFitted = reg.intercept + reg.slope * (n - 1);
    const anchorDelta = lastActual - lastFitted;

    // Mark the boundary point with forecast = lastActual so the line connects.
    points[points.length - 1].forecast = lastActual;
    points[points.length - 1].upper = lastActual;
    points[points.length - 1].lower = lastActual;
    points[points.length - 1].band = [lastActual, lastActual];

    for (let i = 1; i <= FORECAST_DAYS; i++) {
      const predicted = reg.intercept + reg.slope * (n - 1 + i) + anchorDelta;
      // Widen the band with horizon (sqrt(i) growth is the classic OLS form)
      const widen = reg.sigma * CONFIDENCE_Z * Math.sqrt(1 + i / n);
      const upper = Math.max(0, predicted + widen);
      const lower = Math.max(0, predicted - widen);
      points.push({
        date: addDays(lastDate, i),
        forecast: Math.max(0, predicted),
        upper,
        lower,
        band: [lower, upper],
      });
    }

    return points;
  }, [growth, activeRegression]);

  if (loading) {
    return (
      <div className="p-8">
        <LoadingSkeleton lines={12} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Executive Dashboard failed to load</p>
            <p className="text-sm opacity-80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!subStats || !activeRegression || !newRegression || growth.length < 5) {
    return (
      <div className="p-8">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 text-gray-400 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 shrink-0 mt-0.5 text-[#D4AF37]" />
          <div>
            <p className="font-semibold text-white">
              Not enough data to forecast yet
            </p>
            <p className="text-sm mt-1">
              Forecasts require at least 5 days of user-growth history.
              Check back once the platform has more activity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const n = growth.length;
  const projectedActive = Math.max(
    0,
    Math.round(activeRegression.intercept + activeRegression.slope * (n - 1 + FORECAST_DAYS))
  );
  const projectedNewPerDay = Math.max(
    0,
    activeRegression.slope > 0 ? newRegression.slope * (n - 1) + newRegression.intercept : 0
  );
  const projectedSignups30d = Math.max(
    0,
    Math.round(
      Array.from({ length: FORECAST_DAYS }).reduce<number>((acc, _, i) => {
        const pred = newRegression.intercept + newRegression.slope * (n - 1 + i + 1);
        return acc + Math.max(0, pred);
      }, 0)
    )
  );

  const currentActive = growth[n - 1].activeUsers;
  const activeDelta = projectedActive - currentActive;
  const activeDeltaPct = currentActive > 0 ? (activeDelta / currentActive) * 100 : 0;

  // MRR projection: assume new signups follow the trend and a fixed conversion
  // factor derived from the present paying-subscriber / active-user ratio.
  // No DB changes; this is an above-the-fold estimate only.
  const arpu = subStats.activeSubscribers > 0
    ? subStats.totalMRR / subStats.activeSubscribers
    : 0;
  const convRatio = currentActive > 0
    ? subStats.activeSubscribers / currentActive
    : 0;
  const projectedPayingDelta = Math.round(activeDelta * convRatio);
  const projectedMRRDelta = projectedPayingDelta * arpu;
  const projectedMRR = Math.max(0, subStats.totalMRR + projectedMRRDelta);

  const slopeHealth: 'positive' | 'neutral' | 'negative' =
    activeRegression.slope > 0.5 ? 'positive' : activeRegression.slope < -0.5 ? 'negative' : 'neutral';

  const rSqLabel =
    activeRegression.rSquared >= 0.7
      ? 'Strong trend'
      : activeRegression.rSquared >= 0.3
      ? 'Moderate trend'
      : 'Noisy / weak trend';

  const rSqColor =
    activeRegression.rSquared >= 0.7
      ? 'text-green-400'
      : activeRegression.rSquared >= 0.3
      ? 'text-yellow-400'
      : 'text-red-400';

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
          <TrendingUp className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">Executive Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            30-day forecast on active users + MRR, with a 95% confidence band
            from linear regression on the last 60 days.
          </p>
        </div>
        <div className="text-[11px] text-gray-600 flex items-center gap-1 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span>Live forecast</span>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active users (30d projection)"
          value={projectedActive.toLocaleString()}
          change={`${activeDelta >= 0 ? '+' : ''}${activeDelta.toLocaleString()} (${activeDeltaPct >= 0 ? '+' : ''}${activeDeltaPct.toFixed(1)}%)`}
          changeType={slopeHealth}
          icon={Users}
        />
        <StatsCard
          title="Signups (next 30d)"
          value={projectedSignups30d.toLocaleString()}
          subtitle={`Avg ${projectedNewPerDay.toFixed(1)} / day`}
          icon={Activity}
        />
        <StatsCard
          title="MRR (30d projection)"
          value={`$${projectedMRR.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          change={`${projectedMRRDelta >= 0 ? '+' : ''}$${Math.round(projectedMRRDelta).toLocaleString()}`}
          changeType={projectedMRRDelta >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
        />
        <StatsCard
          title="Trend confidence"
          value={`R² ${activeRegression.rSquared.toFixed(2)}`}
          subtitle={rSqLabel}
          icon={TrendingUp}
        />
      </section>

      <section className="bg-[#111111] border border-gray-800 rounded-lg p-5">
        <header className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-white font-semibold">
            Active users — 60 days history + 30 days forecast
          </h3>
          <span className={`text-[11px] ${rSqColor}`}>
            slope {activeRegression.slope.toFixed(2)} users/day · {rSqLabel.toLowerCase()}
          </span>
        </header>

        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis
              dataKey="date"
              stroke="#6B7280"
              fontSize={11}
              tickFormatter={(d) =>
                new Date(d).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              }
            />
            <YAxis stroke="#6B7280" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0E0E0E',
                border: '1px solid #374151',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(d) =>
                new Date(d as string).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                })
              }
              formatter={(value: number | [number, number], name: string) => {
                if (name === 'Confidence band' && Array.isArray(value)) {
                  return [`${Math.round(value[0])} – ${Math.round(value[1])}`, name];
                }
                return [Math.round(value as number).toLocaleString(), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine
              x={growth[growth.length - 1].date}
              stroke="#6B7280"
              strokeDasharray="4 4"
              label={{ value: 'today', fill: '#9CA3AF', fontSize: 10, position: 'top' }}
            />
            <Area
              type="monotone"
              dataKey="band"
              stroke="none"
              fill="url(#bandGrad)"
              name="Confidence band"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#actualGrad)"
              name="Actual"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="#D4AF37"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="none"
              name="Forecast"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
          Linear OLS regression on the past {growth.length} days. Confidence
          band widens with horizon via the standard OLS variance term. MRR
          projection assumes the current paying-conversion ratio (
          {(convRatio * 100).toFixed(1)}%) and ARPU (${arpu.toFixed(2)}) hold.
        </p>
      </section>
    </div>
  );
}
