// ui/TopToolbar.tsx - COMPLETE & FIXED VERSION
import React from 'react';
import {
  Search,
  TrendingUp,
  Settings,
  BarChart3,
  ChevronDown,
  Maximize,
  Camera,
  Plus,
  CandlestickChart,
  LineChart,
  BarChart2,
  Activity,
} from 'lucide-react';
import { Theme, TimeframeConfig, CandleStyle } from '../types';
import { TIMEFRAMES } from '../constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface TopToolbarProps {
  symbol: string;
  timeframe: TimeframeConfig;
  theme: Theme;
  chartType?: CandleStyle;
  showVolume?: boolean;
  isFullscreen?: boolean;
  onSymbolClick: () => void;
  onTimeframeChange: (tf: TimeframeConfig) => void;
  onChartTypeChange?: (type: CandleStyle) => void;
  onIndicatorsClick?: () => void;
  onCompareClick?: () => void;
  onSettingsClick?: () => void;
  onScreenshot?: () => void;
  onFullscreenToggle?: () => void;
  onVolumeToggle?: () => void;
  ohlc?: {
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
    time?: number;
    volume?: number;
  };
  className?: string;
}

const CHART_TYPES: Array<{
  value: CandleStyle;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'candles', label: 'Candles', icon: CandlestickChart },
  { value: 'hollow', label: 'Hollow Candles', icon: CandlestickChart },
  { value: 'bars', label: 'Bars', icon: BarChart2 },
  { value: 'line', label: 'Line', icon: LineChart },
  { value: 'area', label: 'Area', icon: Activity },
];

export const TopToolbar: React.FC<TopToolbarProps> = ({
  symbol,
  timeframe,
  theme,
  chartType = 'candles',
  showVolume = false,
  isFullscreen = false,
  onSymbolClick,
  onTimeframeChange,
  onChartTypeChange,
  onIndicatorsClick,
  onCompareClick,
  onSettingsClick,
  onScreenshot,
  onFullscreenToggle,
  onVolumeToggle,
  ohlc,
  className = '',
}) => {
  const isDark = theme === 'dark';
  const currentChartType = CHART_TYPES.find(t => t.value === chartType) || CHART_TYPES[0];

  const timeStr = ohlc?.time
    ? new Date(ohlc.time * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div
      className={cn(
        'h-14 border-b backdrop-blur-sm flex items-center px-4 gap-3 z-30',
        isDark
          ? 'bg-[#0A0A0A]/90 border-[#C9A646]/20'
          : 'bg-white/90 border-gray-200',
        className
      )}
    >
      {/* LEFT SIDE */}
      <div className="flex items-center gap-2">
        {/* Symbol */}
        <Button
          variant="ghost"
          onClick={onSymbolClick}
          className={cn(
            'h-9 gap-2 font-semibold hover:bg-transparent px-2',
            isDark
              ? 'text-[#C9A646] hover:text-[#FFD700]'
              : 'text-gray-900 hover:text-gray-700'
          )}
        >
          <TrendingUp className="h-4 w-4" />
          <span className="text-lg">{symbol}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>

        {/* ✅ Timeframe Dropdown - FIXED */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'h-9 px-3 font-medium gap-1',
                isDark
                  ? 'text-white hover:bg-[#C9A646]/10'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {timeframe.label}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={cn(
              'min-w-[140px]',
              isDark ? 'bg-black border-[#C9A646]/30' : 'bg-white border-gray-200'
            )}
          >
            {TIMEFRAMES.map(tf => (
              <DropdownMenuItem
                key={tf.value}
                onSelect={() => {
                  console.log(`🕐 Timeframe selected: ${tf.label}`);
                  onTimeframeChange(tf);
                }}
                className={cn(
                  'cursor-pointer',
                  isDark ? 'hover:bg-[#C9A646]/10' : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{tf.label}</span>
                  {timeframe.value === tf.value && (
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        isDark ? 'bg-[#C9A646]' : 'bg-blue-600'
                      )}
                    />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ✅ Chart Type Selector - FIXED */}
        {onChartTypeChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'h-9 px-3 gap-2',
                  isDark
                    ? 'text-white hover:bg-[#C9A646]/10'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <currentChartType.icon className="h-4 w-4" />
                <span className="text-sm">{currentChartType.label}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={cn(
                'min-w-[180px]',
                isDark ? 'bg-black border-[#C9A646]/30' : 'bg-white border-gray-200'
              )}
            >
              {CHART_TYPES.map(type => (
                <DropdownMenuItem
                  key={type.value}
                  onSelect={() => {
                    console.log(`📊 Chart type selected: ${type.label}`);
                    onChartTypeChange(type.value);
                  }}
                  className={cn(
                    'cursor-pointer',
                    isDark ? 'hover:bg-[#C9A646]/10' : 'hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </div>
                    {chartType === type.value && (
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          isDark ? 'bg-[#C9A646]' : 'bg-blue-600'
                        )}
                      />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Divider */}
      <div className={cn('h-6 w-px', isDark ? 'bg-[#C9A646]/20' : 'bg-gray-300')} />

      {/* CENTER - OHLC */}
      {ohlc && (
        <div className="flex items-center gap-4 text-xs font-mono">
          {timeStr && (
            <div className={cn('opacity-60', isDark ? 'text-[#C9A646]' : 'text-gray-500')}>
              {timeStr}
            </div>
          )}

          <div className="flex items-center gap-1">
            <span className={cn('opacity-60', isDark ? 'text-[#C9A646]' : 'text-gray-500')}>O</span>
            <span className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
              {ohlc.open.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className={cn('opacity-60', isDark ? 'text-[#C9A646]' : 'text-gray-500')}>H</span>
            <span className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
              {ohlc.high.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className={cn('opacity-60', isDark ? 'text-[#C9A646]' : 'text-gray-500')}>L</span>
            <span className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
              {ohlc.low.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className={cn('opacity-60', isDark ? 'text-[#C9A646]' : 'text-gray-500')}>C</span>
            <span className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
              {ohlc.close.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <span
              className={cn(
                'font-semibold',
                ohlc.change >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {ohlc.change >= 0 ? '+' : ''}
              {ohlc.change.toFixed(2)}
            </span>
            <span
              className={cn(
                'font-semibold',
                ohlc.change >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              ({ohlc.changePercent >= 0 ? '+' : ''}
              {ohlc.changePercent.toFixed(2)}%)
            </span>
          </div>

          {ohlc.volume && (
            <>
              <div className={cn('h-3 w-px ml-2', isDark ? 'bg-[#C9A646]/20' : 'bg-gray-300')} />
              <div className="flex items-center gap-1">
                <span className={cn('opacity-60', isDark ? 'text-[#C9A646]' : 'text-gray-500')}>
                  Vol
                </span>
                <span className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                  {ohlc.volume.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-1">
        {onIndicatorsClick && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onIndicatorsClick}
            className={cn(
              'h-8 px-3 gap-2',
              isDark ? 'hover:bg-[#C9A646]/10 text-[#C9A646]' : 'hover:bg-gray-100'
            )}
            title="Indicators"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">Indicators</span>
          </Button>
        )}

        {onCompareClick && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onCompareClick}
            className={cn(
              'h-8 w-8 p-0',
              isDark ? 'hover:bg-[#C9A646]/10 text-[#C9A646]' : 'hover:bg-gray-100'
            )}
            title="Compare Symbols"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        <div className={cn('h-6 w-px mx-1', isDark ? 'bg-[#C9A646]/20' : 'bg-gray-300')} />

        {onVolumeToggle && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onVolumeToggle}
            className={cn(
              'h-8 px-3',
              showVolume && (isDark ? 'bg-[#C9A646]/20' : 'bg-blue-100'),
              isDark ? 'hover:bg-[#C9A646]/10 text-[#C9A646]' : 'hover:bg-gray-100'
            )}
            title="Toggle Volume"
          >
            <span className="text-sm">Vol</span>
          </Button>
        )}

        {onScreenshot && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onScreenshot}
            className={cn(
              'h-8 w-8 p-0',
              isDark ? 'hover:bg-[#C9A646]/10 text-[#C9A646]' : 'hover:bg-gray-100'
            )}
            title="Take Screenshot"
          >
            <Camera className="h-4 w-4" />
          </Button>
        )}

        {onSettingsClick && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onSettingsClick}
            className={cn(
              'h-8 w-8 p-0',
              isDark ? 'hover:bg-[#C9A646]/10 text-[#C9A646]' : 'hover:bg-gray-100'
            )}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}

        {onFullscreenToggle && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onFullscreenToggle}
            className={cn(
              'h-8 w-8 p-0',
              isFullscreen && (isDark ? 'bg-[#C9A646]/20' : 'bg-blue-100'),
              isDark ? 'hover:bg-[#C9A646]/10 text-[#C9A646]' : 'hover:bg-gray-100'
            )}
            title="Fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};