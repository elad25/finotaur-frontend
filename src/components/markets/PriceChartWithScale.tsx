// src/components/markets/PriceChartWithScale.tsx
// =====================================================
// FINOTAUR PRICE CHART WITH Y-AXIS SCALE
// =====================================================
// Shows price notches on the right side like Investing.com
// =====================================================

import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface PriceDataPoint {
  date: string;
  price: number;
  volume?: number;
}

interface PriceChartWithScaleProps {
  data: PriceDataPoint[];
  currentPrice: number;
  previousClose?: number;
  high52w?: number;
  low52w?: number;
  symbol: string;
  height?: number;
  showGrid?: boolean;
  showVolume?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function calculateNiceTicks(min: number, max: number, targetTicks: number = 6): number[] {
  const range = max - min;
  const roughStep = range / targetTicks;
  
  // Find a "nice" step value (1, 2, 5, 10, 20, 25, 50, etc.)
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  
  let niceStep: number;
  if (normalized <= 1) niceStep = 1 * magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 2.5) niceStep = 2.5 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;
  
  // Generate ticks
  const ticks: number[] = [];
  const start = Math.floor(min / niceStep) * niceStep;
  
  for (let tick = start; tick <= max + niceStep; tick += niceStep) {
    if (tick >= min - niceStep * 0.1 && tick <= max + niceStep * 0.1) {
      ticks.push(tick);
    }
  }
  
  return ticks;
}

function formatPrice(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP
// ═══════════════════════════════════════════════════════════════

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const price = payload[0]?.value;
  const volume = payload[0]?.payload?.volume;

  return (
    <div className="bg-zinc-900/95 border border-[#C9A646]/30 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-zinc-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">${formatPrice(price)}</p>
      {volume && (
        <p className="text-xs text-zinc-500 mt-1">
          Vol: {(volume / 1e6).toFixed(2)}M
        </p>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CUSTOM Y-AXIS TICK
// ═══════════════════════════════════════════════════════════════

const CustomYAxisTick = ({ x, y, payload, currentPrice }: any) => {
  const isCurrentPrice = Math.abs(payload.value - currentPrice) < currentPrice * 0.01;
  
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Tick line */}
      <line
        x1={-6}
        y1={0}
        x2={0}
        y2={0}
        stroke={isCurrentPrice ? "#C9A646" : "#3f3f46"}
        strokeWidth={isCurrentPrice ? 2 : 1}
      />
      {/* Price label */}
      <text
        x={8}
        y={4}
        fill={isCurrentPrice ? "#C9A646" : "#71717a"}
        fontSize={11}
        fontWeight={isCurrentPrice ? 600 : 400}
        fontFamily="system-ui"
      >
        {formatPrice(payload.value)}
      </text>
    </g>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const PriceChartWithScale: React.FC<PriceChartWithScaleProps> = ({
  data,
  currentPrice,
  previousClose,
  high52w,
  low52w,
  symbol,
  height = 300,
  showGrid = true,
  showVolume = false,
}) => {
  // Calculate price range and ticks
  const { minPrice, maxPrice, ticks, isPositive } = useMemo(() => {
    if (!data || data.length === 0) {
      return { minPrice: 0, maxPrice: 100, ticks: [], isPositive: true };
    }

    const prices = data.map((d) => d.price);
    const dataMin = Math.min(...prices);
    const dataMax = Math.max(...prices);
    
    // Add padding (5% on each side)
    const padding = (dataMax - dataMin) * 0.05;
    const min = dataMin - padding;
    const max = dataMax + padding;
    
    const calculatedTicks = calculateNiceTicks(min, max, 6);
    const positive = previousClose ? currentPrice >= previousClose : true;
    
    return {
      minPrice: Math.min(...calculatedTicks),
      maxPrice: Math.max(...calculatedTicks),
      ticks: calculatedTicks,
      isPositive: positive,
    };
  }, [data, currentPrice, previousClose]);

  const gradientId = `priceGradient-${symbol}`;
  const gradientColor = isPositive ? "#10b981" : "#ef4444";

  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-zinc-900/40 rounded-xl border border-zinc-800/60"
        style={{ height }}
      >
        <p className="text-zinc-500">No chart data available</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl bg-zinc-900/40 border border-zinc-800/60 overflow-hidden">
      {/* Header with current price */}
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">{symbol}</span>
          <span className="text-2xl font-bold text-white">${formatPrice(currentPrice)}</span>
          {previousClose && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-lg text-sm font-medium",
              isPositive 
                ? "bg-emerald-500/15 text-emerald-400" 
                : "bg-red-500/15 text-red-400"
            )}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {isPositive ? "+" : ""}{((currentPrice - previousClose) / previousClose * 100).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        
        {/* 52W Range Mini */}
        {high52w && low52w && (
          <div className="text-xs text-zinc-500">
            <span className="text-zinc-600">52W:</span>{" "}
            <span className="text-red-400">${formatPrice(low52w)}</span>
            <span className="text-zinc-600 mx-1">—</span>
            <span className="text-emerald-400">${formatPrice(high52w)}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="px-2 py-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 70, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradientColor} stopOpacity={0.3} />
                <stop offset="50%" stopColor={gradientColor} stopOpacity={0.1} />
                <stop offset="100%" stopColor={gradientColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Grid */}
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#27272a" 
                horizontal={true}
                vertical={false}
              />
            )}

            {/* X Axis */}
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#71717a", fontSize: 10 }}
              tickMargin={10}
              interval="preserveStartEnd"
            />

            {/* Y Axis with price notches */}
            <YAxis
              orientation="right"
              domain={[minPrice, maxPrice]}
              ticks={ticks}
              axisLine={{ stroke: "#3f3f46" }}
              tickLine={{ stroke: "#3f3f46" }}
              tick={(props) => <CustomYAxisTick {...props} currentPrice={currentPrice} />}
              width={60}
            />

            {/* Current price reference line */}
            <ReferenceLine
              y={currentPrice}
              stroke="#C9A646"
              strokeDasharray="5 5"
              strokeWidth={1}
            />

            {/* Previous close reference line */}
            {previousClose && (
              <ReferenceLine
                y={previousClose}
                stroke="#71717a"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Area chart */}
            <Area
              type="monotone"
              dataKey="price"
              stroke={gradientColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 5,
                fill: "#C9A646",
                stroke: "#18181b",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Current price badge floating on the right */}
      <div 
        className="absolute right-0 transform -translate-y-1/2 bg-[#C9A646] text-black 
                   px-2 py-1 text-xs font-bold rounded-l-md shadow-lg"
        style={{ 
          top: `calc(${((maxPrice - currentPrice) / (maxPrice - minPrice)) * 100}% + 60px)` 
        }}
      >
        ${formatPrice(currentPrice)}
      </div>
    </div>
  );
};

export default PriceChartWithScale;


// ═══════════════════════════════════════════════════════════════
// USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════
/*
import PriceChartWithScale from "@/components/markets/PriceChartWithScale";

// Sample data
const chartData = [
  { date: "Jan", price: 120.5 },
  { date: "Feb", price: 135.2 },
  { date: "Mar", price: 142.8 },
  // ... more data points
];

<PriceChartWithScale
  data={chartData}
  currentPrice={285.41}
  previousClose={292.63}
  high52w={300}
  low52w={100}
  symbol="MU"
  height={300}
/>
*/