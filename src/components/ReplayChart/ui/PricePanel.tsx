// ui/PricePanel.tsx
import React from 'react';
import { Theme } from '../types';
import { cn } from '@/lib/utils';
import { formatPrice, formatPercentage } from '../utils/formatting';

// ✅ Export interface
export interface PricePanelProps {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: number;
  theme: Theme;
  className?: string;
}

export const PricePanel: React.FC<PricePanelProps> = ({
  symbol,
  open,
  high,
  low,
  close,
  volume,
  time,
  theme,
  className = '',
}) => {
  const isDark = theme === 'dark';

  const change = close - open;
  const changePercent = (change / open) * 100;
  const isPositive = change >= 0;

  const timeStr = time
    ? new Date(time * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div
      className={cn(
        'absolute top-4 left-4 z-20 backdrop-blur-md rounded-lg border p-4 min-w-[280px]',
        isDark
          ? 'bg-black/80 border-[#C9A646]/30'
          : 'bg-white/80 border-gray-200',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className={cn(
            'font-semibold text-lg',
            isDark ? 'text-[#C9A646]' : 'text-gray-900'
          )}
        >
          {symbol}
        </h3>
        {timeStr && (
          <span
            className={cn(
              'text-xs',
              isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
            )}
          >
            {timeStr}
          </span>
        )}
      </div>

      <div className="mb-4">
        <div
          className={cn(
            'text-3xl font-bold tabular-nums',
            isDark ? 'text-white' : 'text-gray-900'
          )}
        >
          {formatPrice(close, 2, '$')}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              'text-sm font-medium',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            {isPositive ? '+' : ''}
            {change.toFixed(2)}
          </span>
          <span
            className={cn(
              'text-sm font-medium',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            ({formatPercentage(changePercent, 2)})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div
            className={cn(
              'text-xs mb-1',
              isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
            )}
          >
            Open
          </div>
          <div
            className={cn(
              'font-mono font-medium',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            {open.toFixed(2)}
          </div>
        </div>

        <div>
          <div
            className={cn(
              'text-xs mb-1',
              isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
            )}
          >
            High
          </div>
          <div
            className={cn(
              'font-mono font-medium',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            {high.toFixed(2)}
          </div>
        </div>

        <div>
          <div
            className={cn(
              'text-xs mb-1',
              isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
            )}
          >
            Low
          </div>
          <div
            className={cn(
              'font-mono font-medium',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            {low.toFixed(2)}
          </div>
        </div>

        <div>
          <div
            className={cn(
              'text-xs mb-1',
              isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
            )}
          >
            Close
          </div>
          <div
            className={cn(
              'font-mono font-medium',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            {close.toFixed(2)}
          </div>
        </div>
      </div>

      {volume !== undefined && (
        <div className="mt-3 pt-3 border-t border-current/10">
          <div
            className={cn(
              'text-xs mb-1',
              isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
            )}
          >
            Volume
          </div>
          <div
            className={cn(
              'font-mono font-medium',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            {volume.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};