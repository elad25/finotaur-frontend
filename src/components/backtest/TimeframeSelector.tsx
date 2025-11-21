// ==================== TIMEFRAME SELECTOR COMPONENT ====================
// Allow users to switch between different chart timeframes

import React from 'react';
import { Clock } from 'lucide-react';

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' | '3d' | '1w' | '1M';

export interface TimeframeOption {
  value: Timeframe;
  label: string;
  group: 'intraday' | 'daily' | 'weekly';
}

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  // Intraday
  { value: '1m', label: '1m', group: 'intraday' },
  { value: '3m', label: '3m', group: 'intraday' },
  { value: '5m', label: '5m', group: 'intraday' },
  { value: '15m', label: '15m', group: 'intraday' },
  { value: '30m', label: '30m', group: 'intraday' },
  { value: '1h', label: '1H', group: 'intraday' },
  { value: '2h', label: '2H', group: 'intraday' },
  { value: '4h', label: '4H', group: 'intraday' },
  { value: '6h', label: '6H', group: 'intraday' },
  { value: '12h', label: '12H', group: 'intraday' },
  
  // Daily+
  { value: '1d', label: '1D', group: 'daily' },
  { value: '3d', label: '3D', group: 'daily' },
  { value: '1w', label: '1W', group: 'weekly' },
  { value: '1M', label: '1M', group: 'weekly' },
];

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (timeframe: Timeframe) => void;
  disabled?: boolean;
  compact?: boolean;
  availableTimeframes?: Timeframe[];
}

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  selected,
  onChange,
  disabled = false,
  compact = false,
  availableTimeframes,
}) => {
  // Filter options if specific timeframes are provided
  const options = availableTimeframes
    ? TIMEFRAME_OPTIONS.filter(opt => availableTimeframes.includes(opt.value))
    : TIMEFRAME_OPTIONS;

  // Group options
  const groupedOptions = {
    intraday: options.filter(opt => opt.group === 'intraday'),
    daily: options.filter(opt => opt.group === 'daily'),
    weekly: options.filter(opt => opt.group === 'weekly'),
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 bg-[#1E222D] rounded-lg p-1">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              selected === option.value
                ? 'bg-[#C9A646] text-[#0A0A0A] shadow-sm'
                : 'text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#787B86] uppercase tracking-wide">
        <Clock size={14} />
        Timeframe
      </div>

      <div className="space-y-2">
        {/* Intraday Timeframes */}
        {groupedOptions.intraday.length > 0 && (
          <div>
            <div className="text-[10px] text-[#434651] uppercase tracking-wide mb-1.5 px-1">
              Intraday
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {groupedOptions.intraday.map(option => (
                <button
                  key={option.value}
                  onClick={() => onChange(option.value)}
                  disabled={disabled}
                  className={`px-2 py-2 rounded-lg text-xs font-bold transition-all ${
                    selected === option.value
                      ? 'bg-[#C9A646] text-[#0A0A0A] shadow-lg shadow-yellow-500/20'
                      : 'bg-[#1E222D] text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39]'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Daily Timeframes */}
        {groupedOptions.daily.length > 0 && (
          <div>
            <div className="text-[10px] text-[#434651] uppercase tracking-wide mb-1.5 px-1">
              Daily
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {groupedOptions.daily.map(option => (
                <button
                  key={option.value}
                  onClick={() => onChange(option.value)}
                  disabled={disabled}
                  className={`px-2 py-2 rounded-lg text-xs font-bold transition-all ${
                    selected === option.value
                      ? 'bg-[#C9A646] text-[#0A0A0A] shadow-lg shadow-yellow-500/20'
                      : 'bg-[#1E222D] text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39]'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Weekly+ Timeframes */}
        {groupedOptions.weekly.length > 0 && (
          <div>
            <div className="text-[10px] text-[#434651] uppercase tracking-wide mb-1.5 px-1">
              Weekly+
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {groupedOptions.weekly.map(option => (
                <button
                  key={option.value}
                  onClick={() => onChange(option.value)}
                  disabled={disabled}
                  className={`px-2 py-2 rounded-lg text-xs font-bold transition-all ${
                    selected === option.value
                      ? 'bg-[#C9A646] text-[#0A0A0A] shadow-lg shadow-yellow-500/20'
                      : 'bg-[#1E222D] text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39]'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Get recommended number of candles for a timeframe
 */
export const getRecommendedCandleCount = (timeframe: Timeframe): number => {
  const recommendations: Record<Timeframe, number> = {
    '1m': 500,
    '3m': 500,
    '5m': 500,
    '15m': 500,
    '30m': 500,
    '1h': 500,
    '2h': 500,
    '4h': 365,
    '6h': 365,
    '12h': 365,
    '1d': 365,
    '3d': 180,
    '1w': 104,
    '1M': 60,
  };

  return recommendations[timeframe] || 500;
};

/**
 * Get timeframe display name
 */
export const getTimeframeDisplayName = (timeframe: Timeframe): string => {
  const names: Record<Timeframe, string> = {
    '1m': '1 Minute',
    '3m': '3 Minutes',
    '5m': '5 Minutes',
    '15m': '15 Minutes',
    '30m': '30 Minutes',
    '1h': '1 Hour',
    '2h': '2 Hours',
    '4h': '4 Hours',
    '6h': '6 Hours',
    '12h': '12 Hours',
    '1d': '1 Day',
    '3d': '3 Days',
    '1w': '1 Week',
    '1M': '1 Month',
  };

  return names[timeframe] || timeframe;
};

/**
 * Get timeframe duration in milliseconds
 */
export const getTimeframeDuration = (timeframe: Timeframe): number => {
  const durations: Record<Timeframe, number> = {
    '1m': 60 * 1000,
    '3m': 3 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
  };

  return durations[timeframe] || durations['1d'];
};