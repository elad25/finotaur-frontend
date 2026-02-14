// =====================================================
// 📊 CHARTS - Visualization Components
// src/components/SectorAnalyzer/Charts.tsx
// =====================================================

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { colors } from './ui';
import { cn } from './utils';

// =====================================================
// 📈 MINI SPARKLINE
// =====================================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
}

export const Sparkline = memo<SparklineProps>(({
  data,
  width = 100,
  height = 30,
  color = colors.gold.primary,
  showArea = true,
}) => {
  const { path, areaPath, isPositive } = useMemo(() => {
    if (data.length < 2) return { path: '', areaPath: '', isPositive: true };
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    
    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return { x, y };
    });
    
    const linePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const area = `M ${padding},${height - padding} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${width - padding},${height - padding} Z`;
    
    return {
      path: linePath,
      areaPath: area,
      isPositive: data[data.length - 1] >= data[0],
    };
  }, [data, width, height]);

  return (
    <svg width={width} height={height} className="overflow-visible">
      {showArea && (
        <motion.path
          d={areaPath}
          fill={isPositive ? `${colors.positive}30` : `${colors.negative}30`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
      <motion.path
        d={path}
        fill="none"
        stroke={isPositive ? colors.positive : colors.negative}
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
    </svg>
  );
});

Sparkline.displayName = 'Sparkline';

// =====================================================
// 📊 BAR CHART
// =====================================================

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
}

export const BarChart = memo<BarChartProps>(({
  data,
  height = 150,
  showLabels = true,
  showValues = true,
}) => {
  const maxValue = Math.max(...data.map(d => Math.abs(d.value)));

  return (
    <div className="w-full">
      <div className="flex items-end justify-around gap-2" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = (Math.abs(item.value) / maxValue) * height;
          const isPositive = item.value >= 0;
          const barColor = item.color || (isPositive ? colors.positive : colors.negative);

          return (
            <div key={item.label} className="flex flex-col items-center flex-1">
              {showValues && (
                <span className="text-xs font-bold mb-1" style={{ color: barColor }}>
                  {item.value >= 0 ? '+' : ''}{item.value.toFixed(1)}%
                </span>
              )}
              <motion.div
                className="w-full rounded-t-lg"
                style={{ backgroundColor: barColor }}
                initial={{ height: 0 }}
                animate={{ height: barHeight }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex justify-around gap-2 mt-2">
          {data.map((item) => (
            <span key={item.label} className="text-[10px] text-[#6B6B6B] text-center flex-1">
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

BarChart.displayName = 'BarChart';

// =====================================================
// 🍩 DONUT CHART
// =====================================================

interface DonutChartData {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

export const DonutChart = memo<DonutChartProps>(({
  data,
  size = 120,
  strokeWidth = 12,
  centerLabel,
  centerValue,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((item, index) => {
          const percentage = item.value / total;
          const dashLength = percentage * circumference;
          const offset = currentOffset;
          currentOffset += dashLength;

          return (
            <motion.circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${dashLength} ${circumference}`}
              strokeDashoffset={-offset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            />
          );
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <span className="text-xl font-bold text-white">{centerValue}</span>}
          {centerLabel && <span className="text-[10px] text-[#6B6B6B]">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
});

DonutChart.displayName = 'DonutChart';

// =====================================================
// 📊 HORIZONTAL BAR
// =====================================================

interface HorizontalBarProps {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
  showValue?: boolean;
  suffix?: string;
}

export const HorizontalBar = memo<HorizontalBarProps>(({
  label,
  value,
  maxValue = 100,
  color = colors.gold.primary,
  showValue = true,
  suffix = '%',
}) => {
  const percentage = Math.min(100, (value / maxValue) * 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-[#8B8B8B]">{label}</span>
        {showValue && (
          <span className="text-sm font-bold" style={{ color }}>
            {value.toFixed(1)}{suffix}
          </span>
        )}
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
});

HorizontalBar.displayName = 'HorizontalBar';

// =====================================================
// 📊 COMPARISON BAR
// =====================================================

interface ComparisonBarProps {
  label: string;
  value1: number;
  value2: number;
  label1?: string;
  label2?: string;
  color1?: string;
  color2?: string;
}

export const ComparisonBar = memo<ComparisonBarProps>(({
  label,
  value1,
  value2,
  label1 = 'Company',
  label2 = 'Sector',
  color1 = colors.gold.primary,
  color2 = colors.neutral,
}) => {
  const maxValue = Math.max(value1, value2);
  const percentage1 = (value1 / maxValue) * 100;
  const percentage2 = (value2 / maxValue) * 100;

  return (
    <div className="w-full p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="text-sm text-white mb-2">{label}</div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#6B6B6B] w-16">{label1}</span>
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color1 }}
              initial={{ width: 0 }}
              animate={{ width: `${percentage1}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-xs font-bold min-w-[40px] text-right" style={{ color: color1 }}>
            {value1.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#6B6B6B] w-16">{label2}</span>
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color2 }}
              initial={{ width: 0 }}
              animate={{ width: `${percentage2}%` }}
              transition={{ duration: 0.5, delay: 0.1 }}
            />
          </div>
          <span className="text-xs font-bold min-w-[40px] text-right" style={{ color: color2 }}>
            {value2.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
});

ComparisonBar.displayName = 'ComparisonBar';

// =====================================================
// 📊 GAUGE CHART
// =====================================================

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  size?: number;
  label?: string;
  thresholds?: { value: number; color: string }[];
}

export const GaugeChart = memo<GaugeChartProps>(({
  value,
  min = 0,
  max = 100,
  size = 120,
  label,
  thresholds = [
    { value: 30, color: colors.negative },
    { value: 60, color: colors.warning },
    { value: 100, color: colors.positive },
  ],
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const angle = (percentage / 100) * 180;
  const radius = (size - 20) / 2;

  const getColor = () => {
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (value >= thresholds[i].value * (max / 100)) {
        return thresholds[i].color;
      }
    }
    return thresholds[0]?.color || colors.neutral;
  };

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} className="overflow-visible">
        {/* Background Arc */}
        <path
          d={`M ${10} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Value Arc */}
        <motion.path
          d={`M ${10} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none"
          stroke={getColor()}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${(Math.PI * radius * percentage) / 100} ${Math.PI * radius}`}
          initial={{ strokeDasharray: `0 ${Math.PI * radius}` }}
          animate={{ strokeDasharray: `${(Math.PI * radius * percentage) / 100} ${Math.PI * radius}` }}
          transition={{ duration: 1 }}
        />
        {/* Needle */}
        <motion.line
          x1={size / 2}
          y1={size / 2}
          x2={size / 2}
          y2={20}
          stroke={getColor()}
          strokeWidth={2}
          strokeLinecap="round"
          style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
          initial={{ rotate: -90 }}
          animate={{ rotate: angle - 90 }}
          transition={{ duration: 1, type: 'spring' }}
        />
        {/* Center Circle */}
        <circle cx={size / 2} cy={size / 2} r={6} fill={getColor()} />
      </svg>
      <div className="absolute bottom-0 text-center">
        <span className="text-xl font-bold text-white">{value.toFixed(0)}</span>
        {label && <span className="text-[10px] text-[#6B6B6B] block">{label}</span>}
      </div>
    </div>
  );
});

GaugeChart.displayName = 'GaugeChart';

// =====================================================
// 📊 MINI CANDLE CHART
// =====================================================

interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
}

interface MiniCandleChartProps {
  data: CandleData[];
  width?: number;
  height?: number;
}

export const MiniCandleChart = memo<MiniCandleChartProps>(({
  data,
  width = 200,
  height = 80,
}) => {
  const { candles, minPrice, maxPrice } = useMemo(() => {
    const allPrices = data.flatMap(d => [d.high, d.low]);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    return { candles: data, minPrice: min, maxPrice: max };
  }, [data]);

  const priceRange = maxPrice - minPrice || 1;
  const candleWidth = (width / data.length) * 0.6;
  const gap = (width / data.length) * 0.4;

  const scaleY = (price: number) => height - ((price - minPrice) / priceRange) * height;

  return (
    <svg width={width} height={height}>
      {candles.map((candle, i) => {
        const x = i * (candleWidth + gap) + gap / 2;
        const isGreen = candle.close >= candle.open;
        const color = isGreen ? colors.positive : colors.negative;
        const bodyTop = scaleY(Math.max(candle.open, candle.close));
        const bodyBottom = scaleY(Math.min(candle.open, candle.close));
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);

        return (
          <g key={i}>
            {/* Wick */}
            <line
              x1={x + candleWidth / 2}
              y1={scaleY(candle.high)}
              x2={x + candleWidth / 2}
              y2={scaleY(candle.low)}
              stroke={color}
              strokeWidth={1}
            />
            {/* Body */}
            <motion.rect
              x={x}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={color}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
            />
          </g>
        );
      })}
    </svg>
  );
});

MiniCandleChart.displayName = 'MiniCandleChart';

// =====================================================
// 📊 SECTOR PERFORMANCE CHART
// =====================================================

interface SectorPerformanceData {
  sector: string;
  value: number;
}

interface SectorPerformanceChartProps {
  data: SectorPerformanceData[];
  title?: string;
}

export const SectorPerformanceChart = memo<SectorPerformanceChartProps>(({
  data,
  title = 'Sector Performance',
}) => {
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const maxAbs = Math.max(...data.map(d => Math.abs(d.value)));

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-bold text-white mb-4">{title}</h4>}
      <div className="space-y-2">
        {sortedData.map((item, i) => {
          const isPositive = item.value >= 0;
          const width = (Math.abs(item.value) / maxAbs) * 50;

          return (
            <motion.div
              key={item.sector}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs text-[#8B8B8B] w-20 truncate">{item.sector}</span>
              <div className="flex-1 h-4 relative flex items-center">
                <div className="absolute left-1/2 w-px h-full bg-[#6B6B6B]" />
                <motion.div
                  className={cn(
                    'absolute h-3 rounded',
                    isPositive ? 'left-1/2' : 'right-1/2'
                  )}
                  style={{
                    backgroundColor: isPositive ? colors.positive : colors.negative,
                    width: `${width}%`,
                    [isPositive ? 'marginLeft' : 'marginRight']: '2px',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                />
              </div>
              <span
                className="text-xs font-bold w-12 text-right"
                style={{ color: isPositive ? colors.positive : colors.negative }}
              >
                {item.value >= 0 ? '+' : ''}{item.value.toFixed(1)}%
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

SectorPerformanceChart.displayName = 'SectorPerformanceChart';

// =====================================================
// 📊 CORRELATION MATRIX
// =====================================================

interface CorrelationMatrixProps {
  tickers: string[];
  values: number[][];
}

export const CorrelationMatrix = memo<CorrelationMatrixProps>(({
  tickers,
  values,
}) => {
  const getCorrelationColor = (val: number): string => {
    if (val >= 0.7) return colors.positive;
    if (val >= 0.3) return colors.warning;
    if (val >= -0.3) return colors.neutral;
    return colors.negative;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="p-2" />
            {tickers.map(ticker => (
              <th key={ticker} className="p-2 text-[10px] text-[#6B6B6B]">{ticker}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickers.map((ticker, i) => (
            <tr key={ticker}>
              <td className="p-2 text-[10px] text-[#6B6B6B] font-bold">{ticker}</td>
              {tickers.map((_, j) => {
                const val = values[i]?.[j] ?? 0;
                return (
                  <td key={j} className="p-1">
                    <motion.div
                      className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold"
                      style={{
                        backgroundColor: `${getCorrelationColor(val)}20`,
                        color: getCorrelationColor(val),
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: (i + j) * 0.02 }}
                    >
                      {val.toFixed(2)}
                    </motion.div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

CorrelationMatrix.displayName = 'CorrelationMatrix';

// =====================================================
// EXPORTS
// =====================================================

export default {
  Sparkline,
  BarChart,
  DonutChart,
  HorizontalBar,
  ComparisonBar,
  GaugeChart,
  MiniCandleChart,
  SectorPerformanceChart,
  CorrelationMatrix,
};